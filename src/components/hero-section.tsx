import type { Title } from "@/lib/types";
import { Artwork } from "./artwork";
import { Hero, type HeroItem } from "./hero";

/** Destaque com os 5 primeiros títulos da lista (que já passou por forViewer). */
export function HeroSection({ items, heading, compactTop }: { items: Title[]; heading?: "h1" | "h2"; compactTop?: boolean }) {
  const featured = items.slice(0, 5);
  // Só os campos que o carrossel mostra vão para o navegador.
  const heroItems: HeroItem[] = featured.map(({ id, type, title, overview, year, rating, genreIds, isNew, quality, ageRating }) => ({
    id,
    type,
    title,
    overview,
    year,
    rating,
    genreIds,
    isNew,
    quality,
    ageRating,
  }));
  return (
    <Hero
      items={heroItems}
      heading={heading}
      compactTop={compactTop}
      slides={featured.map((t, i) => ({
        backdrop: <Artwork title={t} variant="backdrop" priority={i === 0} sizes="100vw" />,
        poster: <Artwork title={t} variant="poster" priority={i === 0} sizes="(min-width: 640px) 1px, 64vw" />,
      }))}
    />
  );
}
