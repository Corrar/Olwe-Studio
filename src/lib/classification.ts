// Classificação indicativa no padrão brasileiro (ClassInd), o mesmo que Netflix e Prime Video usam no Brasil.
// Sem dependências de servidor: as regras podem ser testadas isoladamente.

export const AGE_RATINGS = [0, 10, 12, 14, 16, 18] as const;
export type AgeRating = (typeof AGE_RATINGS)[number];

/** oficial = classificação brasileira; equivalente = convertida da americana; estimada = regra conservadora do Olwe. */
export type RatingSource = "oficial" | "equivalente" | "estimada";

export interface RatingInfo {
  value: AgeRating;
  source: RatingSource;
  /** Motivos da classificação, quando a fonte informa (ex.: "Violência", "Drogas"). */
  descriptors: string[];
}

/** O Olwe não exibe conteúdo 18+. */
export const BLOCKED_RATING: AgeRating = 18;

/** Limites que um perfil pode escolher. Perfis infantis vão até 12. */
export const PROFILE_LIMITS: AgeRating[] = [0, 10, 12, 14, 16];
export const KIDS_MAX_LIMIT: AgeRating = 12;
export const DEFAULT_ADULT_LIMIT: AgeRating = 16;
export const DEFAULT_KIDS_LIMIT: AgeRating = 10;

export function ratingLabel(value: AgeRating) {
  return value === 0 ? "L" : String(value);
}

export function limitLabel(value: AgeRating) {
  return value === 0 ? "Só livre (L)" : `Até ${value} anos`;
}

/** Cores oficiais do ClassInd. */
export const RATING_COLORS: Record<AgeRating, { bg: string; fg: string }> = {
  0: { bg: "#0c9447", fg: "#ffffff" },
  10: { bg: "#0f7dc2", fg: "#ffffff" },
  12: { bg: "#f8c411", fg: "#111111" },
  14: { bg: "#e67824", fg: "#ffffff" },
  16: { bg: "#db2827", fg: "#ffffff" },
  18: { bg: "#1d1815", fg: "#ffffff" },
};

export function isAgeRating(value: unknown): value is AgeRating {
  return typeof value === "number" && (AGE_RATINGS as readonly number[]).includes(value);
}

/** Classificação brasileira como o TMDB devolve: "L", "AL", "10", "12", "14", "16", "18". */
export function parseBrazilian(cert: unknown): AgeRating | null {
  const c = String(cert ?? "").trim().toUpperCase();
  if (!c) return null;
  if (c === "L" || c === "AL" || c === "LIVRE") return 0;
  const n = Number(c.replace(/^A/, ""));
  return isAgeRating(n) ? n : null;
}

/** Equivalência das classificações americanas (cinema e TV) para o ClassInd. */
const US_EQUIVALENTS: Record<string, AgeRating> = {
  G: 0,
  PG: 10,
  "PG-13": 12,
  R: 16,
  "NC-17": 18,
  "TV-Y": 0,
  "TV-G": 0,
  "TV-Y7": 10,
  "TV-Y7-FV": 10,
  "TV-PG": 10,
  "TV-14": 14,
  "TV-MA": 16,
};

export function parseUs(cert: unknown): AgeRating | null {
  const c = String(cert ?? "").trim().toUpperCase();
  return c in US_EQUIVALENTS ? US_EQUIVALENTS[c] : null;
}

// Gêneros do TMDB que pedem estimativa mais alta.
const MATURE_GENRES = new Set([27, 53, 80, 10752, 10768]); // terror, suspense, crime, guerra, guerra e política

/**
 * Estimativa conservadora para títulos sem classificação oficial nem equivalente:
 * 16 para terror, suspense, crime e guerra; 12 para o resto. Títulos estimados nunca aparecem
 * em perfis infantis.
 */
export function estimateRating(genreIds: number[] = [], text = ""): RatingInfo {
  const mature = genreIds.some((g) => MATURE_GENRES.has(g)) || /\b(horror|terror|thriller|crime|noir|war|guerra|zombie|zumbi)\b/i.test(text);
  return { value: mature ? 16 : 12, source: "estimada", descriptors: [] };
}

/** Temas adultos no título, assuntos ou descrição de filmes das fontes livres: ficam fora do catálogo. */
export const ADULT_CONTENT =
  /\b(sex|sexual|sexo|erotic|erotica|erótico|porn|porno|pornographic|pornografia|xxx|nude|nudes|nudity|nudez|naked|stag film|sexploitation|striptease|burlesque|adults? only|adult film|adult movie|hentai)\b|18\+/i;

/** Regra de visibilidade de um título para um perfil, no estilo Netflix/Prime Video. */
export function isAllowed(rating: RatingInfo | null | undefined, profileLimit: number, isKids: boolean): boolean {
  if (!rating) return false;
  if (rating.value >= BLOCKED_RATING) return false;
  if (rating.value > profileLimit) return false;
  // Perfis infantis só veem títulos com classificação oficial ou equivalente.
  if (isKids && rating.source === "estimada") return false;
  return true;
}

/** Normaliza o limite salvo no perfil, respeitando o teto dos perfis infantis. */
export function clampLimit(value: unknown, isKids: boolean): AgeRating {
  const n = Number(value);
  const limit = isAgeRating(n) && n < BLOCKED_RATING ? n : isKids ? DEFAULT_KIDS_LIMIT : DEFAULT_ADULT_LIMIT;
  return isKids && limit > KIDS_MAX_LIMIT ? KIDS_MAX_LIMIT : limit;
}
