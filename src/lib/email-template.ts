// Modelo dos e-mails do Olwe (confirmação de cadastro e troca de senha), em HTML para clientes de
// e-mail e em texto. Sem dependências de servidor: dá para gerar e conferir isoladamente.
//
// HTML de e-mail não é HTML de site: layout em tabelas, estilos inline (o Gmail ignora boa parte do
// <style>), botão "à prova de balas" (célula com cor de fundo, que funciona sem imagens e no Outlook) e
// imagens servidas pelo próprio Olwe em /email (o Gmail não mostra SVG). Só textos fixos e o link:
// nada digitado por quem pediu o envio entra no e-mail, que vai para um endereço ainda não confirmado.

export type EmailFeature = { icon: "film" | "users" | "sparkles" | "shield" | "clock"; title: string; text: string };

export type BrandEmail = {
  /** Endereço público do Olwe, de onde vêm as imagens (ex.: https://olwe.vercel.app). */
  base: string;
  /** Banner do topo: boas-vindas (play) ou segurança (cadeado). */
  hero: "welcome" | "security";
  /** Assunto, também usado como título do documento. */
  subject: string;
  /** Prévia que aparece ao lado do assunto na caixa de entrada. */
  preheader: string;
  eyebrow: string;
  heading: string;
  body: string;
  button: string;
  link: string;
  /** Validade do link, logo abaixo do botão. */
  validity: string;
  features: EmailFeature[];
  /** Frase que apresenta o link na versão em texto. */
  textLead: string;
  ignore: string;
};

// Mude ao trocar as imagens de public/email: o Gmail guarda as imagens em cache pelo endereço.
const ASSET_VERSION = "1";

const INK = "#08090d";
const CARD = "#111318";
const LINE = "#23262e";
const TEXT = "#f5f1ea";
const MUTED = "#a8a29a";
const SOFT = "#c9c4bb";
const AMBER = "#ffb547";
const EMBER = "#f26a3d";
const FONT = "'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif";

export const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function brandEmail(m: BrandEmail) {
  const base = m.base.replace(/\/$/, "");
  const img = (file: string) => escapeHtml(`${base}/email/${file}?v=${ASSET_VERSION}`);
  const link = escapeHtml(m.link);
  const site = escapeHtml(base);
  const year = new Date().getFullYear();
  // Espaços invisíveis depois da prévia: o cliente de e-mail não completa a prévia com o texto do corpo.
  const previewPad = "&#8199;&#65279;&#847; ".repeat(60);

  const features = m.features
    .map(
      (f, i) => `
              <tr>
                <td width="44" valign="top" style="padding:${i ? 18 : 0}px 16px 0 0;">
                  <img src="${img(`icon-${f.icon}.png`)}" width="44" height="44" alt="" style="display:block;border:0;outline:none;width:44px;height:44px;" />
                </td>
                <td valign="top" style="padding:${i ? 18 : 0}px 0 0;font-family:${FONT};">
                  <p style="margin:0 0 3px;font-size:15px;line-height:1.4;font-weight:700;color:${TEXT};">${f.title}</p>
                  <p style="margin:0;font-size:14px;line-height:1.55;color:${MUTED};">${f.text}</p>
                </td>
              </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${m.subject}</title>
  <style>
    @media (max-width: 600px) {
      .olwe-px { padding-left: 24px !important; padding-right: 24px !important; }
      .olwe-h1 { font-size: 25px !important; }
      .olwe-btn a { display: block !important; }
    }
    a { color: ${AMBER}; }
  </style>
</head>
<body style="margin:0;padding:0;background:${INK};-webkit-text-size-adjust:100%;" bgcolor="${INK}">
  <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${INK};">${m.preheader}${previewPad}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${INK}" style="background:${INK};">
    <tr>
      <td align="center" style="padding:28px 12px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr>
            <td style="padding:0 6px 22px;">
              <a href="${site}" target="_blank" style="text-decoration:none;">
                <img src="${img("logo.png")}" width="98" height="36" alt="Olwe" style="display:block;border:0;outline:none;width:98px;height:36px;color:${TEXT};font-family:${FONT};font-size:24px;font-weight:700;" />
              </a>
            </td>
          </tr>
          <tr>
            <td bgcolor="${CARD}" style="background:${CARD};border:1px solid ${LINE};border-radius:20px;overflow:hidden;">
              <img src="${img(`hero-${m.hero}.jpg`)}" width="560" alt="" style="display:block;border:0;outline:none;width:100%;max-width:560px;height:auto;border-radius:20px 20px 0 0;" />
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="olwe-px" style="padding:34px 40px 6px;font-family:${FONT};">
                    <p style="margin:0 0 10px;font-size:12px;line-height:1.4;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${AMBER};">${m.eyebrow}</p>
                    <h1 class="olwe-h1" style="margin:0 0 14px;font-size:28px;line-height:1.2;font-weight:800;letter-spacing:-0.5px;color:${TEXT};">${m.heading}</h1>
                    <p style="margin:0 0 28px;font-size:16px;line-height:1.65;color:${SOFT};">${m.body}</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="olwe-btn">
                      <tr>
                        <td align="center" bgcolor="${EMBER}" style="border-radius:999px;background:${EMBER};background-image:linear-gradient(135deg,#f15a3b,#f9a94b);">
                          <a href="${link}" target="_blank" style="display:inline-block;padding:16px 34px;font-family:${FONT};font-size:16px;line-height:1.2;font-weight:700;color:#0b0c10;text-decoration:none;border-radius:999px;">${m.button}&nbsp;&rarr;</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${MUTED};">${m.validity}</p>
                  </td>
                </tr>
                <tr>
                  <td class="olwe-px" style="padding:30px 40px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr><td style="border-top:1px solid ${LINE};font-size:0;line-height:0;">&nbsp;</td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="olwe-px" style="padding:26px 40px 8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${features}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="olwe-px" style="padding:26px 40px 34px;font-family:${FONT};">
                    <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:${MUTED};">Se o botão não funcionar, copie e cole este endereço no navegador:</p>
                    <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${link}" target="_blank" style="color:${AMBER};text-decoration:underline;">${link}</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 16px 0;font-family:${FONT};">
              <img src="${img("mark.png")}" width="24" height="24" alt="" style="display:block;border:0;outline:none;width:24px;height:24px;margin:0 auto 12px;" />
              <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${MUTED};">${m.ignore}</p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#6f6a63;">
                Olwe · Filmes e séries grátis, ou sem anúncios no Premium<br />
                <a href="${site}" target="_blank" style="color:#8d877d;text-decoration:underline;">${escapeHtml(base.replace(/^https?:\/\//, ""))}</a> · © ${year} Olwe Studio
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    "OLWE",
    "",
    m.heading,
    "",
    m.body,
    "",
    `${m.textLead}:`,
    m.link,
    "",
    ...m.features.map((f) => `• ${f.title}: ${f.text}`),
    "",
    m.ignore,
    "",
    `Olwe · ${base}`,
  ].join("\n");

  return { html, text };
}
