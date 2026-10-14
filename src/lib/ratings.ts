import "server-only";
import { BLOCKED_RATING, clampLimit, estimateRating, isAllowed, type AgeRating, type RatingInfo } from "./classification";
import type { Profile } from "@/db/schema";
import { getTmdbRating, type RatingLookup, type TmdbType } from "./tmdb";
import type { Title } from "./types";

/** Quem está assistindo: limite de classificação do perfil e se é infantil. */
export type Viewer = { maxRating: AgeRating; isKids: boolean; name: string };

export function viewerOf(profile: Pick<Profile, "maxRating" | "isKids" | "name">): Viewer {
  return { maxRating: clampLimit(profile.maxRating, profile.isKids), isKids: profile.isKids, name: profile.name };
}

// Uma fila só para as consultas de classificação do processo: uma página com várias fileiras não abre
// dezenas de conexões ao TMDB ao mesmo tempo. Quem termina passa a vaga direto para o próximo da fila.
const MAX_LOOKUPS = 12;
let activeLookups = 0;
const waiting: (() => void)[] = [];

async function lookup(type: TmdbType, id: string | number): Promise<RatingLookup> {
  if (activeLookups < MAX_LOOKUPS) activeLookups++;
  else await new Promise<void>((resolve) => waiting.push(resolve));
  try {
    return await getTmdbRating(type, id);
  } finally {
    const next = waiting.shift();
    if (next) next();
    else activeLookups--;
  }
}

/**
 * Classificação do título: a oficial ou equivalente do TMDB ou, quando nenhum país classifica, a
 * estimativa conservadora. Null quando a consulta falhou: sem classificação confirmada o título não
 * aparece (nunca se presume que um título é livre só porque o TMDB não respondeu).
 */
export async function ratingOf(t: Title): Promise<RatingInfo | null> {
  if (t.ageRating) return t.ageRating;
  // Filme completo: usa a classificação do mesmo filme no TMDB, quando ele foi identificado.
  const tmdbId = t.type === "movie" || t.type === "tv" ? t.id : t.tmdbMatchId;
  if (tmdbId) {
    const result = await lookup(t.type === "tv" ? "tv" : "movie", tmdbId);
    if (result.status === "error") return null;
    if (result.status === "found") return result.rating;
  }
  return estimateRating(t.genreIds, `${t.title} ${t.overview}`);
}

export async function withRatings<T extends Title>(items: T[]): Promise<T[]> {
  return Promise.all(items.map(async (t) => ({ ...t, ageRating: await ratingOf(t) })));
}

/** Classifica e mantém só o que o perfil pode ver. Conteúdo adulto, 18+ e sem classificação confirmada nunca passam. */
export async function forViewer<T extends Title>(items: T[], viewer: Viewer): Promise<T[]> {
  const rated = await withRatings(items.filter((t) => !t.adult));
  return rated.filter((t) => isAllowed(t.ageRating, viewer.maxRating, viewer.isKids));
}

export type Access =
  | { status: "allowed" | "blocked-for-profile"; rating: RatingInfo }
  | { status: "removed"; rating: RatingInfo | null }
  /** A classificação não pôde ser confirmada agora (falha na consulta): o título fica bloqueado. */
  | { status: "unavailable"; rating: null };

/** Regra de acesso direto a um título (página do título e player). */
export async function accessFor(t: Title, viewer: Viewer): Promise<Access> {
  if (t.adult) return { status: "removed", rating: null };
  const rating = await ratingOf(t);
  if (!rating) return { status: "unavailable", rating: null };
  if (rating.value >= BLOCKED_RATING) return { status: "removed", rating };
  return { status: isAllowed(rating, viewer.maxRating, viewer.isKids) ? "allowed" : "blocked-for-profile", rating };
}
