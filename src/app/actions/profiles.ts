"use server";

import bcrypt from "bcryptjs";
import { and, count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { profiles, users } from "@/db/schema";
import { AVATARS, MAX_PROFILES } from "@/lib/avatars";
import { clampLimit, DEFAULT_KIDS_LIMIT } from "@/lib/classification";
import { getCurrentProfile, requireUser } from "@/lib/dal";
import { clearActiveProfile, setActiveProfileId } from "@/lib/session";
import type { FormState } from "./auth";

/** Resultado dos formulários de perfil (limite, bloqueio, PIN). */
export type ProfileFormState = { error?: string; saved?: boolean } | undefined;

const profileSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao perfil.").max(20, "Use até 20 caracteres."),
  avatar: z.enum(AVATARS.map((a) => a.id) as [string, ...string[]]),
  isKids: z.boolean(),
});

/** Confere a senha da conta, exigida (como no controle parental da Netflix) para liberar mais conteúdo. */
async function passwordMatches(userId: string, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!password) return false;
  const account = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { passwordHash: true } });
  return !!account && (await bcrypt.compare(password, account.passwordHash));
}

/** Perfis infantis não criam, alteram nem excluem perfis. */
async function activeIsKids() {
  return (await getCurrentProfile())?.isKids === true;
}

export async function createProfile(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (await activeIsKids()) return { error: "Perfis infantis não podem criar perfis." };
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    avatar: formData.get("avatar") ?? "ember",
    isKids: formData.get("isKids") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [{ total }] = await db.select({ total: count() }).from(profiles).where(eq(profiles.userId, user.id));
  if (total >= MAX_PROFILES) return { error: `Limite de ${MAX_PROFILES} perfis atingido.` };

  const maxRating = clampLimit(formData.get("maxRating") ?? (parsed.data.isKids ? 10 : 16), parsed.data.isKids);
  // Um perfil com mais conteúdo que o infantil padrão só é criado com a senha da conta (senão o
  // limite de classificação dos outros perfis seria contornado criando um perfil novo).
  if ((!parsed.data.isKids || maxRating > DEFAULT_KIDS_LIMIT) && !(await passwordMatches(user.id, formData))) {
    return { error: "Confirme a senha da conta para criar um perfil com esse limite." };
  }
  await db.insert(profiles).values({ id: crypto.randomUUID(), userId: user.id, ...parsed.data, maxRating });
  revalidatePath("/profiles");
  redirect("/profiles");
}

export async function selectProfile(profileId: string) {
  const user = await requireUser();
  const profile = await db.query.profiles.findFirst({
    where: and(eq(profiles.id, profileId), eq(profiles.userId, user.id)),
    columns: { id: true, pinHash: true },
  });
  if (!profile) redirect("/profiles");
  // Perfil bloqueado: sai do perfil atual e pede o PIN antes de entrar.
  if (profile.pinHash) {
    await clearActiveProfile();
    redirect(`/profiles/${profile.id}/unlock`);
  }
  await setActiveProfileId(profile.id);
  redirect("/browse");
}

/** "Trocar perfil": sai do perfil ativo e volta para a escolha de perfis. */
export async function leaveProfile() {
  await clearActiveProfile();
  redirect("/profiles");
}

/** Chamado ao abrir a escolha de perfis: um perfil bloqueado não continua aberto por trás dela. */
export async function forgetActiveProfile() {
  await clearActiveProfile();
}

// Depois de 5 PINs errados seguidos, o PIN fica travado por 15 minutos.
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MINUTES = 15;

