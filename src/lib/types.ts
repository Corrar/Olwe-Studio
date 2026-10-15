import type { RatingInfo } from "./classification";

/**
 * movie/tv vêm do TMDB (só sinopse e trailer).
 * archive (Internet Archive) e commons (Wikimedia Commons) são filmes completos com licença aberta.
 * licensed são filmes completos com licença própria do Olwe, cadastrados no painel (/admin/titles).
 */
export type MediaType = "movie" | "tv" | "archive" | "commons" | "licensed";

export const MEDIA_TYPES = ["movie", "tv", "archive", "commons", "licensed"] as const;

export type FullMovieSource = "archive" | "commons";

export interface Title {
  id: string;
  type: MediaType;
  title: string;
  /** Título original (TMDB), usado nas regras legais do catálogo. */
  originalTitle?: string | null;
  overview: string;
  /** URLs completas das imagens. */
  poster: string | null;
  backdrop: string | null;
  year: string | null;
  /** Data de lançamento (filmes) ou de estreia (séries), "AAAA-MM-DD". */
  releaseDate?: string | null;
  rating: number;
  genreIds: number[];
  /** Qualidade do vídeo que o Olwe toca (só filmes completos): "4K", "Full HD", "HD" ou "SD". */
  quality?: Quality | null;
  /** Lançado (TMDB) ou adicionado à fonte (filmes completos) recentemente: mostra o selo "Novo". */
  isNew?: boolean;
  /** Classificação indicativa (ClassInd). Preenchida antes de exibir o título a um perfil. */
  ageRating?: RatingInfo | null;
  /** Marcado como adulto pela fonte: nunca é exibido. */
  adult?: boolean;
  /** Filme do TMDB correspondente (filmes completos), usado para buscar a classificação oficial. */
  tmdbMatchId?: number | null;
  /** Não foi possível verificar o filme no TMDB agora (falha na consulta): não é exibido. */
  ratingUnconfirmed?: boolean;
  /** Filme licenciado só para assinantes do Olwe Premium. */
  premiumOnly?: boolean;
}

export type Quality = "4K" | "Full HD" | "HD" | "SD";

/** MIME do HLS (streaming adaptativo: Mux, .m3u8). */
export const HLS_MIME = "application/x-mpegurl";

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

export interface Episode {
  number: number;
  name: string;
  overview: string;
  /** Imagem do episódio (16:9), URL completa. */
  still: string | null;
  /** Duração em minutos. */
  runtime: number | null;
  /** Data de exibição, "AAAA-MM-DD". */
  airDate: string | null;
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
  /** Filme completo publicado no YouTube pelo dono dos direitos (tocado no player do YouTube). */
  youtubeKey?: string | null;
  /** Vídeo no Mux com playback assinado: o player pede um link com token (ver playableSources). */
  signedPlaybackId?: string | null;
}

export function isFullMovie(t: Pick<Title, "type">) {
  return t.type === "archive" || t.type === "commons" || t.type === "licensed";
}

export function isMediaType(value: string): value is MediaType {
  return (MEDIA_TYPES as readonly string[]).includes(value);
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

/** Data de hoje no Brasil, "AAAA-MM-DD", para comparar com datas de lançamento. */
export function todayInBrazil(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
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
