// Filmes completos do Wikimedia Commons (commons.wikimedia.org).
// Só entram vídeos com licença aberta (CC BY, CC BY-SA, CC0 ou domínio público), com versão de pelo
// menos 720p e duração mínima. O Olwe toca as versões que o próprio Commons gera para navegadores
// (VP9 + Opus), que têm boa qualidade de imagem e de som com tamanho razoável.

import { qualityOf, type Title, type TitleDetails, type VideoSource } from "../types";
import { fetchJson, normalize, safeUrl, stripHtml, truncate, yearFromTitle, type Raw } from "./shared";

const API = "https://commons.wikimedia.org/w/api.php";
const PAGE_SIZE = 50;
const MAX_ID_LENGTH = 240;

export type CommonsShelf = { key: string; label: string; query: string; minMinutes: number };

export const COMMONS_SHELVES: CommonsShelf[] = [
  { key: "longas-hd", label: "Longas clássicos restaurados em HD", query: "filetype:video fileh:>719 feature film", minMinutes: 40 },
  { key: "comedia-hd", label: "Comédias clássicas em HD", query: "filetype:video fileh:>719 comedy film", minMinutes: 10 },
  { key: "mudos-hd", label: "Cinema mudo em HD", query: "filetype:video fileh:>719 silent film", minMinutes: 15 },
  { key: "abertos-4k", label: "Filmes abertos em 4K e Full HD", query: 'filetype:video fileh:>719 "open movie"', minMinutes: 5 },
  { key: "curtas-hd", label: "Curtas independentes em HD", query: 'filetype:video fileh:>719 "short film"', minMinutes: 5 },
  { key: "animacao-hd", label: "Animação clássica em HD", query: "filetype:video fileh:>719 animated cartoon", minMinutes: 5 },
];

const OPEN_LICENSE = /^(cc[ -]?by|cc0|cc[ -]?zero|public domain|pd\b)/i;
// Vídeos que não são filmes: aulas, 360°, eventos, notícias, trailers, trechos, reações.
const NOT_A_FILM =
  /\b(360|vr|tutorial|lecture|webinar|teaches|learn to draw|how to|interview|conference|red carpet|news|trailer|teaser|excerpt|reaction|making[- ]of|behind the scenes|festival \d{4}|timelapse|time-lapse|gameplay|vlog|podcast)\b/i;

// Versões geradas pelo Commons, da preferida para a de reserva.
const PLAYABLE = ["1080p.vp9.webm", "720p.vp9.webm", "480p.vp9.webm", "360p.mpeg4.mov"];
const HD = new Set(["1080p.vp9.webm", "720p.vp9.webm"]);

const VIDEO_PROPS = {
  prop: "videoinfo",
  viprop: "url|size|mime|mediatype|derivatives|extmetadata",
  viurlwidth: "1280",
  viextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|Attribution|ObjectName|ImageDescription",
};

const isValidResponse = (body: Raw) => !body.error && (!!body.query || !!body.batchcomplete);

function apiUrl(params: Record<string, string>) {
  const url = new URL(API);
  for (const [k, v] of Object.entries({ action: "query", format: "json", formatversion: "2", ...params })) {
    url.searchParams.set(k, v);
  }
  return url;
}

function meta(v: Raw, key: string) {
  return stripHtml(String(v.extmetadata?.[key]?.value ?? ""));
}

// Sufixos de divulgação depois de " - " ("Official ... release", "Blender Open Movie", "16mm - Silent - UHD").
// Um subtítulo de verdade ("Betty Boop - Minnie the Moocher") é mantido.
const PROMO_SUFFIX =
  /\s+[-–—|]\s+(official\b.*|.*\bopen movie\b.*|.*\brelease\b.*|.*\bfeature film\b.*|full (movie|film)\b.*|restored\b.*|remaster.*|\d{3,4}p\b.*|(hd|4k|uhd)\b.*|(16|35|super 8)\s?mm\b.*)$/i;

