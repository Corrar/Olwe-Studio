import "server-only";

// Envio de e-mails pelo Resend (https://resend.com), pela API REST.
// Sem RESEND_API_KEY o Olwe não envia e-mails: as contas novas já entram confirmadas e não há
// recuperação de senha.

export function emailEnabled() {
  return !!process.env.RESEND_API_KEY;
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

/** Envia um e-mail e devolve se o Resend aceitou. Erros vão para o log, sem expor a chave. */
export async function sendEmail({ to, subject, html, text }: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  // RESEND_API_URL só existe para testes (um servidor falso no lugar da API real).
  const api = process.env.RESEND_API_URL || "https://api.resend.com";
  try {
    const res = await fetch(`${api}/emails`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.RESEND_FROM || "Olwe <onboarding@resend.dev>", to: [to], subject, html, text }),
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
