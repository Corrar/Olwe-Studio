import type { Metadata } from "next";
import { TitleCard } from "@/components/title-card";
import { searchAll } from "@/lib/catalog";
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

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const { full, tmdb } = query ? await searchAll(query) : { full: [], tmdb: [] };

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
      {query && full.length === 0 && tmdb.length === 0 && <p className="text-muted">Nada encontrado. Tente outro título.</p>}
      <Results heading="Filmes completos e grátis" note="Assista inteiro aqui no Olwe." items={full} />
      <Results heading="Filmes e séries" note="Só sinopse e trailer." items={tmdb} />
    </div>
  );
}
