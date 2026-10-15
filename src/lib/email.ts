import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// Envio de e-mails por SMTP ou pelo Resend (https://resend.com):
// - SMTP (SMTP_USER e SMTP_PASS): por exemplo uma conta do Gmail com senha de app, grátis e sem domínio
//   próprio. Tem prioridade quando configurado.
// - Resend (RESEND_API_KEY): pede um domínio verificado (RESEND_FROM) para mandar a qualquer pessoa.
// Sem nenhum dos dois, o Olwe não envia e-mails: as contas novas já entram confirmadas e não há
// recuperação de senha.

type Smtp = { host: string; port: number; user: string; pass: string };

function smtpConfig(): Smtp | null {
  const user = process.env.SMTP_USER?.trim();
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  // A senha de app do Google aparece em quatro blocos separados por espaços: os espaços não fazem parte dela.
  const pass = host === "smtp.gmail.com" ? process.env.SMTP_PASS?.replace(/\s+/g, "") : process.env.SMTP_PASS;
  if (!user || !pass) return null;
  return { host, port: Number(process.env.SMTP_PORT) || 465, user, pass };
}

const RESEND_SANDBOX_FROM = "Olwe <onboarding@resend.dev>";
const resendFrom = () => process.env.RESEND_FROM?.trim() || RESEND_SANDBOX_FROM;

/**
 * Resend sem domínio próprio (remetente de teste @resend.dev) só entrega para o dono da conta do
 * Resend. Publicado na Vercel, ligar a confirmação assim prenderia todo cadastro novo numa tela de
 * confirmação cujo e-mail nunca chega: só vale com um RESEND_FROM de outro domínio, ou fora da Vercel
 * (testes locais).
 */
function resendUsable() {
  return !!process.env.RESEND_API_KEY && (!/@resend\.dev\b/i.test(resendFrom()) || !process.env.VERCEL);
}

export function emailEnabled() {
  return !!smtpConfig() || resendUsable();
}

type Email = { to: string; subject: string; html: string; text: string };

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Mensagem com um link de ação no visual do Olwe (fundo escuro, botão laranja), em HTML e texto.
 * Só textos fixos e o link: nada digitado por quem pediu o envio entra no e-mail, que vai para um
 * endereço ainda não confirmado.
 */
export function linkEmail(m: {
  heading: string;
  body: string;
  button: string;
  link: string;
  /** Validade do link, no rodapé do HTML. */
  validity: string;
  /** Frase que apresenta o link na versão em texto. */
  textLead: string;
  ignore: string;
}) {
  const link = escapeHtml(m.link);
  const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#08090d;font-family:Arial,Helvetica,sans-serif;color:#f5f1ea">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px">
    <p style="font-size:28px;font-weight:700;letter-spacing:-0.5px;margin:0 0 32px;color:#ffb547">Olwe</p>
    <h1 style="font-size:22px;margin:0 0 16px">${m.heading}</h1>
    <p style="font-size:15px;line-height:1.6;color:#c9c4bb;margin:0 0 28px">${m.body}</p>
    <a href="${link}" style="display:inline-block;background:#ff6a3d;color:#08090d;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px">${m.button}</a>
    <p style="font-size:13px;line-height:1.6;color:#8d877d;margin:28px 0 0">
      ${m.validity} Se o botão não funcionar, copie e cole este endereço no navegador:<br>
      <a href="${link}" style="color:#ffb547;word-break:break-all">${link}</a>
    </p>
    <p style="font-size:13px;line-height:1.6;color:#8d877d;margin:24px 0 0">${m.ignore}</p>
  </div>
</body></html>`;
  const text = `${m.heading}\n\n${m.textLead}:\n${m.link}\n\n${m.ignore}`;
  return { html, text };
}

let transport: { key: string; transporter: Transporter } | null = null;

/** Envia por SMTP. Uma conexão por envio (sem pool): cada função da Vercel pode ser encerrada a qualquer momento. */
async function sendSmtp(smtp: Smtp, { to, subject, html, text }: Email): Promise<boolean> {
  const key = `${smtp.host}:${smtp.port}:${smtp.user}`;
  if (transport?.key !== key) {
    transport = {
      key,
      transporter: nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: { user: smtp.user, pass: smtp.pass },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      }),
    };
  }
  // O Gmail só aceita como remetente o próprio endereço da conta; o nome exibido é "Olwe".
  const from = process.env.SMTP_FROM?.trim() || `"Olwe" <${smtp.user}>`;
  try {
    await transport.transporter.sendMail({ from, to, subject, html, text });
    return true;
  } catch (err) {
    // Só o código e a resposta do servidor: a mensagem de erro nunca traz a senha.
    const e = err as { code?: string; responseCode?: number; response?: string; message?: string };
    console.error("[email] o servidor SMTP recusou o envio", e.code ?? "", e.responseCode ?? "", (e.response ?? e.message ?? "").slice(0, 300));
    return false;
  }
}

/** Envia um e-mail e devolve se o provedor aceitou. Erros vão para o log, sem expor chaves nem senhas. */
export async function sendEmail(email: Email): Promise<boolean> {
  const smtp = smtpConfig();
  if (smtp) return sendSmtp(smtp, email);
  if (!resendUsable()) return false;
  const { to, subject, html, text } = email;
  const key = process.env.RESEND_API_KEY;
  // RESEND_API_URL só existe para testes (um servidor falso no lugar da API real).
  const api = process.env.RESEND_API_URL || "https://api.resend.com";
  try {
    const res = await fetch(`${api}/emails`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: resendFrom(), to: [to], subject, html, text }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[email] o Resend recusou o envio", res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] falha ao enviar", err);
    return false;
  }
}
