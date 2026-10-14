import "server-only";
import { getFreeTitle } from "./free";
import { getTitle as getTmdbTitle } from "./tmdb";
import type { MediaType, TitleDetails } from "./types";

export async function getTitle(type: MediaType, id: string): Promise<TitleDetails | null> {
  return type === "archive" || type === "commons" ? getFreeTitle(type, id) : getTmdbTitle(type, id);
}

/** Busca vários títulos de uma vez (Minha Lista, Continuar assistindo). */
export async function getTitlesByRef(refs: { mediaType: MediaType; itemId: string }[]): Promise<TitleDetails[]> {
  const results = await Promise.all(refs.map((r) => getTitle(r.mediaType, r.itemId)));
  return results.filter((t): t is TitleDetails => !!t);
}
