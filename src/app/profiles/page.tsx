import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { selectProfile } from "@/app/actions/profiles";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { MAX_PROFILES } from "@/lib/avatars";
import { clampLimit, limitLabel } from "@/lib/classification";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Quem está assistindo?" };

export default async function ProfilesPage() {
  const user = await requireUser();
  const list = await db.query.profiles.findMany({ where: eq(profiles.userId, user.id), orderBy: profiles.createdAt });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 px-4 py-16">
      <Logo href="/profiles" size={34} />
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Quem está assistindo?</h1>
      <ul className="flex flex-wrap justify-center gap-6">
        {list.map((p) => (
          <li key={p.id}>
            <form action={selectProfile.bind(null, p.id)}>
              <button className="group flex w-28 flex-col items-center gap-3">
                <span className="rounded-2xl ring-2 ring-transparent transition group-hover:ring-amber">
                  <Avatar avatar={p.avatar} name={p.name} size={112} />
                </span>
                <span className="flex items-center gap-1 text-muted group-hover:text-text">
                  {p.name}
                  {p.pinHash && (
                    <span aria-label="Perfil bloqueado" title="Perfil bloqueado">
                      🔒
                    </span>
                  )}
                </span>
                <span className="-mt-2 text-xs text-muted">
                  {p.isKids && <span className="text-amber">Infantil · </span>}
                  {limitLabel(clampLimit(p.maxRating, p.isKids))}
                </span>
              </button>
            </form>
          </li>
        ))}
        {list.length < MAX_PROFILES && (
          <li>
            <Link href="/profiles/new" className="group flex w-28 flex-col items-center gap-3">
              <span className="flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-dashed border-line text-4xl text-muted transition group-hover:border-amber group-hover:text-amber">
                +
              </span>
              <span className="text-muted group-hover:text-text">Novo perfil</span>
            </Link>
          </li>
        )}
      </ul>
      <Link href="/profiles/manage" className="rounded-full border border-line px-6 py-2 text-sm text-muted hover:border-text hover:text-text">
        Gerenciar perfis
      </Link>
    </div>
  );
}
