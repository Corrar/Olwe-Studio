import "server-only";
import { and, desc, eq, gt, isNull, lte, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { licensedTitles, type LicensedTitle } from "@/db/schema";
import { isAgeRating } from "./classification";
import { MOVIE_GENRES } from "./genres";
import { playbackUrl } from "./mux";
import { HLS_MIME, isRecent, NEW_ADDITION_DAYS, qualityOf, type Title, type TitleDetails, type VideoSource } from "./types";

// Catálogo próprio do Olwe: filmes com licença cadastrada no painel. Só entram os publicados e dentro
// da janela da licença, conferida a cada consulta (o filme some sozinho quando o contrato vence).

/** Filtro dos títulos que podem aparecer agora. */
function live(now = new Date()) {
  return and(
    eq(licensedTitles.published, true),
    or(isNull(licensedTitles.licenseStart), lte(licensedTitles.licenseStart, now)),
    or(isNull(licensedTitles.licenseEnd), gt(licensedTitles.licenseEnd, now)),
  );
}

export function isLive(row: Pick<LicensedTitle, "published" | "licenseStart" | "licenseEnd">, now = Date.now()) {
  return row.published && (!row.licenseStart || row.licenseStart.getTime() <= now) && (!row.licenseEnd || row.licenseEnd.getTime() > now);
}

function parseGenres(json: string): number[] {
  try {
    const value = JSON.parse(json);
    return Array.isArray(value) ? value.filter((g): g is number => Number.isInteger(g)) : [];
  } catch {
    return [];
  }
}

/** MIME pela extensão do arquivo, para o navegador saber se consegue tocar. */
export function videoMime(url: string) {
  const path = url.split(/[?#]/)[0].toLowerCase();
  if (path.endsWith(".m3u8")) return HLS_MIME;
  if (path.endsWith(".webm")) return "video/webm";
  if (path.endsWith(".ogv") || path.endsWith(".ogg")) return "video/ogg";
  return "video/mp4";
}

function toTitle(row: LicensedTitle): Title {
  const rating = isAgeRating(row.ageRating) ? row.ageRating : 16;
  return {
    id: row.id,
    type: "licensed",
    title: row.title,
    originalTitle: row.originalTitle,
    overview: row.overview,
    poster: row.poster,
    backdrop: row.backdrop ?? row.poster,
    year: row.year,
    rating: 0,
    genreIds: parseGenres(row.genreIds),
    quality: row.videoKind === "youtube" ? null : qualityOf(null, row.videoHeight),
    isNew: isRecent(row.createdAt.toISOString(), NEW_ADDITION_DAYS),
    // Classificação do próprio Olwe (autoclassificação, como fazem os serviços de streaming no ClassInd).
    ageRating: {
      value: rating,
      source: "oficial",
      descriptors: row.ratingDescriptors
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean),
    },
    premiumOnly: row.tier === "premium",
  };
}

function toDetails(row: LicensedTitle, recommendations: Title[]): TitleDetails {
  const base = toTitle(row);
  // Mux assinado: o endereço com token só é gerado no player (playableSources), nunca nas páginas.
  const videoSources: VideoSource[] =
    row.videoKind === "file"
      ? [{ src: row.videoUrl, type: videoMime(row.videoUrl), height: row.videoHeight }]
      : row.videoKind === "mux"
        ? [{ src: `https://stream.mux.com/${row.videoUrl}.m3u8`, type: HLS_MIME, height: row.videoHeight }]
        : [];
  return {
    ...base,
    tagline: null,
    genres: base.genreIds.map((id) => ({ id, name: MOVIE_GENRES[id] ?? "" })).filter((g) => g.name),
    runtime: row.runtime,
    seasons: [],
    cast: [],
    trailerKey: null,
    certification: base.ageRating!.value === 0 ? "L" : String(base.ageRating!.value),
    recommendations,
    providers: null,
    videoSources,
    youtubeKey: row.videoKind === "youtube" ? row.videoUrl : null,
    signedPlaybackId: row.videoKind === "mux" && row.muxSigned ? row.videoUrl : null,
    sourceUrl: null,
    sourceName: row.licensor,
    license: null,
    licenseName: row.licenseName,
    credit: row.credit,
  };
}

/** Arquivos para o player: no Mux assinado, troca pelo endereço com token temporário. */
export async function playableSources(title: TitleDetails): Promise<VideoSource[]> {
  if (!title.signedPlaybackId) return title.videoSources;
  const src = await playbackUrl(title.signedPlaybackId, true);
  return src ? [{ src, type: HLS_MIME, height: title.videoSources[0]?.height ?? null }] : [];
}

/** Licenciados no ar, os mais recentes primeiro; tier filtra Grátis ou só Premium. */
export async function getLicensedShelf({ tier, limit = 20 }: { tier?: "free" | "premium"; limit?: number } = {}): Promise<Title[]> {
  const rows = await db.query.licensedTitles.findMany({
    where: tier ? and(live(), eq(licensedTitles.tier, tier)) : live(),
    orderBy: desc(licensedTitles.createdAt),
    limit,
  });
  return rows.map(toTitle);
}

export async function getLicensedTitle(id: string): Promise<TitleDetails | null> {
  if (!id || id.length > 100) return null;
  const row = await db.query.licensedTitles.findFirst({ where: and(eq(licensedTitles.id, id), live()) });
  if (!row) return null;
  const others = await db.query.licensedTitles.findMany({
    where: and(live(), ne(licensedTitles.id, id)),
    orderBy: desc(licensedTitles.createdAt),
    limit: 12,
  });
  return toDetails(row, others.map(toTitle));
}

/** Busca por título (o catálogo próprio é pequeno: o filtro roda aqui, sem acentos nem caixa). */
export async function searchLicensed(text: string): Promise<Title[]> {
  const needle = fold(text.trim());
  if (!needle) return [];
  const rows = await db.query.licensedTitles.findMany({ where: live(), orderBy: desc(licensedTitles.createdAt), limit: 500 });
  return rows.filter((r) => fold(`${r.title} ${r.originalTitle ?? ""} ${r.licensor}`).includes(needle)).map(toTitle);
}

const fold = (value: string) =>
  value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
