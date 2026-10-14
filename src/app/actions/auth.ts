"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { profiles, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/dal";
import { emailEnabled } from "@/lib/email";
import { createSession, deleteSession } from "@/lib/session";
import { RESEND_COOLDOWN_SECONDS, sendVerificationEmail, verificationRequired } from "@/lib/verification";

export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export async function signup(_: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, fields: { name: raw.name ?? "", email: raw.email ?? "" } };
  }
  const { name, email, password } = parsed.data;

  const existing = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } });
  if (existing) return { error: "Já existe uma conta com este e-mail.", fields: { name, email } };

  const userId = crypto.randomUUID();
  // Com o envio de e-mails configurado, a conta só é liberada depois de confirmar o e-mail.
  const confirm = emailEnabled();
  await db.insert(users).values({
    id: userId,
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    emailVerifiedAt: confirm ? null : new Date(),
  });
  await db.insert(profiles).values({ id: crypto.randomUUID(), userId, name: name.split(" ")[0], avatar: "ember", maxRating: 16 });

  await createSession(userId);
  if (!confirm) redirect("/profiles");
  await sendVerificationEmail({ id: userId, name, email });
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
  redirect(verificationRequired(user) ? "/confirm-email" : "/profiles");
}

export type ResendState = { error?: string; sent?: boolean } | undefined;

/** Reenvia o link de confirmação (no máximo um envio por minuto). */
export async function resendVerification(): Promise<ResendState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!verificationRequired(user)) redirect("/profiles");
  const elapsed = user.verificationSentAt ? (Date.now() - user.verificationSentAt.getTime()) / 1000 : Infinity;
  if (elapsed < RESEND_COOLDOWN_SECONDS) {
    return { error: `Aguarde ${Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed)} segundos para reenviar.` };
  }
  const sent = await sendVerificationEmail(user);
  return sent ? { sent: true } : { error: "Não foi possível enviar o e-mail agora. Tente de novo em instantes." };
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
