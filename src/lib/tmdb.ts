import "server-only";
import { MOVIE_GENRES, TV_GENRES } from "./genres";
import { MOCK_TITLES, mockList } from "./mock-catalog";
import { estimateRating, isAdultsOnly, parseBrazilian, parseForeign, parseUs, type RatingInfo } from "./classification";
import { isRecent, NEW_RELEASE_DAYS, type Title, type TitleDetails, type WatchProviders } from "./types";

const API = "https://api.themoviedb.org/3";
const LANGUAGE = "pt-BR";
const REGION = "BR";

export const isDemoCatalog = !process.env.TMDB_API_KEY;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>;

type TmdbResult<T> = { ok: true; data: T } | { ok: false; notFound: boolean };

// Fila única do processo para as consultas que decidem se um título pode ser exibido (classificação e
// identificação dos filmes livres): uma página com muitas fileiras não dispara centenas de conexões ao
// TMDB de uma vez. Quem termina passa a vaga para o próximo; quem espera demais desiste e o título
// fica oculto (nunca é exibido sem a verificação).
const MAX_LOOKUPS = 20;
const QUEUE_TIMEOUT_MS = 12_000;
let activeLookups = 0;
const waiting: (() => void)[] = [];

async function queued<T>(fn: () => Promise<T>, onTimeout: T): Promise<T> {
  if (activeLookups < MAX_LOOKUPS) activeLookups++;
  else {
    const granted = await new Promise<boolean>((resolve) => {
      const grant = () => {
        clearTimeout(timer);
        resolve(true);
      };
      const timer = setTimeout(() => {
        waiting.splice(waiting.indexOf(grant), 1);
        resolve(false);
      }, QUEUE_TIMEOUT_MS);
      waiting.push(grant);
    });
    if (!granted) return onTimeout;
  }
  try {
    return await fn();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else activeLookups--;
  }
}

/** Consulta ao TMDB que diferencia "não existe" (404) de falha (rede, tempo esgotado, limite, erro). */
async function tmdbResult<T = Raw>(path: string, params: Record<string, string> = {}, revalidate = 3600): Promise<TmdbResult<T>> {
  const key = process.env.TMDB_API_KEY!;
  const url = new URL(API + path);
  url.searchParams.set("language", LANGUAGE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  // Aceita a chave v3 (api_key) ou o token de leitura v4 (Bearer, começa com "eyJ").
  const headers: HeadersInit = { accept: "application/json" };
  if (key.startsWith("eyJ")) headers.authorization = `Bearer ${key}`;
  else url.searchParams.set("api_key", key);

  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers, next: { revalidate }, signal: AbortSignal.timeout(10_000) });
      if (res.status === 404) return { ok: false, notFound: true };
      // Limite de requisições ou instabilidade: tenta mais uma vez depois de uma pausa curta.
      if ((res.status === 429 || res.status >= 500) && attempt === 0) {
        const wait = Math.min(Number(res.headers.get("retry-after")) || 1, 2);
        await new Promise((resolve) => setTimeout(resolve, wait * 1000));
        continue;
      }
      if (!res.ok) throw new Error(`TMDB ${res.status} em ${path}`);
      return { ok: true, data: (await res.json()) as T };
    } catch (err) {
      console.error("[tmdb]", err);
      return { ok: false, notFound: false };
    }
  }
}

async function tmdb<T = Raw>(path: string, params: Record<string, string> = {}, revalidate = 3600): Promise<T | null> {
  const result = await tmdbResult<T>(path, params, revalidate);
  return result.ok ? result.data : null;
}

export type TmdbType = "movie" | "tv";

function toTitle(raw: Raw, fallbackType?: TmdbType): Title | null {
  const type: TmdbType | undefined = raw.media_type ?? fallbackType;
  if (type !== "movie" && type !== "tv") return null;
  const date: string | undefined = type === "movie" ? raw.release_date : raw.first_air_date;
  return {
    id: String(raw.id),
    type,
    title: (type === "movie" ? raw.title : raw.name) ?? "",
    originalTitle: (type === "movie" ? raw.original_title : raw.original_name) ?? null,
    overview: raw.overview ?? "",
    poster: imageUrl(raw.poster_path, "w500"),
    backdrop: imageUrl(raw.backdrop_path, "w1280"),
    year: date ? date.slice(0, 4) : null,
    rating: Math.round((raw.vote_average ?? 0) * 10) / 10,
    genreIds: raw.genre_ids ?? raw.genres?.map((g: Raw) => g.id) ?? [],
    isNew: isRecent(date, NEW_RELEASE_DAYS),
    adult: raw.adult === true,
  };
}

