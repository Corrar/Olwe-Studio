import "server-only";
import { notFound } from "next/navigation";
import { getCurrentProfile, requireUser } from "./dal";

// Painel do catálogo: só as contas listadas em ADMIN_EMAILS (separadas por vírgula), com e-mail
// confirmado e num perfil adulto. Para os demais, as páginas do painel não existem (404).

function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string) {
  return adminEmails().includes(email.trim().toLowerCase());
}

export async function requireAdmin() {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  if (!isAdminEmail(user.email) || !profile || profile.isKids) notFound();
  return user;
}
