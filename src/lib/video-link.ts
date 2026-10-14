// Link de vídeo colado no painel do catálogo. Sem dependências de servidor: testável isoladamente.

const YOUTUBE_ID = /^[\w-]{11}$/;

/**
 * Link colado no painel: vídeo do YouTube (ID), vídeo enviado ao Mux ("mux:<asset id>", preenchido pelo
 * envio do painel) ou arquivo próprio em HTTPS (MP4, WebM ou HLS .m3u8).
 */
export function parseVideoLink(raw: string): { kind: "youtube" | "file" | "mux"; value: string } | { error: string } {
  const text = raw.trim();
  if (YOUTUBE_ID.test(text)) return { kind: "youtube", value: text };
  const mux = text.match(/^mux:([\w-]{1,100})$/);
  if (mux) return { kind: "mux", value: mux[1] };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { error: "Cole o link do vídeo (YouTube ou arquivo .mp4/.webm)." };
  }
  const host = url.hostname.replace(/^(www|m)\./, "");
  if (host === "youtu.be" || host === "youtube.com" || host === "youtube-nocookie.com") {
    const id = host === "youtu.be" ? url.pathname.slice(1) : (url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1] ?? "");
    return YOUTUBE_ID.test(id) ? { kind: "youtube", value: id } : { error: "Não reconheci o vídeo nesse link do YouTube." };
  }
  if (url.protocol !== "https:") return { error: "O arquivo de vídeo precisa estar num endereço HTTPS." };
  return { kind: "file", value: url.toString() };
}
