import type { Metadata } from "next";
import Link from "next/link";
import { PAGE_TOP, TitleGrid } from "@/components/catalog-page";
import { Icon } from "@/components/icons";
import { getTitlesByRef } from "@/lib/catalog";
import { requireProfile } from "@/lib/dal";
import { getWatchlist } from "@/lib/library";
import { forViewer, viewerOf } from "@/lib/ratings";

export const metadata: Metadata = { title: "Minha Lista" };

export default async function MyListPage() {
  const profile = await requireProfile();
  const titles = await forViewer(await getTitlesByRef(await getWatchlist(profile.id)), viewerOf(profile));

  return (
    <div className={`gutter pb-12 ${PAGE_TOP}`}>
      <div className="mb-6 flex items-baseline gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Minha Lista</h1>
        {titles.length > 0 && (
          <span className="text-sm text-muted">
            {titles.length} {titles.length === 1 ? "título" : "títulos"}
          </span>
        )}
      </div>
      {titles.length === 0 ? (
        <div className="mx-auto flex max-w-md animate-fade-up flex-col items-center rounded-3xl border border-dashed border-line px-6 py-12 text-center sm:py-16">
          <span className="mb-5 grid size-16 place-items-center rounded-full bg-surface-2 text-amber ring-1 ring-white/5">
            <Icon name="list" size={30} />
          </span>
          <p className="font-display text-lg font-semibold">Sua lista está vazia.</p>
          <p className="mt-2 text-sm text-muted">Guarde filmes e séries para assistir depois: eles aparecem aqui, em qualquer aparelho.</p>
          <Link
            href="/browse"
            className="bg-brand mt-6 inline-flex min-h-11 items-center gap-2 rounded-full px-6 font-semibold text-ink shadow-lg shadow-ember/20 transition hover:brightness-110 active:scale-[0.97]"
          >
            <Icon name="sparkles" size={18} />
            Descobrir títulos
          </Link>
        </div>
      ) : (
        <TitleGrid items={titles} />
      )}
    </div>
  );
}
