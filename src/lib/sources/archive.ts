// Filmes completos do Internet Archive (archive.org).
// Só entram itens com licença declarada de domínio público ou Creative Commons, com um MP4 de pelo
// menos 480p (qualidade de DVD).

import { ADULT_CONTENT } from "../classification";
import { isRecent, NEW_ADDITION_DAYS, qualityOf, type Title, type TitleDetails, type VideoSource } from "../types";
import { fetchJson, first, mapLimit, safeUrl, stripHtml, truncate, type Raw } from "./shared";

const SEARCH = "https://archive.org/advancedsearch.php";
const MIN_HEIGHT = 470;
const MIN_WIDTH = 640;

export type ArchiveShelf = { key: string; label: string; query: string };

const FEATURE_FILMS = "collection:(feature_films) AND mediatype:(movies)";

export const ARCHIVE_SHELVES: ArchiveShelf[] = [
  { key: "populares", label: "Clássicos mais vistos", query: FEATURE_FILMS },
  { key: "comedia", label: "Comédias clássicas", query: `${FEATURE_FILMS} AND subject:(comedy)` },
  { key: "terror", label: "Terror clássico", query: `${FEATURE_FILMS} AND subject:(horror)` },
  { key: "ficcao", label: "Ficção científica clássica", query: `${FEATURE_FILMS} AND subject:("science fiction" OR "sci-fi")` },
  { key: "noir", label: "Noir e policial", query: `${FEATURE_FILMS} AND subject:(noir OR crime)` },
  { key: "faroeste", label: "Faroeste", query: `${FEATURE_FILMS} AND subject:(western)` },
  { key: "drama", label: "Drama", query: `${FEATURE_FILMS} AND subject:(drama)` },
  { key: "aventura", label: "Aventura", query: `${FEATURE_FILMS} AND subject:(adventure)` },
  { key: "desenhos", label: "Desenhos clássicos", query: "collection:(animationandcartoons) AND mediatype:(movies)" },
];

/** Aceita só endereços reais de licenças do creativecommons.org (licenças CC e marcas de domínio público). */
export function openLicenseUrl(value: unknown): string | null {
  const url = safeUrl(value, ["creativecommons.org"]);
  return url && /^\/(licenses|publicdomain)\//i.test(new URL(url).pathname) ? url : null;
}

function licenseName(url: string) {
  if (/publicdomain\/zero/i.test(url)) return "CC0 (domínio público)";
  if (/publicdomain/i.test(url)) return "Domínio público";
  const cc = url.match(/licenses\/([a-z-]+)\/([\d.]+)/i);
  return cc ? `CC ${cc[1].toUpperCase()} ${cc[2]}` : "Creative Commons";
}

function yearOf(raw: Raw) {
  const match = (first(raw.year) || first(raw.date)).match(/\d{4}/);
  return match ? match[0] : null;
}

const thumb = (id: string) => `https://archive.org/services/img/${encodeURIComponent(id)}`;
const downloadUrl = (id: string, name: string) =>
  `https://archive.org/download/${encodeURIComponent(id)}/${name.split("/").map(encodeURIComponent).join("/")}`;

function heightOf(f: Raw): number | null {
  const h = Number(f.height);
  if (h > 0) return h;
  return /512kb/i.test(String(f.format ?? "")) ? 240 : null;
}

/** MP4s que o navegador toca, do melhor para o pior. */
export function pickVideos(id: string, files: Raw[]): { sources: VideoSource[]; width: number | null; height: number | null } {
  const mp4 = files
    .filter((f) => typeof f.name === "string" && /\.mp4$/i.test(f.name) && /h\.264|mpeg4/i.test(String(f.format ?? "")))
    .map((f) => ({ f, h: heightOf(f), w: Number(f.width) || null }))
    .sort((a, b) => (b.h ?? 0) - (a.h ?? 0) || Number(b.f.size ?? 0) - Number(a.f.size ?? 0));
  const best = mp4[0];
  return {
    sources: mp4.slice(0, 2).map(({ f, h }) => ({ src: downloadUrl(id, String(f.name)), type: "video/mp4", height: h })),
    width: best?.w ?? null,
    height: best?.h ?? null,
  };
}

export function isGoodQuality(width: number | null, height: number | null) {
  return (height ?? 0) >= MIN_HEIGHT || (width ?? 0) >= MIN_WIDTH;
}

