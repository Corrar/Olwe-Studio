"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { licensedTitles } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { MOVIE_GENRES } from "@/lib/genres";
import { getTitle as getTmdbTitle, isDemoCatalog } from "@/lib/tmdb";
import { parseVideoLink } from "@/lib/video-link";
import type { FormState } from "./auth";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use até ${max} caracteres.`)
    .transform((v) => v || null);

const imageUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => !v || /^https:\/\//.test(v), "As imagens precisam de um endereço HTTPS.")
  .transform((v) => v || null);

const dateField = z
  .string()
  .trim()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida.");

const schema = z.object({
  title: z.string().trim().min(1, "Informe o título.").max(200),
  originalTitle: optionalText(200),
  overview: z.string().trim().max(4000),
  year: z
    .string()
    .trim()
    .refine((v) => !v || /^(18|19|20)\d{2}$/.test(v), "Ano inválido.")
    .transform((v) => v || null),
  runtime: z
    .string()
    .trim()
    .refine((v) => !v || (/^\d{1,3}$/.test(v) && Number(v) > 0), "Duração em minutos.")
    .transform((v) => (v ? Number(v) : null)),
  tmdbId: z
    .string()
    .trim()
    .refine((v) => !v || /^\d{1,9}$/.test(v), "O ID do TMDB é um número.")
    .transform((v) => (v ? Number(v) : null)),
  poster: imageUrl,
  backdrop: imageUrl,
  ageRating: z.enum(["0", "10", "12", "14", "16"], { error: "Escolha a classificação indicativa." }).transform(Number),
  ratingDescriptors: z.string().trim().max(200),
  videoHeight: z
    .enum(["", "2160", "1080", "720", "480"])
    .transform((v) => (v ? Number(v) : null)),
  tier: z.enum(["free", "premium"]),
  licensor: z.string().trim().min(1, "Informe quem cedeu os direitos.").max(200),
  licenseName: z.string().trim().min(1, "Informe o tipo de licença.").max(120),
  credit: optionalText(500),
  licenseStart: dateField,
  licenseEnd: dateField,
  notes: z.string().trim().max(4000),
});

/** Início do dia no horário de Brasília (o Brasil não tem mais horário de verão). */
const brazilDay = (date: string) => new Date(`${date}T00:00:00-03:00`);

export async function saveLicensedTitle(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const field = (name: string) => String(formData.get(name) ?? "");
  const parsed = schema.safeParse(Object.fromEntries([...Object.keys(schema.shape)].map((k) => [k, field(k)])));
  if (!parsed.success) return { error: parsed.error.issues[0].message, field: String(parsed.error.issues[0].path[0] ?? "") };
  const data = parsed.data;

  const video = parseVideoLink(field("video"));
  if ("error" in video) return { error: video.error, field: "video" };

  const genreIds = formData
    .getAll("genres")
    .map(Number)
    .filter((g) => MOVIE_GENRES[g]);

  const licenseStart = data.licenseStart ? brazilDay(data.licenseStart) : null;
  // A licença vale até o fim do último dia: guarda a meia-noite do dia seguinte.
  const licenseEnd = data.licenseEnd ? new Date(brazilDay(data.licenseEnd).getTime() + 24 * 60 * 60 * 1000) : null;
  if (licenseStart && licenseEnd && licenseEnd <= licenseStart) return { error: "O fim da licença precisa ser depois do início.", field: "licenseEnd" };

  // Com o ID do TMDB, o que ficou em branco vem de lá (pôster oficial, sinopse em português, gêneros).
  let fromTmdb: Awaited<ReturnType<typeof getTmdbTitle>> = null;
  if (data.tmdbId && !isDemoCatalog) {
    fromTmdb = await getTmdbTitle("movie", String(data.tmdbId));
    if (!fromTmdb) return { error: "Não encontrei esse filme no TMDB. Confira o ID.", field: "tmdbId" };
  }

  const values = {
    title: data.title,
    originalTitle: data.originalTitle ?? fromTmdb?.originalTitle ?? null,
    overview: data.overview || fromTmdb?.overview || "",
    year: data.year ?? fromTmdb?.year ?? null,
    runtime: data.runtime ?? fromTmdb?.runtime ?? null,
    genreIds: JSON.stringify(genreIds.length ? genreIds : (fromTmdb?.genreIds ?? []).filter((g) => MOVIE_GENRES[g])),
    poster: data.poster ?? fromTmdb?.poster ?? null,
    backdrop: data.backdrop ?? fromTmdb?.backdrop ?? null,
    tmdbId: data.tmdbId,
    ageRating: data.ageRating,
    ratingDescriptors: data.ratingDescriptors,
    videoKind: video.kind,
    videoUrl: video.value,
    videoHeight: video.kind === "file" ? data.videoHeight : null,
    tier: data.tier,
    licensor: data.licensor,
    licenseName: data.licenseName,
    credit: data.credit,
    licenseStart,
    licenseEnd,
    notes: data.notes,
    published: formData.get("published") === "on",
    updatedAt: new Date(),
  };

  const id = field("id");
  if (id) {
    const updated = await db.update(licensedTitles).set(values).where(eq(licensedTitles.id, id)).returning({ id: licensedTitles.id });
    if (updated.length === 0) return { error: "Este filme não existe mais." };
  } else {
    await db.insert(licensedTitles).values({ id: crypto.randomUUID(), ...values });
  }
  revalidateCatalog();
  redirect("/admin/titles?saved=1");
}

export async function deleteLicensedTitle(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await db.delete(licensedTitles).where(eq(licensedTitles.id, id));
  revalidateCatalog();
  redirect("/admin/titles?deleted=1");
}

function revalidateCatalog() {
  for (const path of ["/admin/titles", "/browse", "/free", "/search"]) revalidatePath(path);
}
