import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { PinForm } from "./pin-form";

export const metadata: Metadata = { title: "Perfil bloqueado" };

export default async function UnlockProfilePage({ params }: PageProps<"/profiles/[id]/unlock">) {
  const user = await requireUser();
  const { id } = await params;
  const profile = await db.query.profiles.findFirst({
    where: and(eq(profiles.id, id), eq(profiles.userId, user.id)),
    columns: { id: true, name: true, avatar: true, pinHash: true },
  });
  if (!profile) notFound();
  if (!profile.pinHash) redirect("/profiles");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <Logo href="/profiles" size={30} />
      <Avatar avatar={profile.avatar} name={profile.name} size={96} />
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">O bloqueio de perfil está ativado</h1>
        <p className="text-muted">Digite o PIN para acessar o perfil {profile.name}.</p>
      </div>
      <PinForm profileId={profile.id} />
      <div className="flex flex-col gap-2 text-sm">
        <Link href="/profiles" className="text-muted hover:text-text">
          Voltar para os perfis
        </Link>
        <Link href="/profiles/manage" className="text-muted hover:text-amber">
          Esqueceu o PIN? Troque em Gerenciar perfis com a senha da conta
        </Link>
      </div>
    </div>
  );
}
