import type { Metadata } from "next";
import Link from "next/link";
import { TitleCard } from "@/components/title-card";
import { requireProfile } from "@/lib/dal";
import { getWatchlist } from "@/lib/library";
import { getTitlesByRef } from "@/lib/catalog";

export const metadata: Metadata = { title: "Minha Lista" };

export default async function MyListPage() {
  const profile = await requireProfile();
  const titles = await getTitlesByRef(await getWatchlist(profile.id));

  return (
    <div className="px-4 pt-24 sm:px-10">
      <h1 className="mb-6 font-display text-2xl font-semibold">Minha Lista</h1>
      {titles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">
          <p>Sua lista está vazia.</p>
          <Link href="/browse" className="mt-3 inline-block text-amber hover:underline">
            Descobrir títulos
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {titles.map((t) => (
            <TitleCard key={`${t.type}-${t.id}`} title={t} />
          ))}
        </div>
      )}
    </div>
  );
}
