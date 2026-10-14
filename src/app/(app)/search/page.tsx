import type { Metadata } from "next";
import { Suspense } from "react";
import { TitleCard } from "@/components/title-card";
import { requireProfile } from "@/lib/dal";
import { searchFree } from "@/lib/free";
import { forViewer, viewerOf, type Viewer } from "@/lib/ratings";
import { searchTitles } from "@/lib/tmdb";
import type { Title } from "@/lib/types";

export const metadata: Metadata = { title: "Busca" };

function Results({ heading, note, items }: { heading: string; note: string; items: Title[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-10">
      <h2 className="font-display text-lg font-semibold">{heading}</h2>
      <p className="mb-4 text-sm text-muted">{note}</p>
      <div className="flex flex-wrap gap-4">
        {items.map((t) => (
          <TitleCard key={`${t.type}-${t.id}`} title={t} />
        ))}
      </div>
    </section>
  );
}

async function FreeResults({ query, viewer }: { query: string; viewer: Viewer }) {
  const items = await forViewer(await searchFree(query), viewer);
  return <Results heading="Filmes completos e grátis" note="Assista inteiro aqui no Olwe." items={items} />;
}

async function TmdbResults({ query, viewer }: { query: string; viewer: Viewer }) {
  const items = await forViewer(await searchTitles(query), viewer);
  return <Results heading="Filmes e séries" note="Só sinopse e trailer." items={items} />;
}

function Loading({ label }: { label: string }) {
  return <p className="mb-10 animate-pulse text-sm text-muted">{label}</p>;
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const viewer = viewerOf(await requireProfile());

  return (
    <div className="px-4 pt-24 sm:px-10">
      <h1 className="mb-6 font-display text-2xl font-semibold">
        {query ? (
          <>
            Resultados para <span className="text-gradient">“{query}”</span>
          </>
        ) : (
          "Busque por filmes e séries"
        )}
      </h1>
      {query && (
        <>
          {/* Cada fonte aparece assim que responde: o TMDB costuma chegar antes dos filmes completos. */}
          <Suspense fallback={<Loading label="Procurando filmes completos…" />}>
            <FreeResults query={query} viewer={viewer} />
          </Suspense>
          <Suspense fallback={<Loading label="Procurando filmes e séries…" />}>
            <TmdbResults query={query} viewer={viewer} />
          </Suspense>
        </>
      )}
    </div>
  );
}
