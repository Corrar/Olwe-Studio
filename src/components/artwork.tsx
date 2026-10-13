import Image from "next/image";
import type { Title } from "@/lib/types";

// Gradiente determinístico para títulos sem imagem (catálogo de demonstração ou sem arte).
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

function seed(id: string | number) {
  if (typeof id === "number") return id;
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function fallbackGradient(id: string | number) {
  const n = seed(id);
  const [a, b] = PALETTES[n % PALETTES.length];
  return `linear-gradient(${(n * 37) % 360}deg, ${a}, ${b})`;
}

export function Artwork({
  title,
  variant,
  priority,
  sizes,
}: {
  title: Pick<Title, "id" | "title" | "poster" | "backdrop">;
  variant: "poster" | "backdrop";
  priority?: boolean;
  sizes: string;
}) {
  const src = variant === "poster" ? title.poster : title.backdrop ?? title.poster;

  if (src) {
    // Só as imagens do TMDB passam pelo otimizador; as do Internet Archive vão direto.
    const optimized = src.startsWith("https://image.tmdb.org/");
    return (
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={!optimized}
        className={variant === "backdrop" && !optimized ? "object-cover blur-sm scale-105" : "object-cover"}
      />
    );
  }
  return (
    <div className="absolute inset-0 flex items-end p-3" style={{ background: fallbackGradient(title.id) }}>
      {variant === "poster" && (
        <span className="font-display text-base font-semibold leading-tight text-white drop-shadow">{title.title}</span>
      )}
    </div>
  );
}
