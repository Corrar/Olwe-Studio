import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HeroSection } from "@/components/hero-section";
import { TitleCard } from "@/components/title-card";
import { TitleRow } from "@/components/title-row";
import { FREE_SHELVES, getFreeShelf, type FreeShelf } from "@/lib/free";

export const metadata: Metadata = { title: "Filmes completos" };

const PAGE_SIZE = 40;
const ROW_SIZE = 16;

async function Shelf({ shelf }: { shelf: FreeShelf }) {
  const items = await getFreeShelf(shelf.key, ROW_SIZE);
  return <TitleRow title={shelf.label} items={items} href={`/free?shelf=${shelf.key}`} />;
}

async function Featured() {
  return <HeroSection items={await getFreeShelf(FREE_SHELVES[0].key, 5)} />;
}

function RowSkeleton({ label }: { label: string }) {
  return (
    <section className="px-4 sm:px-10" aria-busy="true">
      <h2 className="mb-3 font-display text-lg font-semibold text-muted sm:text-xl">{label}</h2>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="aspect-[2/3] w-36 shrink-0 animate-pulse rounded-lg bg-surface-2 sm:w-44 lg:w-48" />
        ))}
      </div>
    </section>
  );
}

export default async function FreeMoviesPage({ searchParams }: PageProps<"/free">) {
  const { shelf: shelfKey, page: pageParam } = await searchParams;
  const shelf = FREE_SHELVES.find((s) => s.key === shelfKey);

  // "Ver tudo" de uma prateleira, com paginação.
  if (shelf) {
    const page = Math.max(1, Math.min(50, Number(pageParam) || 1));
    const items = await getFreeShelf(shelf.key, PAGE_SIZE, page);
    return (
      <div className="px-4 pt-24 sm:px-10">
        <Link href="/free" className="text-sm text-muted hover:text-amber">
          ← Filmes completos
        </Link>
        <h1 className="mb-6 mt-2 font-display text-2xl font-semibold">{shelf.label}</h1>
        <div className="flex flex-wrap gap-4">
          {items.map((t) => (
            <TitleCard key={t.id} title={t} />
          ))}
        </div>
        {items.length === 0 && <p className="text-muted">Nenhum filme encontrado nesta página.</p>}
        <div className="mt-8 flex gap-3">
          {page > 1 && (
            <Link href={`/free?shelf=${shelf.key}&page=${page - 1}`} className="rounded-full bg-white/10 px-5 py-2 text-sm hover:bg-white/20">
              ← Anterior
            </Link>
          )}
          {items.length > 0 && (
            <Link href={`/free?shelf=${shelf.key}&page=${page + 1}`} className="rounded-full bg-white/10 px-5 py-2 text-sm hover:bg-white/20">
              Mais filmes →
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={<div className="h-[68vh] min-h-[420px] w-full animate-pulse bg-surface" />}>
        <Featured />
      </Suspense>
      <div className="-mt-10 relative space-y-10">
        <p className="px-4 text-sm text-muted sm:px-10">
          Filmes inteiros, grátis e sem anúncios, só de fontes com licença aberta (domínio público ou Creative Commons):
          vídeos em HD do Wikimedia Commons e clássicos do Internet Archive. Cada card mostra a qualidade do vídeo.
        </p>
        {FREE_SHELVES.map((s) => (
          <Suspense key={s.key} fallback={<RowSkeleton label={s.label} />}>
            <Shelf shelf={s} />
          </Suspense>
        ))}
      </div>
    </>
  );
}
