import "server-only";
import { MOVIE_GENRES, TV_GENRES } from "./genres";
import { MOCK_TITLES, mockList } from "./mock-catalog";
import type { MediaType, Title, TitleDetails } from "./types";

const API = "https://api.themoviedb.org/3";
const LANGUAGE = "pt-BR";
const REGION = "BR";

export const isDemoCatalog = !process.env.TMDB_API_KEY;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>;

async function tmdb<T = Raw>(path: string, params: Record<string, string> = {}, revalidate = 3600): Promise<T | null> {
  const key = process.env.TMDB_API_KEY!;
  const url = new URL(API + path);
  url.searchParams.set("language", LANGUAGE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  // Aceita a chave v3 (api_key) ou o token de leitura v4 (Bearer, começa com "eyJ").
  const headers: HeadersInit = { accept: "application/json" };
  if (key.startsWith("eyJ")) headers.authorization = `Bearer ${key}`;
  else url.searchParams.set("api_key", key);

  try {
    const res = await fetch(url, { headers, next: { revalidate } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`TMDB ${res.status} em ${path}`);
    return (await res.json()) as T;
  } catch (err) {
    console.error("[tmdb]", err);
    return null;
  }
}

function toTitle(raw: Raw, fallbackType?: MediaType): Title | null {
  const type: MediaType | undefined = raw.media_type ?? fallbackType;
  if (type !== "movie" && type !== "tv") return null;
  const date: string | undefined = type === "movie" ? raw.release_date : raw.first_air_date;
  return {
    id: raw.id,
    type,
    title: (type === "movie" ? raw.title : raw.name) ?? "",
    overview: raw.overview ?? "",
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    year: date ? date.slice(0, 4) : null,
    rating: Math.round((raw.vote_average ?? 0) * 10) / 10,
    genreIds: raw.genre_ids ?? raw.genres?.map((g: Raw) => g.id) ?? [],
  };
}

function toList(data: Raw | null, type?: MediaType): Title[] {
  return (data?.results ?? [])
    .map((r: Raw) => toTitle(r, type))
    .filter((t: Title | null): t is Title => !!t && !!t.title);
}

export async function getTrending(): Promise<Title[]> {
  if (isDemoCatalog) return mockList(() => true, 3);
  return toList(await tmdb("/trending/all/week"));
}

export type ListKind = "popular" | "top_rated" | "now_playing" | "on_the_air";

export async function getList(type: MediaType, kind: ListKind): Promise<Title[]> {
  if (isDemoCatalog) {
    const offset = { popular: 0, top_rated: 4, now_playing: 2, on_the_air: 5 }[kind];
    const list = mockList((t) => t.type === type, offset);
    return kind === "top_rated" ? [...list].sort((a, b) => b.rating - a.rating) : list;
  }
  return toList(await tmdb(`/${type}/${kind}`, { region: REGION }), type);
}

export async function getByGenre(type: MediaType, genreIds: number[], page = 1): Promise<Title[]> {
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

export async function getTitle(type: MediaType, id: number): Promise<TitleDetails | null> {
  if (isDemoCatalog) {
    const t = MOCK_TITLES.find((m) => m.type === type && m.id === id);
    if (!t) return null;
    const names = type === "movie" ? MOVIE_GENRES : TV_GENRES;
    return {
      ...t,
      genres: t.genreIds.map((g) => ({ id: g, name: names[g] ?? "" })).filter((g) => g.name),
      recommendations: mockList((m) => m.type === type && m.id !== id, id % 5).slice(0, 10),
    };
  }

  const extra = type === "movie" ? "release_dates" : "content_ratings";
  const raw = await tmdb(`/${type}/${id}`, {
    append_to_response: `videos,credits,recommendations,${extra}`,
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

  let certification: string | null = null;
  if (type === "movie") {
    const br = raw.release_dates?.results?.find((r: Raw) => r.iso_3166_1 === REGION);
    certification = br?.release_dates?.find((d: Raw) => d.certification)?.certification ?? null;
  } else {
    certification = raw.content_ratings?.results?.find((r: Raw) => r.iso_3166_1 === REGION)?.rating ?? null;
  }

  return {
    ...base,
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
      profilePath: c.profile_path ?? null,
    })),
    trailerKey: trailer?.key ?? null,
    certification,
    recommendations: toList(raw.recommendations, type).slice(0, 15),
  };
}

/** Busca vários títulos de uma vez (Minha Lista, Continuar assistindo). */
export async function getTitlesByRef(refs: { mediaType: MediaType; tmdbId: number }[]): Promise<Title[]> {
  const results = await Promise.all(refs.map((r) => getTitle(r.mediaType, r.tmdbId)));
  return results.filter((t): t is TitleDetails => !!t);
}

export function imageUrl(path: string | null, size: "w342" | "w500" | "w780" | "w1280" | "original" | "w185") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}
