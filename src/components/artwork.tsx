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

// Luz suave no alto e vinheta embaixo: o gradiente parece um pôster, não um bloco de cor.
const SHEEN =
  "radial-gradient(120% 70% at 20% 0%, rgb(255 255 255 / 0.16), transparent 60%), radial-gradient(140% 90% at 50% 120%, rgb(0 0 0 / 0.55), transparent 70%)";

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
  // Fundo de destaque (LCP) é pré-carregado; pôsteres da primeira fileira só não esperam o scroll.
  const loading = !priority ? {} : variant === "backdrop" ? { preload: true } : { loading: "eager" as const };

  const fallback = (
    <div className="absolute inset-0" style={{ background: fallbackGradient(title.id) }}>
      <div className="absolute inset-0" style={{ background: SHEEN }} />
      {variant === "poster" && (
        <div className="absolute inset-0 flex items-center justify-center px-3 py-9 text-center">
          <span className="line-clamp-4 text-balance font-display text-[0.9375rem] font-bold leading-tight tracking-tight text-white drop-shadow-[0_1px_8px_rgb(0_0_0/0.45)] sm:text-base 3xl:text-lg">
            {title.title}
          </span>
        </div>
      )}
    </div>
  );
  if (!src) return fallback;

  // Imagens do TMDB passam pelo otimizador e já são pôsteres prontos.
  if (src.startsWith("https://image.tmdb.org/")) {
    return <Image src={src} alt="" fill sizes={sizes} {...loading} className="object-cover" />;
  }

  // Miniaturas do Internet Archive costumam ser um quadro do filme (às vezes preto): ficam sobre o
  // gradiente e, nos pôsteres, recebem o título por cima para o card nunca ficar vazio. A faixa de
  // baixo fica livre para os selos do cartão.
  return (
    <>
      <div className="absolute inset-0" style={{ background: fallbackGradient(title.id) }} />
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        {...loading}
        unoptimized
        className={variant === "backdrop" ? "scale-105 object-cover blur-sm" : "object-cover"}
      />
      {variant === "poster" && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/65 to-transparent px-3 pb-9 pt-12">
          <span className="line-clamp-3 text-balance font-display text-[0.9375rem] font-bold leading-tight text-white sm:text-base 3xl:text-lg">
            {title.title}
          </span>
        </div>
      )}
    </>
  );
}
