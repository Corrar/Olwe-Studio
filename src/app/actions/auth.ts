"use server";

import bcrypt from "bcryptjs";
import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { profiles, users } from "@/db/schema";
import { billingEnabled } from "@/lib/billing";
import { getCurrentUser } from "@/lib/dal";
import { emailEnabled } from "@/lib/email";
import { clientIp, withinLimit } from "@/lib/rate-limit";
import { createSession, deleteSession, getSessionUserId, setAfterProfile } from "@/lib/session";
import {
  confirmEmail,
  EMAILS_PER_DAY,
  LINK_LIFETIME_SECONDS,
  passwordResetAccount,
  passwordResetAvailable,
  RESEND_COOLDOWN_SECONDS,
  resendWaitSeconds,
  sendPasswordResetEmail,
  sendVerificationEmail,
  verificationRequired,
} from "@/lib/verification";

/**
 * Resultado dos formulários de conta. `field` diz em qual campo mostrar o erro (sem ele, o erro é do
 * formulário todo) e `notice` é uma mensagem de sucesso que mantém o formulário na tela.
 */
export type FormState = { error?: string; field?: string; notice?: string; fields?: Record<string, string> } | undefined;

/** Primeiro erro da validação, já apontando o campo. */
function invalid(error: z.ZodError, fields: Record<string, string>): FormState {
  const issue = error.issues[0];
  return { error: issue.message, field: String(issue.path[0] ?? ""), fields };
}

const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(40, "Use até 40 caracteres no nome."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

// Limites de cadastro com envio de e-mail: por IP e por dia no total (EMAILS_PER_DAY, abaixo da cota do provedor de e-mail).
const SIGNUPS_PER_IP_PER_HOUR = 5;

export async function signup(_: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error, { name: raw.name ?? "", email: raw.email ?? "" });
  const { name, email, password } = parsed.data;
  const confirm = emailEnabled();

  if (confirm && !(await withinLimit(`signup:ip:${await clientIp()}`, SIGNUPS_PER_IP_PER_HOUR, 60 * 60))) {
    return { error: "Muitos cadastros deste endereço. Tente de novo mais tarde.", fields: { name, email } };
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } });
  if (existing) {
    // Um cadastro nunca confirmado, criado e com o último link enviado há mais de 24 horas, não prende o
    // e-mail: dá lugar ao novo. A conferência e a exclusão são uma só operação no banco.
    const cutoff = new Date(Date.now() - LINK_LIFETIME_SECONDS * 1000);
    const removed = confirm
      ? await db
          .delete(users)
          .where(
            and(
              eq(users.id, existing.id),
              eq(users.emailVerificationPending, true),
              isNull(users.emailVerifiedAt),
              lte(users.createdAt, cutoff),
              or(isNull(users.verificationSentAt), lte(users.verificationSentAt, cutoff)),
            ),
          )
          .returning({ id: users.id })
      : [];
    if (removed.length === 0) return { error: "Já existe uma conta com este e-mail.", field: "email", fields: { name, email } };
  }

  // A cota diária de e-mails só conta cadastros que vão de fato mandar um e-mail.
  if (confirm && !(await withinLimit("email:daily", EMAILS_PER_DAY, 24 * 60 * 60))) {
    return { error: "Não conseguimos criar contas agora. Tente de novo amanhã.", fields: { name, email } };
  }

  const userId = crypto.randomUUID();
  // Com o envio de e-mails configurado, a conta só é liberada depois de confirmar o e-mail.
  await db.insert(users).values({ id: userId, name, email, passwordHash: await bcrypt.hash(password, 10), emailVerificationPending: confirm });
  await db.insert(profiles).values({ id: crypto.randomUUID(), userId, name: name.split(" ")[0], avatar: "ember", maxRating: 16 });

  await createSession(userId, 0);
  // Escolheu o Premium nos cards do cadastro: depois do perfil, vai direto para a assinatura.
  if (formData.get("plan") === "premium" && billingEnabled()) await setAfterProfile("/plans");
  if (!confirm) redirect("/profiles");
  await sendVerificationEmail({ id: userId, email }, { dailyCounted: true });
  redirect("/confirm-email");
}

// Reenvios do link de confirmação: por conta e por endereço, além da espera de um minuto entre envios.
const RESENDS_PER_ACCOUNT_PER_DAY = 5;
const RESENDS_PER_IP_PER_HOUR = 20;

