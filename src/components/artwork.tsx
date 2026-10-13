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

  const fallback = (
    <div className="absolute inset-0 flex items-end p-3" style={{ background: fallbackGradient(title.id) }}>
      {variant === "poster" && (
        <span className="font-display text-base font-semibold leading-tight text-white drop-shadow">{title.title}</span>
      )}
    </div>
  );
  if (!src) return fallback;

  // Imagens do TMDB passam pelo otimizador e já são pôsteres prontos.
  if (src.startsWith("https://image.tmdb.org/")) {
    return <Image src={src} alt="" fill sizes={sizes} priority={priority} className="object-cover" />;
  }

  // Miniaturas do Internet Archive costumam ser um quadro do filme (às vezes preto): ficam sobre o
  // gradiente e, nos pôsteres, recebem o título por cima para o card nunca ficar vazio.
  return (
    <>
      {fallback}
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        unoptimized
        className={variant === "backdrop" ? "object-cover blur-sm scale-105" : "object-cover"}
      />
      {variant === "poster" && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pt-10">
          <span className="font-display text-base font-semibold leading-tight text-white">{title.title}</span>
        </div>
      )}
    </>
  );
}
