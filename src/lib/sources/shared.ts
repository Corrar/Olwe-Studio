// Utilitários das fontes de filmes completos. Sem dependências do Next para poderem ser testados
// isoladamente contra as APIs reais (só usam fetch e imports relativos).

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Raw = Record<string, any>;

export const DAY = 60 * 60 * 24;

/** Identificação exigida pela política de uso da API do Wikimedia. */
export const USER_AGENT = "Olwe/1.0 (https://olwe.vercel.app; https://github.com/Corrar/Olwe-Studio)";

export function first(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return value == null ? "" : String(value);
}

export function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Ano entre parênteses ou colchetes no título, como em "The Kid (1921)". */
export function yearFromTitle(title: string): string | null {
  const match = title.match(/[([]((?:18|19|20)\d{2})[)\]]/);
  return match ? match[1] : null;
}

/** Remove anos, marcas de qualidade e sufixos de divulgação do título. */
export function cleanTitle(title: string) {
  return title
    .replace(/\s*[([][^)\]]*[)\]]\s*/g, " ")
    .replace(/\s+[-–—|]\s+.*$/, "")
    .replace(/\b(hd|sd|4k|uhd|\d{3,4}p\d*|full movie|full film|restored|remastered|colori[sz]ed)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function normalize(text: string) {
  return text
    .toLocaleLowerCase("en")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Executa no máximo `limit` chamadas ao mesmo tempo, preservando a ordem. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

export async function fetchJson(url: URL, label: string, revalidate = DAY): Promise<Raw | null> {
  try {
    // `next.revalidate` liga o cache de dados do Next; fora do Next a opção é ignorada.
    const init = { headers: { accept: "application/json", "user-agent": USER_AGENT }, next: { revalidate } };
    const res = await fetch(url, init as RequestInit);
    if (!res.ok) throw new Error(`${label} ${res.status}`);
    return (await res.json()) as Raw;
  } catch (err) {
    console.error(`[${label}]`, url.pathname, err);
    return null;
  }
}
