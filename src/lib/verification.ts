import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { emailEnabled, sendEmail } from "./email";
import { readToken, signToken } from "./session";

const PURPOSE = "verify-email";
export const RESEND_COOLDOWN_SECONDS = 60;

/** A confirmação só é exigida quando o envio de e-mails está configurado. */
export function verificationRequired(user: { emailVerifiedAt: Date | null }) {
  return emailEnabled() && !user.emailVerifiedAt;
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

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function message(name: string, link: string) {
  const first = escapeHtml(name.split(" ")[0] || name);
  const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#08090d;font-family:Arial,Helvetica,sans-serif;color:#f5f1ea">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px">
    <p style="font-size:28px;font-weight:700;letter-spacing:-0.5px;margin:0 0 32px;color:#ffb547">Olwe</p>
    <h1 style="font-size:22px;margin:0 0 16px">Confirme seu e-mail, ${first}</h1>
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
  const text = `Confirme seu e-mail, ${name.split(" ")[0] || name}\n\nAbra este link para confirmar sua conta no Olwe (vale por 24 horas):\n${link}\n\nSe você não criou uma conta no Olwe, ignore este e-mail.`;
  return { html, text };
}

/** Envia o link de confirmação e registra o horário do envio. */
export async function sendVerificationEmail(user: { id: string; name: string; email: string }) {
  const token = await signToken(PURPOSE, { sub: user.id, email: user.email }, "24h");
  const link = `${await siteUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  const sent = await sendEmail({ to: user.email, subject: "Confirme seu e-mail no Olwe", ...message(user.name, link) });
  if (sent) await db.update(users).set({ verificationSentAt: new Date() }).where(eq(users.id, user.id));
  return sent;
}

/** Confirma o e-mail pelo token do link. Devolve o id da conta confirmada, ou null se o link não vale. */
export async function confirmEmail(token: string): Promise<string | null> {
  const payload = await readToken(PURPOSE, token);
  if (!payload || typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub), columns: { id: true, email: true, emailVerifiedAt: true } });
  // O link só vale para o e-mail para o qual foi enviado.
  if (!user || user.email !== payload.email) return null;
  if (!user.emailVerifiedAt) await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, user.id));
  return user.id;
}
