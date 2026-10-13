import type { Metadata } from "next";
import { TitleCard } from "@/components/title-card";
import { searchTitles } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Busca" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const results = await searchTitles(query);

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
      {query && results.length === 0 && <p className="text-muted">Nada encontrado. Tente outro título.</p>}
      <div className="flex flex-wrap gap-4">
        {results.map((t) => (
          <TitleCard key={`${t.type}-${t.id}`} title={t} />
        ))}
      </div>
    </div>
  );
}