function toList(data: Raw | null, type?: TmdbType): Title[] {
  return (data?.results ?? [])
    .map((r: Raw) => toTitle(r, type))
    .filter((t: Title | null): t is Title => !!t && !!t.title);
}

export async function getTrending(): Promise<Title[]> {
  if (isDemoCatalog) return mockList(() => true, 3);
  return toList(await tmdb("/trending/all/week"));
}

export type ListKind = "popular" | "top_rated" | "now_playing" | "on_the_air";

export async function getList(type: TmdbType, kind: ListKind): Promise<Title[]> {
  if (isDemoCatalog) {
    const offset = { popular: 0, top_rated: 4, now_playing: 2, on_the_air: 5 }[kind];
    const list = mockList((t) => t.type === type, offset);
    return kind === "top_rated" ? [...list].sort((a, b) => b.rating - a.rating) : list;
  }
  return toList(await tmdb(`/${type}/${kind}`, { region: REGION }), type);
}

export async function getByGenre(type: TmdbType, genreIds: number[], page = 1): Promise<Title[]> {
  if (isDemoCatalog) return mockList((t) => t.type === type && t.genreIds.some((g) => genreIds.includes(g)));
  const data = await tmdb(`/discover/${type}`, {
    with_genres: genreIds.join("|"),
    sort_by: "popularity.desc",
    page: String(page),
    watch_region: REGION,
  });
  return toList(data, type);
}

export async function searchTitles(query: string): Promise<Title[]> {
  const q = query.trim();
  if (!q) return [];
  if (isDemoCatalog) {
    const needle = q.toLocaleLowerCase("pt-BR");
    return MOCK_TITLES.filter(
      (t) => t.title.toLocaleLowerCase("pt-BR").includes(needle) || t.overview.toLocaleLowerCase("pt-BR").includes(needle),
    );
  }
  return toList(await tmdb("/search/multi", { query: q, include_adult: "false" }, 600));
}

export async function getTitle(type: TmdbType, id: string): Promise<TitleDetails | null> {
  if (!/^\d+$/.test(id)) return null;
  if (isDemoCatalog) {
    const t = MOCK_TITLES.find((m) => m.type === type && m.id === id);
    if (!t) return null;
    const names = type === "movie" ? MOVIE_GENRES : TV_GENRES;
    return {
      ...t,
      ageRating: mockRating(t.certification),
      genres: t.genreIds.map((g) => ({ id: g, name: names[g] ?? "" })).filter((g) => g.name),
      recommendations: mockList((m) => m.type === type && m.id !== id, Number(id) % 5).slice(0, 10),
    };
  }

  const extra = type === "movie" ? "release_dates" : "content_ratings";
  const raw = await tmdb(`/${type}/${id}`, {
    append_to_response: `videos,credits,recommendations,watch/providers,${extra}`,
    include_video_language: "pt,en,null",
  });
  if (!raw) return null;
  const base = toTitle(raw, type);
  if (!base) return null;

  const videos: Raw[] = raw.videos?.results ?? [];
  const trailer =
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.iso_639_1 === "pt") ??
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
    videos.find((v) => v.site === "YouTube" && v.type === "Teaser");

  // Sem classificação em nenhum país, vale a estimativa (que considera gêneros, título e sinopse); com
  // só a de outro país (também estimada), vale a mais alta das duas, como em ratingOf.
  const estimate = estimateRating(base.genreIds, `${base.title} ${base.overview.slice(0, 600)}`);
  const fromRaw = ratingFromRaw(type, raw);
  const ageRating: RatingInfo = !fromRaw
    ? estimate
    : fromRaw.source === "estimada"
      ? { ...fromRaw, value: fromRaw.value > estimate.value ? fromRaw.value : estimate.value }
      : fromRaw;
  const certification = ageRating && ageRating.source === "oficial" ? (ageRating.value === 0 ? "L" : String(ageRating.value)) : null;

  return {
    ...base,
    ageRating,
    tagline: raw.tagline || null,
    genres: raw.genres ?? [],
    runtime: type === "movie" ? raw.runtime || null : raw.episode_run_time?.[0] ?? null,
    seasons: (raw.seasons ?? [])
      .filter((s: Raw) => s.season_number > 0)
      .map((s: Raw) => ({
        number: s.season_number,
        name: s.name,
        episodeCount: s.episode_count,
        year: s.air_date ? s.air_date.slice(0, 4) : null,
      })),
    cast: (raw.credits?.cast ?? []).slice(0, 12).map((c: Raw) => ({
      id: c.id,
      name: c.name,
      character: c.character ?? "",
      photo: imageUrl(c.profile_path, "w185"),
    })),
    trailerKey: trailer?.key ?? null,
    certification,
    recommendations: toList(raw.recommendations, type).slice(0, 15),
    providers: toProviders(raw["watch/providers"]?.results?.[REGION]),
    videoSources: [],
    sourceUrl: null,
    sourceName: null,
    license: null,
    licenseName: null,
    credit: null,
  };
}

