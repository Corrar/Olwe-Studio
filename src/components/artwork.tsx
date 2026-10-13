import Image from "next/image";
import { imageUrl } from "@/lib/tmdb";
import type { Title } from "@/lib/types";

// Gradiente determinístico para títulos sem imagem (catálogo de demonstração ou TMDB sem arte).
const PALETTES = [
  ["#3b1d4a", "#ff6a3d"],
  ["#0f3443", "#34e89e"],
  ["#1d2b64", "#f8cdda"],
  ["#42275a", "#734b6d"],
  ["#141e30", "#ffb547"],
  ["#232526", "#e8508c"],
  ["#0b486b", "#f56217"],
  ["#1f4037", "#99f2c8"],
];

export function fallbackGradient(id: number) {
  const [a, b] = PALETTES[id % PALETTES.length];
  return `linear-gradient(${(id * 37) % 360}deg, ${a}, ${b})`;
}

export function Artwork({
  title,
  variant,
  priority,
  sizes,
}: {
  title: Pick<Title, "id" | "title" | "posterPath" | "backdropPath">;
  variant: "poster" | "backdrop";
  priority?: boolean;
  sizes: string;
}) {
  const src =
    variant === "poster"
      ? imageUrl(title.posterPath, "w500")
      : imageUrl(title.backdropPath, "w1280") ?? imageUrl(title.posterPath, "w780");

  if (src) {
    return <Image src={src} alt="" fill sizes={sizes} priority={priority} className="object-cover" />;
  }
  return (
    <div className="absolute inset-0 flex items-end p-3" style={{ background: fallbackGradient(title.id) }}>
      {variant === "poster" && (
        <span className="font-display text-base font-semibold leading-tight text-white drop-shadow">{title.title}</span>
      )}
    </div>
  );
}
