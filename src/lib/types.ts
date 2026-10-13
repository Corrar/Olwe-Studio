export type MediaType = "movie" | "tv";

export interface Title {
  id: number;
  type: MediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  year: string | null;
  rating: number;
  genreIds: number[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface Season {
  number: number;
  name: string;
  episodeCount: number;
  year: string | null;
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
}
