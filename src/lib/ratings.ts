import "server-only";
import { clampLimit, estimateRating, isAllowed, type AgeRating, type RatingInfo } from "./classification";
import type { Profile } from "@/db/schema";
import { mapLimit } from "./sources/shared";
import { getTmdbRating } from "./tmdb";
import type { Title } from "./types";

/** Quem está assistindo: limite de classificação do perfil e se é infantil. */
export type Viewer = { maxRating: AgeRating; isKids: boolean; name: string };

export function viewerOf(profile: Pick<Profile, "maxRating" | "isKids" | "name">): Viewer {
  return { maxRating: clampLimit(profile.maxRating, profile.isKids), isKids: profile.isKids, name: profile.name };
}

/** Classificação do título: oficial/equivalente do TMDB ou, sem ela, a estimativa conservadora. */
export async function ratingOf(t: Title): Promise<RatingInfo> {
  if (t.ageRating) return t.ageRating;
  if (t.type === "movie" || t.type === "tv") {
    return (await getTmdbRating(t.type, t.id)) ?? estimateRating(t.genreIds, t.title);
  }
  // Filme completo: usa a classificação oficial do mesmo filme no TMDB, quando ele foi identificado.
  if (t.tmdbMatchId) {
    const official = await getTmdbRating("movie", t.tmdbMatchId);
    if (official) return official;
  }
  return estimateRating(t.genreIds, `${t.title} ${t.overview}`);
}

export async function withRatings<T extends Title>(items: T[]): Promise<T[]> {
  return mapLimit(items, 8, async (t) => ({ ...t, ageRating: await ratingOf(t) }));
}

/** Classifica e mantém só o que o perfil pode ver. Conteúdo adulto e 18+ nunca passam. */
export async function forViewer<T extends Title>(items: T[], viewer: Viewer): Promise<T[]> {
  const rated = await withRatings(items.filter((t) => !t.adult));
  return rated.filter((t) => isAllowed(t.ageRating, viewer.maxRating, viewer.isKids));
}

export type Access = { status: "allowed" | "blocked-for-profile" | "removed"; rating: RatingInfo };

/** Regra de acesso direto a um título (página do título e player). */
export async function accessFor(t: Title, viewer: Viewer): Promise<Access> {
  const rating = await ratingOf(t);
  if (t.adult || rating.value >= 18) return { status: "removed", rating };
  return { status: isAllowed(rating, viewer.maxRating, viewer.isKids) ? "allowed" : "blocked-for-profile", rating };
}
