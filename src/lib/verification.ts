import "server-only";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { emailEnabled, sendEmail } from "./email";
import { readToken, signToken } from "./session";

const PURPOSE = "verify-email";
export const RESEND_COOLDOWN_SECONDS = 60;
/** Validade do link de confirmação. */
export const LINK_LIFETIME_SECONDS = 24 * 60 * 60;

/**
 * A confirmação só é exigida para contas criadas com ela (cadastro com o envio de e-mails configurado)
 * e enquanto o envio continuar configurado.
 */
export function verificationRequired(user: { emailVerificationPending: boolean; emailVerifiedAt: Date | null }) {
  return emailEnabled() && user.emailVerificationPending && !user.emailVerifiedAt;
}

/**
 * Endereço público do site para o link do e-mail: APP_URL, o domínio de produção da Vercel ou,
 * em desenvolvimento e prévias, o endereço da própria requisição.
 */
async function siteUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// O e-mail vai para um endereço ainda não confirmado: nada digitado no cadastro entra no texto.
function message(link: string) {
  const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#08090d;font-family:Arial,Helvetica,sans-serif;color:#f5f1ea">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px">
    <p style="font-size:28px;font-weight:700;letter-spacing:-0.5px;margin:0 0 32px;color:#ffb547">Olwe</p>
    <h1 style="font-size:22px;margin:0 0 16px">Confirme seu e-mail</h1>
    <p style="font-size:15px;line-height:1.6;color:#c9c4bb;margin:0 0 28px">
      Falta só um passo para começar a assistir no Olwe. Toque no botão abaixo para confirmar que este e-mail é seu.
    </p>
    <a href="${link}" style="display:inline-block;background:#ff6a3d;color:#08090d;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px">Confirmar e-mail</a>
    <p style="font-size:13px;line-height:1.6;color:#8d877d;margin:28px 0 0">
      O link vale por 24 horas. Se o botão não funcionar, copie e cole este endereço no navegador:<br>
      <a href="${link}" style="color:#ffb547;word-break:break-all">${link}</a>
    </p>
    <p style="font-size:13px;line-height:1.6;color:#8d877d;margin:24px 0 0">Se você não criou uma conta no Olwe, ignore este e-mail.</p>
  </div>
</body></html>`;
  const text = `Confirme seu e-mail\n\nAbra este link para confirmar sua conta no Olwe (vale por 24 horas):\n${link}\n\nSe você não criou uma conta no Olwe, ignore este e-mail.`;
  return { html, text };
}

/**
 * Envia o link de confirmação, no máximo um por minuto por conta. A vaga do envio é reservada no banco
 * antes de chamar o Resend, então cliques simultâneos não mandam vários e-mails. Se o envio falhar, a
 * vaga é devolvida. Devolve "sent", "cooldown" ou "failed".
 */
export async function sendVerificationEmail(user: { id: string; email: string }): Promise<"sent" | "cooldown" | "failed"> {
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

  const token = await signToken(PURPOSE, { sub: user.id, email: user.email }, `${LINK_LIFETIME_SECONDS}s`);
  const link = `${await siteUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  if (await sendEmail({ to: user.email, subject: "Confirme seu e-mail no Olwe", ...message(link) })) return "sent";
  await db.update(users).set({ verificationSentAt: null }).where(and(eq(users.id, user.id), eq(users.verificationSentAt, now)));
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
