import "server-only";
import { findMovieArtwork, isDemoCatalog } from "./tmdb";
import type { Title, TitleDetails } from "./types";

// Filmes completos e gratuitos do Internet Archive (archive.org).
// Só entram itens cuja licença declarada é domínio público ou Creative Commons.

const SEARCH = "https://archive.org/advancedsearch.php";
const DAY = 60 * 60 * 24;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>;

export type ArchiveShelf = {
  key: string;
  label: string;
  query: string;
};

const FEATURE_FILMS = "collection:(feature_films) AND mediatype:(movies)";

export const ARCHIVE_SHELVES: ArchiveShelf[] = [
  { key: "populares", label: "Filmes completos mais vistos", query: FEATURE_FILMS },
  { key: "comedia", label: "Comédias clássicas", query: `${FEATURE_FILMS} AND subject:(comedy)` },
  { key: "terror", label: "Terror clássico", query: `${FEATURE_FILMS} AND subject:(horror)` },
  { key: "ficcao", label: "Ficção científica", query: `${FEATURE_FILMS} AND subject:("science fiction" OR "sci-fi")` },
  { key: "noir", label: "Noir e policial", query: `${FEATURE_FILMS} AND subject:(noir OR crime)` },
  { key: "faroeste", label: "Faroeste", query: `${FEATURE_FILMS} AND subject:(western)` },
  { key: "drama", label: "Drama", query: `${FEATURE_FILMS} AND subject:(drama)` },
  { key: "aventura", label: "Aventura", query: `${FEATURE_FILMS} AND subject:(adventure)` },
  { key: "animacao", label: "Desenhos e animações", query: "collection:(animationandcartoons) AND mediatype:(movies)" },
];

export const KIDS_SHELF = ARCHIVE_SHELVES.find((s) => s.key === "animacao")!;

export function isOpenLicense(url: unknown) {
  return typeof url === "string" && /publicdomain|creativecommons/i.test(url);
}

function first(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return value == null ? "" : String(value);
}

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function yearOf(raw: Raw) {
  const y = first(raw.year) || first(raw.date);
  const match = y.match(/\d{4}/);
  return match ? match[0] : null;
}

/** Remove "(1968)", "[HD]" e afins do título do Internet Archive para buscar no TMDB. */
function cleanTitle(title: string) {
  return title
    .replace(/\s*[([][^)\]]*[)\]]\s*/g, " ")
    .replace(/\s+-\s+.*$/, "")
    .replace(/\b(hd|sd|4k|1080p|720p|480p|full movie|restored|remastered|colori[sz]ed)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Troca a miniatura do Internet Archive pelo pôster do TMDB quando acha o mesmo filme. */
async function withArtwork<T extends Title>(item: T): Promise<T> {
  const match = await findMovieArtwork(cleanTitle(item.title), item.year);
  if (!match) return item;
  return {
    ...item,
    poster: match.poster ?? item.poster,
    backdrop: match.backdrop ?? match.poster ?? item.backdrop,
    overview: match.overview || item.overview,
  };
}

// Limita as chamadas simultâneas ao TMDB.
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
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

const thumb = (id: string) => `https://archive.org/services/img/${encodeURIComponent(id)}`;

function toTitle(raw: Raw): Title | null {
  const id = first(raw.identifier);
  const title = stripHtml(first(raw.title));
  if (!id || !title) return null;
  return {
    id,
    type: "archive",
    title,
    overview: stripHtml(first(raw.description)).slice(0, 600),
    poster: thumb(id),
    backdrop: thumb(id),
    year: yearOf(raw),
    rating: 0,
    genreIds: [],
  };
}

async function fetchJson(url: URL): Promise<Raw | null> {
  try {
    const res = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate: DAY } });
    if (!res.ok) throw new Error(`Internet Archive ${res.status}`);
    return (await res.json()) as Raw;
  } catch (err) {
    console.error("[archive]", url.pathname, err);
    return null;
  }
}

async function search(query: string, rows: number, page = 1): Promise<{ items: Title[]; total: number }> {
  const url = new URL(SEARCH);
  url.searchParams.set("q", query);
  for (const f of ["identifier", "title", "description", "year", "date", "licenseurl"]) url.searchParams.append("fl[]", f);
  url.searchParams.append("sort[]", "downloads desc");
  // Busca mais do que o necessário porque os itens sem licença aberta são descartados.
  url.searchParams.set("rows", String(rows * 2));
  url.searchParams.set("page", String(page));
  url.searchParams.set("output", "json");

  const data = await fetchJson(url);
  const docs: Raw[] = data?.response?.docs ?? [];
  const items = docs
    .filter((d) => isOpenLicense(d.licenseurl))
    .map(toTitle)
    .filter((t): t is Title => !!t)
    .slice(0, rows);
  return { items: await mapLimit(items, 8, withArtwork), total: Number(data?.response?.numFound ?? 0) };
}

