// Link de vídeo colado no painel do catálogo. Sem dependências de servidor: testável isoladamente.

const YOUTUBE_ID = /^[\w-]{11}$/;

/** Link colado no painel: vídeo do YouTube (ID) ou arquivo próprio em HTTPS (MP4/WebM). */
export function parseVideoLink(raw: string): { kind: "youtube" | "file"; value: string } | { error: string } {
  const text = raw.trim();
  if (YOUTUBE_ID.test(text)) return { kind: "youtube", value: text };
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
  if (/\.m3u8$/i.test(url.pathname)) return { error: "Vídeos HLS (.m3u8) ainda não são suportados. Use MP4 ou WebM." };
  return { kind: "file", value: url.toString() };
}