// Dados de disponibilidade fornecidos pelo JustWatch, via TMDB.
function toProviders(region: Raw | undefined): WatchProviders | null {
  if (!region) return null;
  const list = (items: Raw[] | undefined) =>
    (items ?? []).map((p) => ({ id: p.provider_id, name: p.provider_name, logo: imageUrl(p.logo_path, "w185") }));
  const providers = {
    link: region.link ?? null,
    subscription: list(region.flatrate),
    free: [...list(region.free), ...list(region.ads)],
    rent: list(region.rent),
    buy: list(region.buy),
  };
  const total = providers.subscription.length + providers.free.length + providers.rent.length + providers.buy.length;
  return total ? providers : null;
}

/**
 * Classificação a partir de release_dates (filmes) ou content_ratings (séries) do TMDB:
 * a brasileira (oficial); sem ela, 18 se algum país classificar como só para adultos; senão a
 * americana convertida (equivalente); senão a mais alta dos outros países convertida para o ClassInd
 * (estimada, que perfis infantis não aceitam). Null quando nenhum país informa classificação.
 */
function ratingFromRaw(type: TmdbType, raw: Raw): RatingInfo | null {
  type Entry = { country: string; cert: string; descriptors: string[] };
  const all: Entry[] =
    type === "movie"
      ? (raw.release_dates?.results ?? []).flatMap((r: Raw) =>
          (r.release_dates ?? [])
            .filter((d: Raw) => d.certification)
            .map((d: Raw) => ({ country: r.iso_3166_1, cert: String(d.certification), descriptors: (d.descriptors ?? []).map(String) })),
        )
      : (raw.content_ratings?.results ?? [])
          .filter((r: Raw) => r.rating)
          .map((r: Raw) => ({ country: r.iso_3166_1, cert: String(r.rating), descriptors: (r.descriptors ?? []).map(String) }));
  // Entre várias datas de lançamento, vale a classificação mais alta.
  const pick = (country: string, parse: (c: string) => RatingInfo["value"] | null) =>
    all
      .filter((e) => e.country === country)
      .map((e) => ({ value: parse(e.cert), descriptors: e.descriptors }))
      .filter((e): e is { value: RatingInfo["value"]; descriptors: string[] } => e.value !== null)
      .sort((a, b) => b.value - a.value)[0];

  const br = pick(REGION, parseBrazilian);
  if (br) return { value: br.value, source: "oficial", descriptors: br.descriptors };
  if (all.some((e) => isAdultsOnly(e.cert, e.country))) return { value: 18, source: "equivalente", descriptors: [] };
  const us = pick("US", parseUs);
  if (us) return { value: us.value, source: "equivalente", descriptors: [] };
  const foreign = all
    .map((e) => parseForeign(e.cert))
    .filter((v): v is RatingInfo["value"] => v !== null)
    .sort((a, b) => b - a)[0];
  if (foreign !== undefined) return { value: foreign, source: "estimada", descriptors: [] };
  return null;
}

