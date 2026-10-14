import "server-only";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { profiles, users } from "@/db/schema";
import { getActiveProfileId, getSessionUserId } from "./session";
import { verificationRequired } from "./verification";

export const getCurrentUser = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, name: true, email: true, emailVerifiedAt: true, verificationSentAt: true },
  });
  return user ?? null;
});

/** Conta logada e com o e-mail confirmado (sem confirmação, vai para a tela de confirmação). */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (verificationRequired(user)) redirect("/confirm-email");
  return user;
}

export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();
  const profileId = await getActiveProfileId();
  if (!user || !profileId || verificationRequired(user)) return null;
  const profile = await db.query.profiles.findFirst({
    where: and(eq(profiles.id, profileId), eq(profiles.userId, user.id)),
  });
  return profile ?? null;
});

export async function requireProfile() {
  await requireUser();
  const profile = await getCurrentProfile();
  if (!profile) redirect("/profiles");
  return profile;
}
