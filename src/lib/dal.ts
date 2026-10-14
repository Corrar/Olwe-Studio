import "server-only";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { profiles, users } from "@/db/schema";
import { emailEnabled } from "./email";
import { getActiveProfile, getSession } from "./session";
import { verificationRequired } from "./verification";

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: {
      id: true,
      name: true,
      email: true,
      emailVerificationPending: true,
      emailVerifiedAt: true,
      verificationSentAt: true,
      sessionVersion: true,
    },
  });
  // A senha mudou depois que esta sessão foi aberta: ela não vale mais.
  if (!user || user.sessionVersion !== session.sessionVersion) return null;
  return user;
});

/** Conta logada e com o e-mail confirmado (sem confirmação, vai para a tela de confirmação). */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Conta criada quando a confirmação estava ligada, mas o envio foi desligado depois: libera de vez,
  // para não voltar a exigir confirmação (nem ser trocada por um cadastro novo) se o envio voltar.
  if (!emailEnabled() && user.emailVerificationPending) {
    await db.update(users).set({ emailVerificationPending: false }).where(eq(users.id, user.id));
  }
  if (verificationRequired(user)) redirect("/confirm-email");
  return user;
}

export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();
  const active = await getActiveProfile();
  if (!user || !active || verificationRequired(user)) return null;
  const profile = await db.query.profiles.findFirst({
    where: and(eq(profiles.id, active.profileId), eq(profiles.userId, user.id)),
  });
  // Perfil bloqueado só vale com o acesso liberado pelo PIN atual.
  if (!profile || (profile.pinHash && active.lockVersion !== profile.lockVersion)) return null;
  return profile;
});

export async function requireProfile() {
  await requireUser();
  const profile = await getCurrentProfile();
  if (!profile) redirect("/profiles");
  return profile;
}
