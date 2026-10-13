import type { Metadata } from "next";
import Link from "next/link";
import { HeroSection } from "@/components/hero-section";
import { TitleCard } from "@/components/title-card";
import { TitleRow } from "@/components/title-row";
import { ARCHIVE_SHELVES, getArchiveShelf } from "@/lib/archive";

export const metadata: Metadata = { title: "Filmes completos" };

const PAGE_SIZE = 48;

export default async function FreeMoviesPage({ searchParams }: PageProps<"/free">) {
  const { shelf: shelfKey, page: pageParam } = await searchParams;
  const shelf = ARCHIVE_SHELVES.find((s) => s.key === shelfKey);

  // Página "ver tudo" de uma prateleira, com paginação.
  if (shelf) {
    const page = Math.max(1, Number(pageParam) || 1);
    const { items } = await getArchiveShelf(shelf, PAGE_SIZE, page);
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

  const shelves = await Promise.all(ARCHIVE_SHELVES.map((s) => getArchiveShelf(s)));
  return (
    <>
      <HeroSection items={shelves[0].items} />
      <div className="-mt-10 relative space-y-10">
        <p className="px-4 text-sm text-muted sm:px-10">
          Filmes inteiros, grátis e sem anúncios: clássicos em domínio público ou com licença Creative Commons, vindos do
          Internet Archive.
        </p>
        {ARCHIVE_SHELVES.map((s, i) => (
          <TitleRow key={s.key} title={s.label} items={shelves[i].items} href={`/free?shelf=${s.key}`} />
        ))}
      </div>
    </>
  );
}