async function resendAllowed(userId: string) {
  return (
    (await withinLimit(`resend:user:${userId}`, RESENDS_PER_ACCOUNT_PER_DAY, 24 * 60 * 60)) &&
    (await withinLimit(`resend:ip:${await clientIp()}`, RESENDS_PER_IP_PER_HOUR, 60 * 60))
  );
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(1, "Informe sua senha."),
});

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error, { email: raw.email ?? "" });

  // Tentativas de senha limitadas por endereço e por conta (a mesma resposta genérica nos dois casos).
  const tooMany =
    !(await withinLimit(`login:ip:${await clientIp()}`, 30, 15 * 60)) ||
    !(await withinLimit(`login:account:${parsed.data.email}`, 10, 15 * 60));
  if (tooMany) return { error: "Muitas tentativas. Espere alguns minutos e tente de novo.", fields: { email: parsed.data.email } };

  const user = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { error: "E-mail ou senha incorretos.", fields: { email: parsed.data.email } };
  }

  await createSession(user.id, user.sessionVersion);
  if (!emailEnabled() && user.emailVerificationPending) {
    // Envio de e-mails desligado: a conta fica liberada de vez (ver requireUser).
    await db.update(users).set({ emailVerificationPending: false }).where(eq(users.id, user.id));
  }
  if (!verificationRequired(user)) redirect("/profiles");
  // O último link já venceu (ou nunca saiu): manda um novo ao entrar.
  const lastSent = user.verificationSentAt?.getTime() ?? 0;
  if (Date.now() - lastSent > LINK_LIFETIME_SECONDS * 1000 && (await resendAllowed(user.id))) await sendVerificationEmail(user);
  redirect("/confirm-email");
}

/** `wait`: segundos até poder reenviar (a contagem regressiva da tela). */
export type ResendState = { error?: string; sent?: boolean; wait?: number } | undefined;

/** Reenvia o link de confirmação (no máximo um envio por minuto). */
export async function resendVerification(): Promise<ResendState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!verificationRequired(user)) redirect("/profiles");
  const wait = resendWaitSeconds(user.verificationSentAt);
  if (wait > 0) return { error: `Aguarde ${wait} segundos para reenviar.`, wait };
  if (!(await resendAllowed(user.id))) {
    return { error: "Você já pediu vários e-mails. Confira a caixa de spam ou tente de novo amanhã.", wait: 0 };
  }
  const result = await sendVerificationEmail(user);
  if (result === "sent") return { sent: true, wait: RESEND_COOLDOWN_SECONDS };
  if (result === "cooldown") {
    // Outro envio (outra aba) acabou de sair.
    return { error: `Aguarde ${RESEND_COOLDOWN_SECONDS} segundos para reenviar.`, wait: RESEND_COOLDOWN_SECONDS };
  }
  if (result === "limit") return { error: "Não conseguimos enviar e-mails agora. Tente de novo amanhã.", wait: 0 };
  return { error: "Não foi possível enviar o e-mail agora. Tente de novo em instantes.", wait: 0 };
}

/** Botão "Confirmar e-mail" da página do link (a confirmação só acontece com o clique, não ao abrir o link). */
export async function confirmEmailAction(token: string) {
  const userId = await confirmEmail(token);
  const loggedIn = await getSessionUserId();
  if (!userId) redirect(loggedIn ? "/confirm-email?error=link" : "/login?error=link");
  redirect(loggedIn === userId ? "/profiles" : "/login?verified=1");
}

const emailSchema = z.object({ email: z.string().trim().toLowerCase().email("E-mail inválido.") });
const RESETS_PER_IP_PER_HOUR = 5;

/**
 * "Esqueceu a senha?": a resposta é sempre a mesma, com ou sem conta para o e-mail. A busca da conta e
 * o envio rodam depois da resposta (after), então nem o tempo de resposta revela se a conta existe.
 */
export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  if (!passwordResetAvailable()) return { error: "A recuperação de senha não está disponível nesta instalação do Olwe." };
  const raw = String(formData.get("email") ?? "");
  const parsed = emailSchema.safeParse({ email: raw });
  if (!parsed.success) return invalid(parsed.error, { email: raw });
  const { email } = parsed.data;
  if (!(await withinLimit(`reset:ip:${await clientIp()}`, RESETS_PER_IP_PER_HOUR, 60 * 60))) {
    return { error: "Muitos pedidos deste endereço. Tente de novo mais tarde.", fields: { email } };
  }
  after(() => sendPasswordResetEmail(email).catch((err) => console.error("[senha] falha ao enviar o link", err)));
  return { notice: "Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha.", fields: { email } };
}

const newPasswordSchema = z
  .object({
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "As senhas não são iguais.", path: ["confirmPassword"] });

const RESET_LINK_INVALID = "Este link expirou ou já foi usado. Peça um novo para trocar a senha.";

/** Nova senha pelo link do e-mail. O token é conferido de novo aqui (validade, e-mail e senha atual). */
export async function resetPassword(token: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await passwordResetAccount(token);
  if (!user) return { error: RESET_LINK_INVALID };
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, {});

  // Quem recebeu o link no e-mail da conta provou que o endereço é dele: uma confirmação pendente vale.
  const confirm = user.emailVerificationPending && !user.emailVerifiedAt ? { emailVerificationPending: false, emailVerifiedAt: new Date() } : {};
  // Só troca se a senha ainda for a do link: o mesmo link não troca a senha duas vezes.
  const updated = await db
    .update(users)
    // Nova versão da sessão: quem estava logado em outros aparelhos precisa entrar de novo.
    .set({ passwordHash: await bcrypt.hash(parsed.data.password, 10), sessionVersion: sql`${users.sessionVersion} + 1`, ...confirm })
    .where(and(eq(users.id, user.id), eq(users.email, user.email), eq(users.passwordHash, user.passwordHash)))
    .returning({ id: users.id });
  if (updated.length === 0) return { error: RESET_LINK_INVALID };

  await deleteSession();
  redirect("/login?reset=1");
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
