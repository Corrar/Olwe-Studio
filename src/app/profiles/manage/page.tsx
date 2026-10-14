import type { Metadata } from "next";
import Link from "next/link";
import { ViewTransition } from "react";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AddProfileTile, Avatar, PROFILE_FRAME, PROFILE_NAME, PROFILE_TILE } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { MAX_PROFILES } from "@/lib/avatars";
import { getCurrentProfile, requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Gerenciar perfis" };

export default async function ManageProfilesPage() {
  const user = await requireUser();
  // Perfis infantis não gerenciam perfis (como na Netflix).
  if ((await getCurrentProfile())?.isKids) redirect("/profiles");
  const list = await db.query.profiles.findMany({
    where: eq(profiles.userId, user.id),
    orderBy: profiles.createdAt,
    columns: { id: true, name: true, avatar: true, isKids: true, pinHash: true },
  });

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

      <main className="gutter flex flex-1 flex-col items-center justify-center pt-4 pb-14 text-center [@media(max-height:31rem)]:pt-0 [@media(max-height:31rem)]:pb-6">
        <h1 className="animate-fade-up font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl [@media(max-height:31rem)]:text-2xl">
          Gerenciar perfis
        </h1>
        <p className="mt-3 max-w-md animate-fade-up text-balance text-muted [animation-delay:60ms] [@media(max-height:31rem)]:hidden">
          Escolha um perfil para mudar o nome, o avatar, a classificação indicativa ou o bloqueio.
        </p>

        <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-8 sm:mt-12 sm:gap-x-8 xl:gap-x-10 3xl:gap-x-12 [@media(max-height:31rem)]:mt-5 [@media(max-height:31rem)]:gap-y-4">
          {list.map((p, i) => (
            <li key={p.id} className={`${PROFILE_TILE} animate-fade-up`} style={{ animationDelay: `${120 + i * 70}ms` }}>
              <Link href={`/profiles/${p.id}/edit`} className="group flex flex-col items-center gap-3 rounded-2xl focus-visible:outline-none!">
                <span className={PROFILE_FRAME}>
                  {/* Mesmo nome na tela de edição: o avatar viaja da grade até lá. */}
                  <ViewTransition name={`avatar-${p.id}`} share="auto" default="none">
                    <Avatar avatar={p.avatar} className="size-full" />
                  </ViewTransition>
                  <span className="absolute inset-0 grid place-items-center rounded-[22%] bg-ink/50 transition-colors duration-300 group-hover:bg-ink/30 group-focus-visible:bg-ink/30">
                    <span className="grid size-[30%] place-items-center rounded-full border-2 border-text/85 bg-ink/40 text-text backdrop-blur-sm transition-transform duration-300 ease-out-expo group-hover:scale-110">
                      <Icon name="pencil" className="size-1/2" />
                    </span>
                  </span>
                </span>
                <span className="flex max-w-full flex-col items-center gap-1">
                  <span className={PROFILE_NAME}>
                    <span className="sr-only">Editar perfil </span>
                    {p.name}
                  </span>
                  {(p.isKids || p.pinHash) && (
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      {p.isKids && <span className="rounded-full bg-amber/15 px-2 py-0.5 font-semibold text-amber">Infantil</span>}
                      {p.pinHash && (
                        <span role="img" aria-label="Perfil bloqueado" title="Perfil bloqueado" className="grid size-6 place-items-center">
                          <Icon name="lock" size={16} />
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
          {list.length < MAX_PROFILES && <AddProfileTile delay={120 + list.length * 70} />}
        </ul>

        <Link
          href="/profiles"
          className="bg-brand mt-12 inline-flex min-h-12 animate-fade-in items-center rounded-full px-10 font-semibold text-ink transition hover:brightness-110 active:scale-[0.98] [animation-delay:400ms] sm:mt-14 [@media(max-height:31rem)]:mt-5"
        >
          Concluído
        </Link>
      </main>
    </div>
  );
}