/** Título exibido: sem ano, marcas de qualidade e sufixos de divulgação, mas com o subtítulo. */
export function commonsTitle(fileName: string, objectName: string) {
  // Alguns arquivos trazem no nome do objeto marcações internas do Wikidata ("QS:P1476,..."): usa o nome do arquivo.
  const usable = objectName && !/QS:|\blabel\b/.test(objectName) ? objectName : "";
  const raw = usable || fileName.replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ");
  const title = raw
    .replace(/\s*[([](?:(?:18|19|20)\d{2}(?:\s+film)?|hd|4k|uhd|\d{3,4}p\d*)[)\]]\s*/gi, " ")
    .replace(/\bin (4k|hd|full hd)\b/gi, " ")
    .replace(PROMO_SUFFIX, "")
    .replace(/\b(4k|uhd|\d{3,4}p\d*|full movie|full film)\b/gi, " ")
    .replace(/[-–—|]\s*$/, "")
    .replace(/\s+movie$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return title || raw;
}

function playable(v: Raw): Raw[] {
  const derivatives: Raw[] = v.derivatives ?? [];
  return PLAYABLE.map((key) => derivatives.find((d) => d.transcodekey === key)).filter(
    (d): d is Raw => !!safeUrl(d?.src, ["wikimedia.org"]),
  );
}

function sourcesOf(v: Raw): VideoSource[] {
  return playable(v).map((d) => ({ src: String(d.src), type: String(d.type ?? "video/webm"), height: Number(d.height) || null }));
}

/** Resolução da melhor versão que o Olwe toca (não a do arquivo original). */
function bestServed(v: Raw) {
  const best = playable(v)[0];
  return { width: Number(best?.width) || null, height: Number(best?.height) || null };
}

/** Miniatura em outra largura (o Commons serve larguras padrão como 500px e 1280px). */
function thumbAt(url: unknown, width: number): string | null {
  const safe = safeUrl(url, ["wikimedia.org"]);
  return safe ? safe.replace(/\/\d+px-/, `/${width}px-`) : null;
}

type Candidate = { title: Title; height: number };

/** Converte uma página de arquivo do Commons em título, ou null se não passar nos filtros. */
function toCandidate(page: Raw, minMinutes: number): Candidate | null {
  const v: Raw | undefined = page.videoinfo?.[0];
  if (!v || String(v.mediatype ?? "VIDEO") !== "VIDEO") return null;
  if (!(Number(v.duration) >= minMinutes * 60)) return null;
  if (!OPEN_LICENSE.test(meta(v, "LicenseShortName"))) return null;
  if (!(v.derivatives ?? []).some((d: Raw) => HD.has(d.transcodekey))) return null;

  const fileName = String(page.title ?? "").replace(/^File:/, "");
  if (!fileName || fileName.length > MAX_ID_LENGTH) return null;
  const objectName = meta(v, "ObjectName");
  if (NOT_A_FILM.test(fileName) || NOT_A_FILM.test(objectName)) return null;
  const served = bestServed(v);

  return {
    title: {
      id: fileName,
      type: "commons",
      title: commonsTitle(fileName, objectName),
      overview: meta(v, "ImageDescription").slice(0, 600),
      poster: thumbAt(v.thumburl, 500),
      backdrop: thumbAt(v.thumburl, 1280),
      year: yearFromTitle(objectName) ?? yearFromTitle(fileName),
      rating: 0,
      genreIds: [],
      quality: qualityOf(served.width, served.height),
    },
    // Resolução do arquivo original, para escolher o melhor entre duplicados.
    height: Number(v.height) || 0,
  };
}

/**
 * Busca vídeos no Commons e devolve os que passam nos filtros de licença, duração e qualidade.
 * Cada página corresponde a 50 resultados da busca; `rows` limita a quantidade devolvida (fileiras),
 * e sem `rows` vêm todos os aprovados da página (páginas de "Ver tudo", para nada ficar de fora).
 */
export async function searchCommons(
  query: string,
  minMinutes: number,
  { page = 1, rows }: { page?: number; rows?: number } = {},
): Promise<{ items: Title[]; hasMore: boolean }> {
  const data = await fetchJson(
    apiUrl({
      generator: "search",
      gsrnamespace: "6",
      gsrsearch: query,
      gsrlimit: String(PAGE_SIZE),
      gsroffset: String((page - 1) * PAGE_SIZE),
      ...VIDEO_PROPS,
    }),
    "commons",
    { isValid: isValidResponse },
  );
  const pages: Raw[] = [...(data?.query?.pages ?? [])].sort((a, b) => Number(a.index ?? 0) - Number(b.index ?? 0));

  // O mesmo filme costuma ter mais de um arquivo (4K, 1080p, versão antiga): fica o de maior resolução.
  // A chave inclui o ano para não juntar filmes diferentes com o mesmo nome.
  const byKey = new Map<string, Candidate>();
  for (const p of pages) {
    const c = toCandidate(p, minMinutes);
    if (!c) continue;
    const key = `${normalize(c.title.title)}|${c.title.year ?? ""}`;
    const prev = byKey.get(key);
    if (!prev || c.height > prev.height) byKey.set(key, c);
  }
  const items = [...byKey.values()].map((c) => c.title);
  return { items: rows ? items.slice(0, rows) : items, hasMore: !!data?.continue };
}

export function commonsTextQuery(text: string) {
  const q = text.trim().slice(0, 100).replace(/["\\:]/g, " ").trim();
  return q ? `filetype:video fileh:>719 ${q}` : null;
}

function licenseLabel(name: string) {
  return /^public domain$/i.test(name) ? "Domínio público" : name;
}

export async function getCommonsDetails(id: string): Promise<TitleDetails | null> {
  if (!id || id.length > MAX_ID_LENGTH || /[|#<>[\]{}\u0000-\u001f]/.test(id)) return null;
  const data = await fetchJson(apiUrl({ titles: `File:${id}`, ...VIDEO_PROPS }), "commons", { isValid: isValidResponse });
  const page: Raw | undefined = data?.query?.pages?.[0];
  if (!page || page.missing) return null;
  const candidate = toCandidate(page, 0);
  if (!candidate) return null;
  const v: Raw = page.videoinfo[0];
  // A licença CC BY pede a atribuição indicada pelo autor; sem ela, usa o campo de autoria.
  const credit = meta(v, "Attribution") || meta(v, "Artist");

  return {
    ...candidate.title,
    overview: meta(v, "ImageDescription"),
    tagline: null,
    genres: [],
    runtime: Math.round(Number(v.duration) / 60) || null,
    seasons: [],
    cast: [],
    trailerKey: null,
    certification: null,
    recommendations: [],
    providers: null,
    videoSources: sourcesOf(v),
    sourceUrl:
      safeUrl(v.descriptionurl, ["commons.wikimedia.org"]) ?? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(id)}`,
    sourceName: "Wikimedia Commons",
    license: safeUrl(meta(v, "LicenseUrl"), ["creativecommons.org"]),
    licenseName: licenseLabel(meta(v, "LicenseShortName")),
    credit: credit ? truncate(credit, 300) : null,
  };
}