export async function getArchiveShelf(shelf: ArchiveShelf, rows = 30, page = 1) {
  if (isDemoCatalog) return { items: DEMO.slice(0, rows), total: DEMO.length };
  return search(shelf.query, rows, page);
}

export async function searchArchive(text: string, rows = 30): Promise<Title[]> {
  const q = text.trim().replace(/[()":\\]/g, " ");
  if (!q) return [];
  if (isDemoCatalog) {
    const needle = q.toLocaleLowerCase("pt-BR");
    return DEMO.filter((t) => t.title.toLocaleLowerCase("pt-BR").includes(needle));
  }
  const { items } = await search(
    `(title:(${q}) OR description:(${q})) AND mediatype:(movies) AND collection:(feature_films OR animationandcartoons)`,
    rows,
  );
  return items;
}

// Escolhe o melhor arquivo de vídeo que o navegador toca (MP4 H.264).
function pickVideo(files: Raw[]): Raw | null {
  const mp4 = files.filter((f) => typeof f.name === "string" && /\.mp4$/i.test(f.name));
  const rank = (f: Raw) => {
    const format = String(f.format ?? "");
    if (/h\.264/i.test(format)) return 3;
    if (/512kb|mpeg4/i.test(format)) return 2;
    return 1;
  };
  return mp4.sort((a, b) => rank(b) - rank(a) || Number(b.size ?? 0) - Number(a.size ?? 0))[0] ?? null;
}

function parseRuntime(value: string, files: Raw[], video: Raw | null): number | null {
  const hms = value.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (hms) return hms[3] ? Number(hms[1]) * 60 + Number(hms[2]) : Number(hms[1]);
  const min = value.match(/(\d+)\s*min/i);
  if (min) return Number(min[1]);
  const seconds = Number(video?.length ?? files.find((f) => f.length)?.length);
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds / 60) : null;
}

export async function getArchiveTitle(id: string): Promise<TitleDetails | null> {
  if (isDemoCatalog) return DEMO.find((t) => t.id === id) ?? null;
  if (!/^[\w.-]+$/.test(id)) return null;

  const data = await fetchJson(new URL(`https://archive.org/metadata/${encodeURIComponent(id)}`));
  const meta: Raw | undefined = data?.metadata;
  if (!meta || data?.is_dark || !isOpenLicense(meta.licenseurl)) return null;

  const files: Raw[] = data?.files ?? [];
  const video = pickVideo(files);
  const base = toTitle(meta);
  if (!base) return null;
  const subjects = (Array.isArray(meta.subject) ? meta.subject : String(meta.subject ?? "").split(/[;,]/))
    .map((s: string) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  return withArtwork({
    ...base,
    overview: stripHtml(first(meta.description)),
    tagline: null,
    genres: subjects.map((name: string, i: number) => ({ id: i, name })),
    runtime: parseRuntime(first(meta.runtime), files, video),
    seasons: [],
    cast: [],
    trailerKey: null,
    certification: null,
    recommendations: [],
    providers: null,
    videoUrl: video
      ? `https://archive.org/download/${encodeURIComponent(id)}/${String(video.name).split("/").map(encodeURIComponent).join("/")}`
      : null,
    sourceUrl: `https://archive.org/details/${encodeURIComponent(id)}`,
    license: first(meta.licenseurl),
  } satisfies TitleDetails);
}

// Itens de demonstração (sem TMDB_API_KEY): fictícios, sem vídeo.
const DEMO: TitleDetails[] = [
  ["olwe-demo-farol", "O Farol de Papel", "1934", "Comédia muda sobre um faroleiro que constrói um farol inteiro de jornal."],
  ["olwe-demo-trem", "Último Trem para Vila Serena", "1948", "Um detetive cansado investiga um roubo dentro de um trem noturno."],
  ["olwe-demo-lua", "Viagem à Lua de Prata", "1952", "Três inventores constroem um foguete no quintal e decolam por engano."],
  ["olwe-demo-pradaria", "Pradaria Vermelha", "1939", "Um xerife sem arma precisa manter a paz numa cidade de fronteira."],
].map(([id, title, year, overview]) => ({
  id,
  type: "archive",
  title,
  overview,
  poster: null,
  backdrop: null,
  year,
  rating: 0,
  genreIds: [],
  tagline: null,
  genres: [],
  runtime: 80,
  seasons: [],
  cast: [],
  trailerKey: null,
  certification: null,
  recommendations: [],
  providers: null,
  videoUrl: null,
  sourceUrl: null,
  license: "https://creativecommons.org/publicdomain/mark/1.0/",
}));
