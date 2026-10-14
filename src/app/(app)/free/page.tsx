import type { Metadata } from "next";
import Link from "next/link";
import { FreeIntro, GridSkeleton, PAGE_TOP, RowSkeleton, RowStack, Streamed, StreamedHero, TitleGrid } from "@/components/catalog-page";
import { TitleRow } from "@/components/title-row";
import { requireProfile } from "@/lib/dal";
import { FREE_SHELVES, getFreeShelf, getFreeShelfPage, KIDS_SHELVES, type FreeShelf } from "@/lib/free";
import { forViewer, viewerOf, type Viewer } from "@/lib/ratings";

export const metadata: Metadata = { title: "Filmes completos" };

const ROW_SIZE = 16;
const MAX_PAGE = 50;

const PAGE_LINK =
  "inline-flex min-h-11 items-center rounded-full bg-white/10 px-5 text-sm font-medium transition hover:bg-white/20 active:scale-[0.97]";

async function Shelf({ shelf, viewer }: { shelf: FreeShelf; viewer: Viewer }) {
  const items = await forViewer(await getFreeShelf(shelf.key, ROW_SIZE), viewer);
  return <TitleRow title={shelf.label} items={items} href={`/free?shelf=${shelf.key}`} />;
}

async function ShelfPage({ shelf, page, viewer }: { shelf: FreeShelf; page: number; viewer: Viewer }) {
  const result = await getFreeShelfPage(shelf.key, page);
  const items = await forViewer(result.items, viewer);
  const hasMore = result.hasMore;
  return (
    <>
      {items.length > 0 ? (
        <TitleGrid items={items} />
      ) : (
        <p className="text-muted">Nenhum filme desta página passou nos filtros de licença e qualidade.</p>
      )}
      {(page > 1 || (hasMore && page < MAX_PAGE)) && (
        <nav aria-label="Páginas" className="mt-10 flex flex-wrap items-center gap-3">
          {page > 1 && (
            <Link href={`/free?shelf=${shelf.key}&page=${page - 1}`} className={PAGE_LINK}>
              ← Anterior
            </Link>
          )}
          <span className="px-1 text-sm text-muted">Página {page}</span>
          {hasMore && page < MAX_PAGE && (
            <Link href={`/free?shelf=${shelf.key}&page=${page + 1}`} className={PAGE_LINK}>
              Mais filmes →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}

export default async function FreeMoviesPage({ searchParams }: PageProps<"/free">) {
  const { shelf: shelfKey, page: pageParam } = await searchParams;
  const viewer = viewerOf(await requireProfile());
  // Perfis infantis só recebem as prateleiras com curadoria infantil (as buscas abertas do Commons não têm).
  const shelves = viewer.isKids ? KIDS_SHELVES : FREE_SHELVES;
  const shelf = shelves.find((s) => s.key === shelfKey);

  // "Ver tudo" de uma prateleira, com paginação.
  if (shelf) {
    const page = Math.max(1, Math.min(MAX_PAGE, Number(pageParam) || 1));
    return (
      <div className={`gutter pb-12 ${PAGE_TOP}`}>
        <Link href="/free" className="inline-flex min-h-9 items-center text-sm text-muted transition hover:text-amber">
          ← Filmes completos
        </Link>
        <h1 className="mb-6 mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">{shelf.label}</h1>
        <Streamed key={page} fallback={<GridSkeleton />}>
          <ShelfPage shelf={shelf} page={page} viewer={viewer} />
        </Streamed>
      </div>
    );
  }

  return (
    <>
      <StreamedHero load={async () => forViewer(await getFreeShelf(shelves[0].key, 8), viewer)} />
      <RowStack>
        <FreeIntro />
        {shelves.map((s) => (
          <Streamed key={s.key} fallback={<RowSkeleton label={s.label} />}>
            <Shelf shelf={s} viewer={viewer} />
          </Streamed>
        ))}
      </RowStack>
    </>
  );
}
