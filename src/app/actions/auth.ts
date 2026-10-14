"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { profiles, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/dal";
import { emailEnabled } from "@/lib/email";
import { clientIp, withinLimit } from "@/lib/rate-limit";
import { createSession, deleteSession, getSessionUserId } from "@/lib/session";
import { confirmEmail, LINK_LIFETIME_SECONDS, RESEND_COOLDOWN_SECONDS, sendVerificationEmail, verificationRequired } from "@/lib/verification";

export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(40, "Use até 40 caracteres no nome."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

// Limites de cadastro com envio de e-mail: por IP e por dia no total (abaixo da cota do Resend).
const SIGNUPS_PER_IP_PER_HOUR = 5;
const EMAILS_PER_DAY = Number(process.env.RESEND_DAILY_LIMIT) || 90;

export async function signup(_: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, fields: { name: raw.name ?? "", email: raw.email ?? "" } };
  }
  const { name, email, password } = parsed.data;
  const confirm = emailEnabled();

  if (confirm) {
    if (!(await withinLimit(`signup:ip:${await clientIp()}`, SIGNUPS_PER_IP_PER_HOUR, 60 * 60))) {
      return { error: "Muitos cadastros deste endereço. Tente de novo mais tarde.", fields: { name, email } };
    }
    if (!(await withinLimit("email:daily", EMAILS_PER_DAY, 24 * 60 * 60))) {
      return { error: "Não conseguimos criar contas agora. Tente de novo amanhã.", fields: { name, email } };
    }
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, emailVerificationPending: true, emailVerifiedAt: true, createdAt: true },
  });
  if (existing) {
    // Um cadastro nunca confirmado, com o link já vencido, não prende o e-mail: dá lugar ao novo.
    const expired = Date.now() - existing.createdAt.getTime() > LINK_LIFETIME_SECONDS * 1000;
    if (!(verificationRequired(existing) && expired)) return { error: "Já existe uma conta com este e-mail.", fields: { name, email } };
    await db.delete(users).where(eq(users.id, existing.id));
  }

  const userId = crypto.randomUUID();
  // Com o envio de e-mails configurado, a conta só é liberada depois de confirmar o e-mail.
  await db.insert(users).values({ id: userId, name, email, passwordHash: await bcrypt.hash(password, 10), emailVerificationPending: confirm });
  await db.insert(profiles).values({ id: crypto.randomUUID(), userId, name: name.split(" ")[0], avatar: "ember", maxRating: 16 });

  await createSession(userId);
  if (!confirm) redirect("/profiles");
  await sendVerificationEmail({ id: userId, email });
  redirect("/confirm-email");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(1, "Informe sua senha."),
});

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: { email: raw.email ?? "" } };

  const user = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { error: "E-mail ou senha incorretos.", fields: { email: parsed.data.email } };
  }

  await createSession(user.id);
  if (!verificationRequired(user)) redirect("/profiles");
  // O último link já venceu (ou nunca saiu): manda um novo ao entrar.
  const lastSent = user.verificationSentAt?.getTime() ?? 0;
  if (Date.now() - lastSent > LINK_LIFETIME_SECONDS * 1000) await sendVerificationEmail(user);
  redirect("/confirm-email");
}

export type ResendState = { error?: string; sent?: boolean } | undefined;

/** Reenvia o link de confirmação (no máximo um envio por minuto). */
export async function resendVerification(): Promise<ResendState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!verificationRequired(user)) redirect("/profiles");
  const result = await sendVerificationEmail(user);
  if (result === "sent") return { sent: true };
  if (result === "cooldown") {
    const elapsed = user.verificationSentAt ? (Date.now() - user.verificationSentAt.getTime()) / 1000 : 0;
    return { error: `Aguarde ${Math.max(1, Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed))} segundos para reenviar.` };
  }
  return { error: "Não foi possível enviar o e-mail agora. Tente de novo em instantes." };
}

/** Botão "Confirmar e-mail" da página do link (a confirmação só acontece com o clique, não ao abrir o link). */
export async function confirmEmailAction(token: string) {
  const userId = await confirmEmail(token);
  const loggedIn = await getSessionUserId();
  if (!userId) redirect(loggedIn ? "/confirm-email?error=link" : "/login?error=link");
  redirect(loggedIn === userId ? "/profiles" : "/login?verified=1");
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
