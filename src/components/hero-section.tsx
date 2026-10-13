import type { Title } from "@/lib/types";
import { Artwork } from "./artwork";
import { Hero } from "./hero";

export function HeroSection({ items }: { items: Title[] }) {
  const featured = items.slice(0, 5);
  return (
    <Hero
      items={featured}
      slides={featured.map((t, i) => (
        <Artwork key={t.id} title={t} variant="backdrop" priority={i === 0} sizes="100vw" />
      ))}
    />
  );
}
