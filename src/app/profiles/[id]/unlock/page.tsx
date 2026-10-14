import type { Metadata } from "next";
import Link from "next/link";
import { ViewTransition } from "react";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
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
    <div className="pb-safe relative isolate flex min-h-dvh flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgb(255_106_61/0.14),transparent_70%)]"
      />
      <header className="pt-safe">
        <div className="gutter flex h-16 items-center sm:h-20 [@media(max-height:31rem)]:h-12">
          <Logo href="/profiles" size={28} />
        </div>
      </header>

      <main className="gutter flex flex-1 flex-col items-center justify-center gap-7 pt-4 pb-14 text-center [@media(max-height:31rem)]:gap-4 [@media(max-height:31rem)]:pt-0 [@media(max-height:31rem)]:pb-6">
        <div className="relative animate-fade-up">
          {/* Mesmo nome da grade de perfis: o avatar escolhido viaja até aqui. */}
          <ViewTransition name={`avatar-${profile.id}`} share="auto" default="none">
            <Avatar avatar={profile.avatar} className="size-24 shadow-xl shadow-black/40 sm:size-28 [@media(max-height:31rem)]:size-16" />
          </ViewTransition>
          <span className="absolute -bottom-2 -right-2 grid size-9 place-items-center rounded-full border-2 border-ink bg-surface-2 text-amber">
            <Icon name="lock" size={16} />
          </span>
        </div>
        <div className="animate-fade-up space-y-2 [animation-delay:60ms]">
          <h1 className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl">O bloqueio de perfil está ativado</h1>
          <p className="text-muted">
            Digite o PIN para acessar o perfil <span className="font-semibold text-text">{profile.name}</span>.
          </p>
        </div>
        <div className="flex w-full animate-fade-up justify-center [animation-delay:120ms]">
          <PinForm profileId={profile.id} />
        </div>
        <nav aria-label="Outras opções" className="flex animate-fade-in flex-col items-center gap-1 text-sm [animation-delay:240ms]">
          <Link
            href={`/profiles/${profile.id}/edit?secao=bloqueio#bloqueio`}
            className="rounded-full px-3 py-2 text-muted transition-colors hover:text-amber"
          >
            Esqueceu o PIN? <span className="text-text underline-offset-4 hover:underline">Troque com a senha da conta</span>
          </Link>
          <Link
            href="/profiles"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-muted transition-colors hover:text-text"
          >
            <Icon name="arrow-left" size={16} />
            Voltar para os perfis
          </Link>
        </nav>
      </main>
    </div>
  );
}
