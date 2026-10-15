import type { LicensedTitle } from "@/db/schema";
import { MOVIE_GENRES } from "@/lib/genres";
import { centsInput } from "@/lib/money";
import type { TitleFormValues } from "./title-form";

export const GENRE_OPTIONS = Object.entries(MOVIE_GENRES)
  .map(([id, name]) => [Number(id), name] as [number, string])
  .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));

/** "AAAA-MM-DD" no horário de Brasília. */
const day = (date: Date) => new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

export const EMPTY_VALUES: TitleFormValues = {
  title: "",
  originalTitle: "",
  overview: "",
  year: "",
  runtime: "",
  tmdbId: "",
  poster: "",
  backdrop: "",
  genres: [],
  ageRating: "",
  ratingDescriptors: "",
  video: "",
  videoHeight: "",
  tier: "free",
  licensor: "",
  licenseName: "",
  credit: "",
  licenseStart: "",
  licenseEnd: "",
  notes: "",
  costModel: "none",
  costValue: "",
  revenueShare: "",
  published: false,
};

export function valuesOf(row: LicensedTitle): TitleFormValues {
  let genres: number[] = [];
  try {
    genres = JSON.parse(row.genreIds);
  } catch {
    genres = [];
  }
  return {
    id: row.id,
    title: row.title,
    originalTitle: row.originalTitle ?? "",
    overview: row.overview,
    year: row.year ?? "",
    runtime: row.runtime ? String(row.runtime) : "",
    tmdbId: row.tmdbId ? String(row.tmdbId) : "",
    poster: row.poster ?? "",
    backdrop: row.backdrop ?? "",
    genres,
    ageRating: String(row.ageRating),
    ratingDescriptors: row.ratingDescriptors,
    video:
      row.videoKind === "youtube"
        ? `https://www.youtube.com/watch?v=${row.videoUrl}`
        : row.videoKind === "mux" && row.muxAssetId
          ? `mux:${row.muxAssetId}`
          : row.videoUrl,
    videoHeight: row.videoHeight ? String(row.videoHeight) : "",
    tier: row.tier,
    licensor: row.licensor,
    licenseName: row.licenseName,
    credit: row.credit ?? "",
    licenseStart: row.licenseStart ? day(row.licenseStart) : "",
    // Guardado como a meia-noite seguinte ao último dia.
    licenseEnd: row.licenseEnd ? day(new Date(row.licenseEnd.getTime() - 24 * 60 * 60 * 1000)) : "",
    notes: row.notes,
    costModel: row.costModel,
    costValue: row.costCents ? centsInput(row.costCents) : "",
    revenueShare: row.revenueShare ? String(row.revenueShare) : "",
    published: row.published,
  };
}
