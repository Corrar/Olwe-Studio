import { getByGenre, getList } from "@/lib/tmdb";
import type { MediaType } from "@/lib/types";
import { HeroSection } from "./hero-section";
import { TitleRow } from "./title-row";

export async function CatalogPage({ type, genres }: { type: MediaType; genres: [number, string][] }) {
  const [popular, topRated, ...byGenre] = await Promise.all([
    getList(type, "popular"),
    getList(type, "top_rated"),
    ...genres.map(([id]) => getByGenre(type, [id])),
  ]);
  return (
    <>
      <HeroSection items={popular} />
      <div className="-mt-10 relative space-y-10">
        <TitleRow title="Populares agora" items={popular} />
        <TitleRow title="Mais bem avaliados" items={topRated} />
        {genres.map(([id, name], i) => (
          <TitleRow key={id} title={name} items={byGenre[i]} />
        ))}
      </div>
    </>
  );
}
