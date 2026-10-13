import "server-only";
import { getFreeTitle, searchFree } from "./free";
import { getTitle as getTmdbTitle, searchTitles as searchTmdb } from "./tmdb";
import type { MediaType, Title, TitleDetails } from "./types";

export async function getTitle(type: MediaType, id: string): Promise<TitleDetails | null> {
  return type === "archive" || type === "commons" ? getFreeTitle(type, id) : getTmdbTitle(type, id);
}

/** Busca vários títulos de uma vez (Minha Lista, Continuar assistindo). */
export async function getTitlesByRef(refs: { mediaType: MediaType; itemId: string }[]): Promise<TitleDetails[]> {
  const results = await Promise.all(refs.map((r) => getTitle(r.mediaType, r.itemId)));
  return results.filter((t): t is TitleDetails => !!t);
}

export async function searchAll(query: string): Promise<{ full: Title[]; tmdb: Title[] }> {
  const [full, tmdb] = await Promise.all([searchFree(query), searchTmdb(query)]);
  return { full, tmdb };
}
