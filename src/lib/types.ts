/**
 * movie/tv vêm do TMDB (só sinopse e trailer).
 * archive (Internet Archive) e commons (Wikimedia Commons) são filmes completos com licença aberta.
 */
export type MediaType = "movie" | "tv" | "archive" | "commons";

export type FullMovieSource = "archive" | "commons";

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
  /** Qualidade do vídeo que o Olwe toca (só filmes completos): "4K", "Full HD", "HD" ou "SD". */
  quality?: Quality | null;
  /** Lançado (TMDB) ou adicionado à fonte (filmes completos) recentemente: mostra o selo "Novo". */
  isNew?: boolean;
}

export type Quality = "4K" | "Full HD" | "HD" | "SD";

export interface VideoSource {
  src: string;
  /** MIME com codecs, para o navegador escolher o primeiro que consegue tocar. */
  type: string;
  height: number | null;
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
  /** Só para filmes completos, em ordem de preferência. */
  videoSources: VideoSource[];
  sourceUrl: string | null;
  /** Nome da fonte exibido nos créditos ("Internet Archive", "Wikimedia Commons"). */
  sourceName: string | null;
  license: string | null;
  /** Nome curto da licença ("CC BY 3.0", "Domínio público"). */
  licenseName: string | null;
  /** Autoria exigida pelas licenças CC BY. */
  credit: string | null;
}

export function isFullMovie(t: Pick<Title, "type">) {
  return t.type === "archive" || t.type === "commons";
}

export function isMediaType(value: string): value is MediaType {
  return value === "movie" || value === "tv" || value === "archive" || value === "commons";
}

/** Prazos do selo "Novo". */
export const NEW_RELEASE_DAYS = 60;
export const NEW_ADDITION_DAYS = 30;

/** Se a data (ISO ou "AAAA-MM-DD hh:mm:ss") caiu nos últimos `days` dias, sem contar datas futuras. */
export function isRecent(date: unknown, days: number, now = Date.now()): boolean {
  if (typeof date !== "string" || !date) return false;
  const time = Date.parse(date.includes("T") || date.length <= 10 ? date : date.replace(" ", "T") + "Z");
  return Number.isFinite(time) && time <= now && now - time <= days * 24 * 60 * 60 * 1000;
}

/** Rótulo de qualidade pela resolução do arquivo que será tocado. */
export function qualityOf(width: number | null | undefined, height: number | null | undefined): Quality | null {
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  if (!w && !h) return null;
  if (w >= 3800 || h >= 2100) return "4K";
  if (w >= 1900 || h >= 1000) return "Full HD";
  if (w >= 1260 || h >= 700) return "HD";
  return "SD";
}
