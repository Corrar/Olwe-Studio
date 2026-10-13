/** movie/tv vêm do TMDB (só sinopse e trailer); archive vem do Internet Archive (filme completo). */
export type MediaType = "movie" | "tv" | "archive";

export interface Title {
  id: string;
  type: MediaType;
  title: string;
  overview: string;
  /** URLs completas das imagens. */
  poster: string | null;
  backdrop: string | null;
  year: string | null;
  rating: number;
  genreIds: number[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  photo: string | null;
}

export interface Season {
  number: number;
  name: string;
  episodeCount: number;
  year: string | null;
}

export interface WatchProvider {
  id: number;
  name: string;
  logo: string | null;
}

export interface WatchProviders {
  /** Página do TMDB com os links para cada serviço. */
  link: string | null;
  subscription: WatchProvider[];
  free: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
}

export interface TitleDetails extends Title {
  tagline: string | null;
  genres: { id: number; name: string }[];
  runtime: number | null;
  seasons: Season[];
  cast: CastMember[];
  trailerKey: string | null;
  certification: string | null;
  recommendations: Title[];
  providers: WatchProviders | null;
  /** Só para filmes completos (Internet Archive). */
  videoUrl: string | null;
  sourceUrl: string | null;
  license: string | null;
}

export function isFullMovie(t: Pick<Title, "type">) {
  return t.type === "archive";
}

export function isMediaType(value: string): value is MediaType {
  return value === "movie" || value === "tv" || value === "archive";
}