function parseRuntime(value: string, files: Raw[]): number | null {
  const hms = value.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (hms) return hms[3] ? Number(hms[1]) * 60 + Number(hms[2]) : Number(hms[1]);
  const min = value.match(/(\d+)\s*min/i);
  if (min) return Number(min[1]);
  const seconds = Number(files.find((f) => Number(f.length) > 0)?.length);
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds / 60) : null;
}

function getMetadata(id: string) {
  return fetchJson(new URL(`https://archive.org/metadata/${encodeURIComponent(id)}`), "archive");
}

export async function getArchiveDetails(id: string): Promise<TitleDetails | null> {
  if (!/^[\w.-]+$/.test(id)) return null;
  const data = await getMetadata(id);
  const meta: Raw | undefined = data?.metadata;
  const license = openLicenseUrl(first(meta?.licenseurl));
  if (!meta || data?.is_dark || !license) return null;

  const files: Raw[] = data?.files ?? [];
  const video = pickVideos(id, files);
  const title = stripHtml(first(meta.title));
  if (!title) return null;
  const subjects = (Array.isArray(meta.subject) ? meta.subject : String(meta.subject ?? "").split(/[;,]/))
    .map((s: string) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  const creator = stripHtml(first(meta.creator));
  const description = stripHtml(first(meta.description));
  // Conteúdo adulto fica fora do catálogo.
  if (ADULT_CONTENT.test(`${title} ${subjects.join(" ")} ${description}`)) return null;

  return {
    id,
    type: "archive",
    title,
    overview: description,
    poster: thumb(id),
    backdrop: thumb(id),
    year: yearOf(meta),
    rating: 0,
    genreIds: [],
    quality: qualityOf(video.width, video.height),
    isNew: isRecent(first(meta.publicdate) || first(meta.addeddate), NEW_ADDITION_DAYS),
    tagline: null,
    genres: subjects.map((name: string, i: number) => ({ id: i, name })),
    runtime: parseRuntime(first(meta.runtime), files),
    seasons: [],
    cast: [],
    trailerKey: null,
    certification: null,
    recommendations: [],
    providers: null,
    videoSources: isGoodQuality(video.width, video.height) ? video.sources : [],
    sourceUrl: `https://archive.org/details/${encodeURIComponent(id)}`,
    sourceName: "Internet Archive",
    license,
    licenseName: licenseName(license),
    credit: creator ? truncate(creator, 300) : null,
  };
}

/**
 * Busca no Internet Archive e mantém só itens com licença aberta e vídeo de pelo menos 480p.
 * A qualidade só aparece nos metadados de cada item, então cada candidato é consultado (com cache).
 * `window` é quantos resultados da busca cada página cobre; `rows` limita a quantidade devolvida
 * (fileiras). Sem `rows` vêm todos os aprovados da janela, para a paginação não pular filmes.
 */
export async function searchArchive(
  query: string,
  { window, page = 1, rows }: { window: number; page?: number; rows?: number },
): Promise<{ items: Title[]; hasMore: boolean }> {
  const url = new URL(SEARCH);
  url.searchParams.set("q", query);
  for (const f of ["identifier", "licenseurl"]) url.searchParams.append("fl[]", f);
  url.searchParams.append("sort[]", "downloads desc");
  url.searchParams.set("rows", String(window));
  url.searchParams.set("page", String(page));
  url.searchParams.set("output", "json");

  const data = await fetchJson(url, "archive", { isValid: (body) => !!body.response });
  const ids: string[] = (data?.response?.docs ?? [])
    .filter((d: Raw) => openLicenseUrl(first(d.licenseurl)))
    .map((d: Raw) => first(d.identifier))
    .filter(Boolean);

  const details = await mapLimit(ids, 6, getArchiveDetails);
  const items = details
    .filter((t): t is TitleDetails => !!t && t.videoSources.length > 0)
    .map(({ id, type, title, overview, poster, backdrop, year, rating, genreIds, quality, isNew }) => ({
      id,
      type,
      title,
      overview: overview.slice(0, 600),
      poster,
      backdrop,
      year,
      rating,
      genreIds,
      quality,
      isNew,
    }));
  const total = Number(data?.response?.numFound ?? 0);
  return { items: rows ? items.slice(0, rows) : items, hasMore: page * window < total };
}

export function archiveTextQuery(text: string) {
  const q = text.trim().slice(0, 100).replace(/[()":\\[\]{}^~*?!+&|-]/g, " ").trim();
  return q ? `(title:(${q}) OR description:(${q})) AND mediatype:(movies) AND collection:(feature_films OR animationandcartoons)` : null;
}
