import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { deleteProfile, updateProfileLimit } from "@/app/actions/profiles";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { clampLimit, KIDS_MAX_LIMIT, limitLabel, PROFILE_LIMITS } from "@/lib/classification";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Gerenciar perfis" };

export default async function ManageProfilesPage() {
  const user = await requireUser();
  const list = await db.query.profiles.findMany({ where: eq(profiles.userId, user.id), orderBy: profiles.createdAt });

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center gap-8 px-4 py-16">
      <Logo href="/profiles" size={30} />
      <h1 className="font-display text-3xl font-semibold">Gerenciar perfis</h1>
      <ul className="w-full divide-y divide-line rounded-2xl border border-line bg-surface">
        {list.map((p) => (
          <li key={p.id} className="flex items-center gap-4 p-4">
            <Avatar avatar={p.avatar} name={p.name} size={44} />
            <div className="flex-1">
              <p className="font-medium">{p.name}</p>
              {p.isKids && <p className="text-xs text-amber">Infantil</p>}
              <form action={updateProfileLimit.bind(null, p.id)} className="mt-2 flex items-center gap-2">
                <label className="sr-only" htmlFor={`limit-${p.id}`}>
                  Classificação máxima de {p.name}
                </label>
                <select
                  id={`limit-${p.id}`}
                  name="maxRating"
                  defaultValue={clampLimit(p.maxRating, p.isKids)}
                  className="rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs focus:border-amber focus:outline-none"
                >
                  {PROFILE_LIMITS.filter((l) => !p.isKids || l <= KIDS_MAX_LIMIT).map((l) => (
                    <option key={l} value={l}>
                      {limitLabel(l)}
                    </option>
                  ))}
                </select>
                <button className="rounded-lg px-2 py-1 text-xs text-amber hover:bg-amber/10">Salvar</button>
              </form>
            </div>
            {list.length > 1 && (
              <form action={deleteProfile.bind(null, p.id)}>
                <button className="rounded-full px-4 py-1.5 text-sm text-muted hover:bg-ember/15 hover:text-ember">Excluir</button>
              </form>
            )}
          </li>
        ))}
      </ul>
      <Link href="/profiles" className="bg-brand rounded-full px-8 py-3 font-semibold text-ink">
        Concluído
      </Link>
    </div>
  );
}