/** Entra num perfil bloqueado com o PIN. */
export async function unlockProfile(profileId: string, _: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();
  const profile = await db.query.profiles.findFirst({
    where: and(eq(profiles.id, profileId), eq(profiles.userId, user.id)),
    columns: { id: true, pinHash: true, lockVersion: true, pinLockedUntil: true },
  });
  if (!profile) redirect("/profiles");
  if (!profile.pinHash) {
    await setActiveProfileId(profile.id);
    redirect("/browse");
  }
  if (profile.pinLockedUntil && profile.pinLockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((profile.pinLockedUntil.getTime() - Date.now()) / 60_000);
    return { error: `Muitas tentativas erradas. Tente de novo em ${minutes} min ou troque o PIN com a senha da conta.` };
  }
  const pin = String(formData.get("pin") ?? "");
  if (!(/^\d{4}$/.test(pin) && (await bcrypt.compare(pin, profile.pinHash)))) {
    // Conta a tentativa no banco de forma atômica (vale entre instâncias) e trava ao chegar no limite.
    const [row] = await db
      .update(profiles)
      .set({ pinFailedAttempts: sql`${profiles.pinFailedAttempts} + 1` })
      .where(eq(profiles.id, profile.id))
      .returning({ attempts: profiles.pinFailedAttempts });
    if ((row?.attempts ?? 0) >= MAX_PIN_ATTEMPTS) {
      await db
        .update(profiles)
        .set({ pinFailedAttempts: 0, pinLockedUntil: new Date(Date.now() + PIN_LOCKOUT_MINUTES * 60_000) })
        .where(eq(profiles.id, profile.id));
      return { error: `Muitas tentativas erradas. O PIN ficou travado por ${PIN_LOCKOUT_MINUTES} minutos.` };
    }
    return { error: `PIN incorreto. Restam ${MAX_PIN_ATTEMPTS - (row?.attempts ?? 0)} tentativas.` };
  }
  await db.update(profiles).set({ pinFailedAttempts: 0, pinLockedUntil: null }).where(eq(profiles.id, profile.id));
  await setActiveProfileId(profile.id, profile.lockVersion);
  redirect("/browse");
}

/** Exclui um perfil. Pede a senha da conta, como as outras mudanças de perfil. */
export async function deleteProfile(profileId: string, _: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();
  if (await activeIsKids()) return { error: "Perfis infantis não podem excluir perfis." };
  if (!(await passwordMatches(user.id, formData))) return { error: "Senha da conta incorreta." };
  const [{ total }] = await db.select({ total: count() }).from(profiles).where(eq(profiles.userId, user.id));
  if (total <= 1) return { error: "A conta precisa de pelo menos um perfil." };
  await db.delete(profiles).where(and(eq(profiles.id, profileId), eq(profiles.userId, user.id)));
  revalidatePath("/profiles");
  revalidatePath("/profiles/manage");
  return { saved: true };
}

async function ownProfile(userId: string, profileId: string) {
  return db.query.profiles.findFirst({
    where: and(eq(profiles.id, profileId), eq(profiles.userId, userId)),
    columns: { id: true, isKids: true },
  });
}

/**
 * Altera o limite de classificação do perfil (perfis infantis vão no máximo até 12). Como no controle
 * parental da Netflix, pede a senha da conta e não pode ser feito a partir de um perfil infantil.
 */
export async function updateProfileLimit(profileId: string, _: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();
  if (await activeIsKids()) return { error: "Perfis infantis não podem alterar a classificação." };
  if (!(await passwordMatches(user.id, formData))) return { error: "Senha da conta incorreta." };
  const profile = await ownProfile(user.id, profileId);
  if (!profile) return { error: "Perfil não encontrado." };
  const maxRating = clampLimit(formData.get("maxRating"), profile.isKids);
  await db.update(profiles).set({ maxRating }).where(and(eq(profiles.id, profile.id), eq(profiles.userId, user.id)));
  revalidatePath("/profiles/manage");
  return { saved: true };
}

/** Ativa, troca ou remove o bloqueio de perfil (PIN de 4 dígitos). Pede a senha da conta. */
export async function updateProfileLock(profileId: string, _: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();
  if (await activeIsKids()) return { error: "Perfis infantis não podem alterar o bloqueio." };
  if (!(await passwordMatches(user.id, formData))) return { error: "Senha da conta incorreta." };
  const profile = await ownProfile(user.id, profileId);
  if (!profile) return { error: "Perfil não encontrado." };

  let pinHash: string | null = null;
  if (formData.get("intent") !== "remove") {
    const pin = String(formData.get("pin") ?? "");
    if (!/^\d{4}$/.test(pin)) return { error: "O PIN precisa ter 4 números." };
    pinHash = await bcrypt.hash(pin, 10);
  }
  // Nova versão do bloqueio: quem já tinha entrado com o PIN antigo volta para a escolha de perfis.
  await db
    .update(profiles)
    .set({ pinHash, lockVersion: sql`${profiles.lockVersion} + 1`, pinFailedAttempts: 0, pinLockedUntil: null })
    .where(and(eq(profiles.id, profile.id), eq(profiles.userId, user.id)));
  revalidatePath("/profiles");
  revalidatePath("/profiles/manage");
  return { saved: true };
}