/** found = classificado; none = nenhum país informa; error = não deu para consultar agora. */
export type RatingLookup = { status: "found"; rating: RatingInfo } | { status: "none" } | { status: "error" };

/** Só a classificação de um título (consulta leve, guardada por 7 dias). */
export async function getTmdbRating(type: TmdbType, id: string | number): Promise<RatingLookup> {
  if (isDemoCatalog) {
    const rating = mockRating(MOCK_TITLES.find((m) => m.type === type && m.id === String(id))?.certification);
    return rating ? { status: "found", rating } : { status: "none" };
  }
  const path = type === "movie" ? `/movie/${id}/release_dates` : `/tv/${id}/content_ratings`;
  const result = await queued(() => tmdbResult(path, {}, 60 * 60 * 24 * 7), { ok: false, notFound: false } as const);
  if (!result.ok) return result.notFound ? { status: "none" } : { status: "error" };
  const rating = ratingFromRaw(type, type === "movie" ? { release_dates: result.data } : { content_ratings: result.data });
  return rating ? { status: "found", rating } : { status: "none" };
}

function mockRating(cert: string | null | undefined): RatingInfo | null {
  const value = parseBrazilian(cert);
  return value === null ? null : { value, source: "oficial", descriptors: [] };
}

export type ArtworkMatch = {
  id: number;
  poster: string | null;
  backdrop: string | null;
  overview: string;
  genreIds: number[];
  /** O mesmo filme está marcado como adulto no TMDB: fica fora do catálogo. */
  adult: boolean;
};

/** match = filme identificado; none = o TMDB respondeu e não há o mesmo filme; error = não deu para consultar. */
export type ArtworkLookup = { status: "match"; match: ArtworkMatch } | { status: "none" } | { status: "error" };

function normalize(text: string) {
  return text
    .toLocaleLowerCase("en")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Procura um filme livre no TMDB pelo título exato (em português ou original) e ano com até 1 de
 * diferença. Serve para identificar o filme (classificação oficial e marcação de conteúdo adulto) e
 * para usar o pôster e a sinopse em português, sem colar a arte de outro filme num vídeo livre.
 */
export async function findMovieArtwork(title: string, year: string): Promise<ArtworkLookup> {
  if (isDemoCatalog || !title) return { status: "none" };
  // Inclui resultados adultos para identificar (e tirar do catálogo) filmes livres que são adultos.
  const result = await queued(
    () => tmdbResult("/search/movie", { query: title, include_adult: "true" }, 60 * 60 * 24 * 7),
    { ok: false, notFound: false } as const,
  );
  if (!result.ok) return result.notFound ? { status: "none" } : { status: "error" };
  const wanted = normalize(title);
  const target = Number(year);
  const same = (result.data.results ?? []).filter((r: Raw) => {
    const released = Number(String(r.release_date ?? "").slice(0, 4));
    const names = [r.title, r.original_title].filter(Boolean).map((n: string) => normalize(n));
    return released && Math.abs(released - target) <= 1 && names.includes(wanted);
  });
  // Qualquer homônimo adulto do mesmo ano tira o filme do catálogo; a arte só vem de um resultado com pôster.
  if (same.some((r: Raw) => r.adult === true)) {
    return { status: "match", match: { id: same[0].id, poster: null, backdrop: null, overview: "", genreIds: [], adult: true } };
  }
  const match = same.find((r: Raw) => r.poster_path) ?? same[0];
  if (!match) return { status: "none" };
  return {
    status: "match",
    match: {
      id: match.id,
      poster: imageUrl(match.poster_path ?? null, "w500"),
      backdrop: imageUrl(match.backdrop_path ?? null, "w1280"),
      overview: match.overview ?? "",
      genreIds: match.genre_ids ?? [],
      adult: false,
    },
  };
}

export function imageUrl(path: string | null, size: "w342" | "w500" | "w780" | "w1280" | "original" | "w185") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}
