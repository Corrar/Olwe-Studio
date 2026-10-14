import "server-only";

// Envio de e-mails pelo Resend (https://resend.com), pela API REST.
// Sem RESEND_API_KEY o Olwe não envia e-mails e as contas novas já entram confirmadas.

export function emailEnabled() {
  return !!process.env.RESEND_API_KEY;
}

type Email = { to: string; subject: string; html: string; text: string };

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
