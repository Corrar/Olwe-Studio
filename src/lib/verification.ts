import "server-only";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { emailEnabled, linkEmail, sendEmail } from "./email";
import { withinLimit } from "./rate-limit";
import { readToken, signToken } from "./session";

const PURPOSE = "verify-email";
export const RESEND_COOLDOWN_SECONDS = 60;
/** Validade do link de confirmação. */
export const LINK_LIFETIME_SECONDS = 24 * 60 * 60;
/** Cota diária de e-mails (cadastros e trocas de senha), abaixo da cota do Resend. */
export const EMAILS_PER_DAY = Number(process.env.RESEND_DAILY_LIMIT) || 90;

/**
 * A confirmação só é exigida para contas criadas com ela (cadastro com o envio de e-mails configurado)
 * e enquanto o envio continuar configurado.
 */
export function verificationRequired(user: { emailVerificationPending: boolean; emailVerifiedAt: Date | null }) {
  return emailEnabled() && user.emailVerificationPending && !user.emailVerifiedAt;
}

/** Segundos que faltam para poder reenviar o link de confirmação (0 = já pode). */
export function resendWaitSeconds(sentAt: Date | null) {
  if (!sentAt) return 0;
  return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - (Date.now() - sentAt.getTime()) / 1000));
}

/**
 * Endereço público do site para o link do e-mail: APP_URL, o domínio de produção da Vercel ou,
 * em desenvolvimento e prévias, o endereço da própria requisição.
 */
export async function siteUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const verificationMessage = (link: string) =>
  linkEmail({
    heading: "Confirme seu e-mail",
    body: "Falta só um passo para começar a assistir no Olwe. Toque no botão abaixo para confirmar que este e-mail é seu.",
    button: "Confirmar e-mail",
    link,
    validity: "O link vale por 24 horas.",
    textLead: "Abra este link para confirmar sua conta no Olwe (vale por 24 horas)",
    ignore: "Se você não criou uma conta no Olwe, ignore este e-mail.",
  });

/**
 * Envia o link de confirmação, no máximo um por minuto por conta. A vaga do envio é reservada no banco
 * antes de chamar o Resend, então cliques simultâneos não mandam vários e-mails; todo envio conta na
 * cota diária (menos o do cadastro, que já foi contado). Se não sair, a vaga é devolvida.
 */
export async function sendVerificationEmail(
  user: { id: string; email: string },
  { dailyCounted = false }: { dailyCounted?: boolean } = {},
): Promise<"sent" | "cooldown" | "limit" | "failed"> {
  const now = new Date();
  const claimed = await db
    .update(users)
    .set({ verificationSentAt: now })
    .where(
      and(
        eq(users.id, user.id),
        or(isNull(users.verificationSentAt), lte(users.verificationSentAt, new Date(now.getTime() - RESEND_COOLDOWN_SECONDS * 1000))),
      ),
    )
    .returning({ id: users.id });
  if (claimed.length === 0) return "cooldown";
  const release = () =>
    db.update(users).set({ verificationSentAt: null }).where(and(eq(users.id, user.id), eq(users.verificationSentAt, now)));

  if (!dailyCounted && !(await withinLimit("email:daily", EMAILS_PER_DAY, 24 * 60 * 60))) {
    await release();
    return "limit";
  }
  const token = await signToken(PURPOSE, { sub: user.id, email: user.email }, `${LINK_LIFETIME_SECONDS}s`);
  const link = `${await siteUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  if (await sendEmail({ to: user.email, subject: "Confirme seu e-mail no Olwe", ...verificationMessage(link) })) return "sent";
  await release();
  return "failed";
}

/** Confirma o e-mail pelo token do link. Devolve o id da conta confirmada, ou null se o link não vale. */
export async function confirmEmail(token: string): Promise<string | null> {
  const payload = await readToken(PURPOSE, token);
  if (!payload || typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub), columns: { id: true, email: true, emailVerifiedAt: true } });
  // O link só vale para o e-mail para o qual foi enviado.
  if (!user || user.email !== payload.email) return null;
  if (!user.emailVerifiedAt) {
    await db.update(users).set({ emailVerifiedAt: new Date(), emailVerificationPending: false }).where(eq(users.id, user.id));
  }
  return user.id;
}

// Troca de senha pelo e-mail ("Esqueceu a senha?").

const RESET_PURPOSE = "reset-password";

/**
 * O link de troca de senha dá acesso à conta, então o endereço dele não pode vir de um cabeçalho Host
 * forjado: vale APP_URL, a Vercel (o host vem do próprio proxy dela) ou o ambiente de desenvolvimento.
 */
export function passwordResetAvailable() {
  return emailEnabled() && (!!process.env.APP_URL || !!process.env.VERCEL || process.env.NODE_ENV !== "production");
}

/** Impressão da senha atual que vai no link: trocar a senha invalida os links já enviados. */
async function passwordFingerprint(passwordHash: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(passwordHash));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

const resetMessage = (link: string) =>
  linkEmail({
    heading: "Crie uma nova senha",
    body: "Recebemos um pedido para trocar a senha da sua conta no Olwe. Toque no botão abaixo para criar uma nova senha.",
    button: "Criar nova senha",
    link,
    validity: "O link vale por 1 hora e deixa de funcionar assim que a senha for trocada.",
    textLead: "Abra este link para criar uma nova senha no Olwe (vale por 1 hora)",
    ignore: "Se você não pediu para trocar a senha, ignore este e-mail: a senha atual continua valendo.",
  });

/**
 * Manda o link de troca de senha, se existir conta com o e-mail: no máximo um por conta por minuto e
 * dentro da cota diária. Quem pede nunca fica sabendo se a conta existe.
 */
export async function sendPasswordResetEmail(email: string) {
  if (!passwordResetAvailable()) return;
  const user = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true, email: true, passwordHash: true } });
  if (!user) return;
  if (!(await withinLimit(`reset:account:${user.id}`, 1, RESEND_COOLDOWN_SECONDS))) return;
  if (!(await withinLimit("email:daily", EMAILS_PER_DAY, 24 * 60 * 60))) return;
  const claims = { sub: user.id, email: user.email, ph: await passwordFingerprint(user.passwordHash) };
  const token = await signToken(RESET_PURPOSE, claims, "1h");
  const link = `${await siteUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({ to: user.email, subject: "Crie uma nova senha no Olwe", ...resetMessage(link) });
}

/**
 * Conta do link de troca de senha, se ele ainda vale: não venceu, a conta tem o mesmo e-mail para o
 * qual o link foi enviado e a senha não mudou desde o envio.
 */
export async function passwordResetAccount(token: string) {
  const payload = await readToken(RESET_PURPOSE, token);
  if (!payload || typeof payload.sub !== "string" || typeof payload.email !== "string" || typeof payload.ph !== "string") return null;
  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.sub),
    columns: { id: true, email: true, passwordHash: true, emailVerificationPending: true, emailVerifiedAt: true },
  });
  if (!user || user.email !== payload.email || (await passwordFingerprint(user.passwordHash)) !== payload.ph) return null;
  return user;
}
