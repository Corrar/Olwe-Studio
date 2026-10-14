import type { Metadata } from "next";
import Link from "next/link";
import { ViewTransition } from "react";
import { eq } from "drizzle-orm";
import { selectProfile } from "@/app/actions/profiles";
import { AddProfileTile, Avatar, PROFILE_FRAME, PROFILE_NAME, PROFILE_TILE } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { MAX_PROFILES } from "@/lib/avatars";
import { clampLimit, limitLabel } from "@/lib/classification";
import { requireUser } from "@/lib/dal";
import { ForgetActiveProfile } from "./forget-active-profile";

export const metadata: Metadata = { title: "Quem está assistindo?" };

export default async function ProfilesPage() {
  const user = await requireUser();
  const list = await db.query.profiles.findMany({
    where: eq(profiles.userId, user.id),
    orderBy: profiles.createdAt,
    columns: { id: true, name: true, avatar: true, isKids: true, maxRating: true, pinHash: true },
  });

  return (
    <div className="pb-safe relative isolate flex min-h-dvh flex-col">
      <ForgetActiveProfile />
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
          Quem está assistindo?
        </h1>

        <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-8 sm:mt-14 sm:gap-x-8 xl:gap-x-10 3xl:gap-x-12 [@media(max-height:31rem)]:mt-5 [@media(max-height:31rem)]:gap-y-4">
          {list.map((p, i) => (
            <li key={p.id} className={`${PROFILE_TILE} animate-fade-up`} style={{ animationDelay: `${80 + i * 70}ms` }}>
              {/* data-intro-next: depois de escolher o perfil, a vinheta toca de novo, com som, no catálogo. */}
              <form action={selectProfile.bind(null, p.id)} data-intro-next>
                <button className="group flex w-full flex-col items-center gap-3 rounded-2xl focus-visible:outline-none!">
                  <span className={PROFILE_FRAME}>
                    {/* O avatar viaja entre as telas de perfil (gerenciar, editar, PIN). */}
                    <ViewTransition name={`avatar-${p.id}`} share="auto" default="none">
                      <Avatar avatar={p.avatar} className="size-full" />
                    </ViewTransition>
                    {p.pinHash && (
                      <span
                        role="img"
                        aria-label="Perfil bloqueado"
                        title="Perfil bloqueado"
                        className="absolute bottom-[6%] right-[6%] grid size-[22%] place-items-center rounded-full bg-ink/75 text-text shadow-md shadow-black/40 backdrop-blur-sm"
                      >
                        <Icon name="lock" className="size-1/2" />
                      </span>
                    )}
                  </span>
                  <span className="flex max-w-full flex-col items-center gap-1">
                    <span className={PROFILE_NAME}>{p.name}</span>
                    <span className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-muted">
                      {p.isKids && <span className="rounded-full bg-amber/15 px-2 py-0.5 font-semibold text-amber">Infantil</span>}
                      {limitLabel(clampLimit(p.maxRating, p.isKids))}
                    </span>
                  </span>
                </button>
              </form>
            </li>
          ))}
          {list.length < MAX_PROFILES && <AddProfileTile delay={80 + list.length * 70} />}
        </ul>

        <Link
          href="/profiles/manage"
          className="mt-12 inline-flex min-h-11 animate-fade-in items-center gap-2 rounded-full border border-muted/40 px-6 text-sm text-muted transition-colors [animation-delay:400ms] hover:border-text hover:text-text sm:mt-16 [@media(max-height:31rem)]:mt-5"
        >
          <Icon name="pencil" size={16} />
          Gerenciar perfis
        </Link>
      </main>
    </div>
  );
}
