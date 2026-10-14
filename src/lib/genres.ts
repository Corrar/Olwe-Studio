import type { MediaType } from "./types";

export const MOVIE_GENRES: Record<number, string> = {
  28: "Ação",
  12: "Aventura",
  16: "Animação",
  35: "Comédia",
  80: "Crime",
  99: "Documentário",
  18: "Drama",
  10751: "Família",
  14: "Fantasia",
  36: "História",
  27: "Terror",
  10402: "Música",
  9648: "Mistério",
  10749: "Romance",
  878: "Ficção científica",
  53: "Suspense",
  10752: "Guerra",
  37: "Faroeste",
  10770: "Cinema TV",
};

export const TV_GENRES: Record<number, string> = {
  10759: "Ação e aventura",
  16: "Animação",
  35: "Comédia",
  80: "Crime",
  99: "Documentário",
  18: "Drama",
  10751: "Família",
  10762: "Infantil",
  9648: "Mistério",
  10763: "Notícias",
  10764: "Reality",
  10765: "Ficção científica e fantasia",
  10766: "Novela",
  10767: "Talk show",
  10768: "Guerra e política",
  37: "Faroeste",
};

/** Nome do gênero; filmes completos (archive/commons) usam os gêneros de filme. */
export function genreName(type: MediaType, id: number) {
  return (type === "tv" ? TV_GENRES : MOVIE_GENRES)[id] ?? null;
}
