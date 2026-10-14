"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { AVATARS, MAX_PROFILES } from "@/lib/avatars";
import { clampLimit } from "@/lib/classification";
import { requireUser } from "@/lib/dal";
import { setActiveProfileId } from "@/lib/session";
import type { FormState } from "./auth";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao perfil.").max(20, "Use até 20 caracteres."),
  avatar: z.enum(AVATARS.map((a) => a.id) as [string, ...string[]]),
  isKids: z.boolean(),
});

export async function createProfile(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    avatar: formData.get("avatar") ?? "ember",
    isKids: formData.get("isKids") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [{ total }] = await db.select({ total: count() }).from(profiles).where(eq(profiles.userId, user.id));
  if (total >= MAX_PROFILES) return { error: `Limite de ${MAX_PROFILES} perfis atingido.` };

  const maxRating = clampLimit(formData.get("maxRating") ?? (parsed.data.isKids ? 10 : 16), parsed.data.isKids);
  await db.insert(profiles).values({ id: crypto.randomUUID(), userId: user.id, ...parsed.data, maxRating });
  revalidatePath("/profiles");
  redirect("/profiles");
}

export async function selectProfile(profileId: string) {
  const user = await requireUser();
  const profile = await db.query.profiles.findFirst({
    where: and(eq(profiles.id, profileId), eq(profiles.userId, user.id)),
    columns: { id: true },
  });
  if (!profile) redirect("/profiles");
  await setActiveProfileId(profile.id);
  redirect("/browse");
}

export async function deleteProfile(profileId: string) {
  const user = await requireUser();
  const [{ total }] = await db.select({ total: count() }).from(profiles).where(eq(profiles.userId, user.id));
  if (total <= 1) return;
  await db.delete(profiles).where(and(eq(profiles.id, profileId), eq(profiles.userId, user.id)));
  revalidatePath("/profiles");
}

/** Altera o limite de classificação do perfil (perfis infantis vão no máximo até 12). */
export async function updateProfileLimit(profileId: string, formData: FormData) {
  const user = await requireUser();
  const profile = await db.query.profiles.findFirst({
    where: and(eq(profiles.id, profileId), eq(profiles.userId, user.id)),
    columns: { id: true, isKids: true },
  });
  if (!profile) return;
  const maxRating = clampLimit(formData.get("maxRating"), profile.isKids);
  await db.update(profiles).set({ maxRating }).where(and(eq(profiles.id, profile.id), eq(profiles.userId, user.id)));
  revalidatePath("/profiles/manage");
}
