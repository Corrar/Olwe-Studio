// Filmes completos do Wikimedia Commons (commons.wikimedia.org).
// Só entram vídeos com licença aberta (CC BY, CC BY-SA, CC0 ou domínio público), com versão de pelo
// menos 720p e duração mínima. O Olwe toca as versões que o próprio Commons gera para navegadores
// (VP9 + Opus), que têm boa qualidade de imagem e de som com tamanho razoável.

import { qualityOf, type Title, type TitleDetails, type VideoSource } from "../types";
import { cleanTitle, fetchJson, normalize, stripHtml, yearFromTitle, type Raw } from "./shared";

const API = "https://commons.wikimedia.org/w/api.php";
const PAGE_SIZE = 50;

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
  viextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|ObjectName|ImageDescription",
};

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

export function commonsTitle(fileName: string, objectName: string) {
  // Alguns arquivos trazem no nome do objeto marcações internas do Wikidata ("QS:P1476,..."): usa o nome do arquivo.
  const usable = objectName && !/QS:|\blabel\b/.test(objectName) ? objectName : "";
  const raw = usable || fileName.replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ");
  return cleanTitle(raw.replace(/\bin (4k|hd|full hd)\b/gi, " ")).replace(/\s+(movie|film)$/i, "").trim() || raw;
}

function playable(v: Raw): Raw[] {
  const derivatives: Raw[] = v.derivatives ?? [];
  return PLAYABLE.map((key) => derivatives.find((d) => d.transcodekey === key)).filter((d): d is Raw => !!d?.src);
}

function sourcesOf(v: Raw): VideoSource[] {
  return playable(v).map((d) => ({ src: String(d.src), type: String(d.type ?? "video/webm"), height: Number(d.height) || null }));
}

/** Resolução da melhor versão que o Olwe toca (não a do arquivo original). */
function bestServed(v: Raw) {
  const best = playable(v)[0];
  return { width: Number(best?.width) || null, height: Number(best?.height) || null };
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
  const objectName = meta(v, "ObjectName");
  if (NOT_A_FILM.test(fileName) || NOT_A_FILM.test(objectName)) return null;
  const served = bestServed(v);

  return {
    title: {
      id: fileName,
      type: "commons",
      title: commonsTitle(fileName, objectName),
      overview: meta(v, "ImageDescription").slice(0, 600),
      poster: v.thumburl ?? null,
      backdrop: v.thumburl ?? null,
      year: yearFromTitle(objectName) ?? yearFromTitle(fileName),
      rating: 0,
      genreIds: [],
      quality: qualityOf(served.width, served.height),
    },
    // Resolução do arquivo original, para escolher o melhor entre duplicados.
    height: Number(v.height) || 0,
  };
}

/** Busca vídeos no Commons e devolve só os que passam nos filtros de licença, duração e qualidade. */
export async function searchCommons(query: string, minMinutes: number, rows: number, page = 1): Promise<Title[]> {
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
  );
  const pages: Raw[] = [...(data?.query?.pages ?? [])].sort((a, b) => Number(a.index ?? 0) - Number(b.index ?? 0));

  // O mesmo filme costuma ter mais de um arquivo (4K, 1080p, versão antiga): fica o de maior resolução.
  const byTitle = new Map<string, Candidate>();
  for (const p of pages) {
    const c = toCandidate(p, minMinutes);
    if (!c) continue;
    const key = normalize(c.title.title);
    const prev = byTitle.get(key);
    if (!prev || c.height > prev.height) byTitle.set(key, c);
  }
  return [...byTitle.values()].slice(0, rows).map((c) => c.title);
}

export function commonsTextQuery(text: string) {
  const q = text.trim().replace(/["\\:]/g, " ").trim();
  return q ? `filetype:video fileh:>719 ${q}` : null;
}

function licenseLabel(name: string) {
  return /^public domain$/i.test(name) ? "Domínio público" : name;
}

export async function getCommonsDetails(id: string): Promise<TitleDetails | null> {
  if (!id || id.length > 240 || /[|#<>[\]{}\u0000-\u001f]/.test(id)) return null;
  const data = await fetchJson(apiUrl({ titles: `File:${id}`, ...VIDEO_PROPS }), "commons");
  const page: Raw | undefined = data?.query?.pages?.[0];
  if (!page || page.missing) return null;
  const candidate = toCandidate(page, 0);
  if (!candidate) return null;
  const v: Raw = page.videoinfo[0];

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
    sourceUrl: v.descriptionurl ?? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(id)}`,
    sourceName: "Wikimedia Commons",
    license: meta(v, "LicenseUrl") || null,
    licenseName: licenseLabel(meta(v, "LicenseShortName")),
    credit: meta(v, "Artist").slice(0, 200) || null,
  };
}
