"use server";

import bcrypt from "bcryptjs";
import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { profiles, users } from "@/db/schema";
import { AVATARS, MAX_PROFILES } from "@/lib/avatars";
import { clampLimit } from "@/lib/classification";
import { getCurrentProfile, requireUser } from "@/lib/dal";
import { setActiveProfileId } from "@/lib/session";
import type { FormState } from "./auth";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao perfil.").max(20, "Use até 20 caracteres."),
  avatar: z.enum(AVATARS.map((a) => a.id) as [string, ...string[]]),
  isKids: z.boolean(),
});

export async function createProfile(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  // Como na Netflix, um perfil infantil não cria nem gerencia perfis.
  if ((await getCurrentProfile())?.isKids) return { error: "Perfis infantis não podem criar perfis." };
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
  if ((await getCurrentProfile())?.isKids) return;
  const [{ total }] = await db.select({ total: count() }).from(profiles).where(eq(profiles.userId, user.id));
  if (total <= 1) return;
  await db.delete(profiles).where(and(eq(profiles.id, profileId), eq(profiles.userId, user.id)));
  revalidatePath("/profiles");
}

export type LimitState = { error?: string; saved?: boolean } | undefined;

/**
 * Altera o limite de classificação do perfil (perfis infantis vão no máximo até 12). Como no controle
 * parental da Netflix, pede a senha da conta e não pode ser feito a partir de um perfil infantil.
 */
export async function updateProfileLimit(profileId: string, _: LimitState, formData: FormData): Promise<LimitState> {
  const user = await requireUser();
  if ((await getCurrentProfile())?.isKids) return { error: "Perfis infantis não podem alterar a classificação." };
  const account = await db.query.users.findFirst({ where: eq(users.id, user.id), columns: { passwordHash: true } });
  const password = String(formData.get("password") ?? "");
  if (!account || !password || !(await bcrypt.compare(password, account.passwordHash))) {
    return { error: "Senha da conta incorreta." };
  }
  const profile = await db.query.profiles.findFirst({
    where: and(eq(profiles.id, profileId), eq(profiles.userId, user.id)),
    columns: { id: true, isKids: true },
  });
  if (!profile) return { error: "Perfil não encontrado." };
  const maxRating = clampLimit(formData.get("maxRating"), profile.isKids);
  await db.update(profiles).set({ maxRating }).where(and(eq(profiles.id, profile.id), eq(profiles.userId, user.id)));
  revalidatePath("/profiles/manage");
  return { saved: true };
}
