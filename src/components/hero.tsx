"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { genreName } from "@/lib/genres";
import { isFullMovie, type Title } from "@/lib/types";
import { AvailabilityBadge, NewBadge } from "./badges";
import { Icon } from "./icons";
import { RatingBadge } from "./rating-badge";

export type HeroItem = Pick<Title, "id" | "type" | "title" | "overview" | "year" | "rating" | "genreIds" | "isNew" | "quality" | "ageRating">;
export type HeroSlide = { backdrop: ReactNode; poster: ReactNode };

const INTERVAL_MS = 9000;

// Medidas compartilhadas com o esqueleto (nada pula quando o destaque chega). No celular, o pôster
// centralizado define a altura; do sm em diante é um painel 16:9 limitado pela altura da tela, que cresce
// quando o texto não cabe (telas baixas, zoom alto, títulos longos) em vez de subir por baixo do cabeçalho.
const FRAME =
  "relative isolate w-full overflow-hidden sm:flex sm:min-h-[clamp(22rem,56.25vw,80svh)] sm:flex-col sm:portrait:min-h-[clamp(26rem,62svh,56rem)]";
const CONTENT =
  "gutter flex flex-col items-center pb-14 text-center sm:flex-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:pb-20 sm:text-left lg:pb-24";
// Espaço do cabeçalho fixo acima do texto. compact: nas páginas de Filmes e Séries, o nome da página e os
// gêneros ficam acima do destaque e, do xl em diante, sobre o topo dele (numa linha só, de altura fixa).
const TOP = {
  default: "pt-[calc(4.5rem+env(safe-area-inset-top))] sm:pt-[calc(5.5rem+env(safe-area-inset-top))]",
  compact: "pt-4 xl:pt-[calc(9rem+env(safe-area-inset-top))]",
};
// O pôster encolhe em telas baixas para os botões caberem na primeira tela.
const POSTER =
  "relative aspect-[2/3] w-[clamp(9rem,calc((100svh_-_24rem)*2/3),min(64vw,17rem))] shrink-0 overflow-hidden rounded-2xl sm:hidden";
const TEXT = "mt-5 flex w-full flex-col items-center gap-3 sm:mt-0 sm:max-w-[min(38rem,62%)] sm:items-start sm:gap-4 xl:max-w-2xl 3xl:max-w-3xl";
// Duas linhas reservadas no celular: títulos curtos ou longos não empurram as fileiras a cada troca.
const TITLE_BOX = "flex min-h-[2lh] w-full items-end justify-center text-[1.75rem] leading-[1.1] sm:min-h-0 sm:justify-start sm:text-4xl md:text-5xl xl:text-6xl 3xl:text-7xl";
const BUTTONS = "mt-1 grid w-full max-w-sm grid-cols-2 gap-2.5 sm:mt-2 sm:flex sm:w-auto sm:max-w-none sm:flex-wrap sm:gap-3";
const BUTTON =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[0.8125rem] font-semibold leading-tight transition duration-200 active:scale-[0.97] max-[22.5rem]:px-2 max-[22.5rem]:text-xs sm:min-h-12 sm:px-7 sm:text-base";
// Telas baixas (celular deitado): só o essencial cabe no painel.
const SHORT_HIDDEN = "[@media(max-height:30rem)]:hidden";
const EDGE = "max(var(--gutter),env(safe-area-inset-right))";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function subscribeReducedMotion(onChange: () => void) {
  const query = matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function keyboardFocus(el: Element) {
  try {
    return el.matches(":focus-visible");
  } catch {
    return true; // Navegador sem :focus-visible: na dúvida, pausa.
  }
}

/**
 * Destaque em carrossel: troca a cada 9s com esmaecimento cruzado e pausa com o mouse em cima, com o
 * foco do teclado (ou do controle remoto) dentro, com a aba escondida e no botão de pausa. Com
 * movimento reduzido não troca sozinho. Use heading="h2" quando a página já tem o próprio h1.
 */
export function Hero({
  items,
  slides,
  heading: Heading = "h1",
  compactTop,
}: {
  items: HeroItem[];
  slides: HeroSlide[];
  heading?: "h1" | "h2";
  /** A página põe um cabeçalho próprio acima do destaque no celular: menos espaço no topo. */
  compactTop?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const tabHidden = useSyncExternalStore(subscribeVisibility, () => document.hidden, () => false);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, () => matchMedia(REDUCED_MOTION).matches, () => false);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const count = items.length;
  const current = index < count ? index : 0;
  const canRotate = count > 1 && !reducedMotion;
  const rotating = canRotate && !stopped && !hovered && !focused && !tabHidden;

  useEffect(() => {
    if (!rotating) return;
    const timer = setTimeout(() => setIndex((current + 1) % count), INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [rotating, current, count]);

  const item = items[current];
  // Sem destaque, só o espaço do cabeçalho fixo (as fileiras sobem um pouco sobre o destaque). compact: do xl
  // em diante, também o do nome da página e dos gêneros, que ficam sobre esse espaço.
  if (!item) return <div className={compactTop ? "h-14 xl:h-[calc(11.5rem+env(safe-area-inset-top))]" : "h-[calc(8rem+env(safe-area-inset-top))]"} />;

  const go = (i: number) => setIndex((i + count) % count);
  const details = `/title/${item.type}/${encodeURIComponent(item.id)}`;
  const genres = item.genreIds.map((id) => genreName(item.type, id)).filter(Boolean).slice(0, 3);

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques"
      className={`${FRAME} touch-pan-y touch-pinch-zoom`}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      // Só o foco do teclado pausa; com o mouse, o hover já pausa.
      onFocus={(e) => keyboardFocus(e.target) && setFocused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setFocused(false)}
      // Deslizar para os lados troca o destaque nas telas de toque.
      onPointerDown={(e) => {
        swipe.current = e.pointerType === "mouse" ? null : { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const start = swipe.current;
        swipe.current = null;
        if (!start || count < 2) return;
        const dx = e.clientX - start.x;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(e.clientY - start.y) * 1.5) go(current + (dx < 0 ? 1 : -1));
      }}
      onPointerCancel={() => {
        swipe.current = null;
      }}
    >
      {/* Fundo: imagens largas com zoom lento; no celular, desfocadas como luz ambiente atrás do pôster. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {slides.map((slide, i) => (
          <div
            key={items[i]?.id ?? i}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${i === current ? "opacity-100" : "opacity-0"}`}
          >
            <div className="absolute inset-0 scale-110 blur-2xl sm:scale-100 sm:animate-ken-burns sm:blur-none">{slide.backdrop}</div>
          </div>
        ))}
        <div className="absolute inset-0 bg-ink/55 sm:bg-transparent sm:bg-gradient-to-r sm:from-ink/90 sm:via-ink/35 sm:to-transparent" />
        {/* compact: até o lg, o nome da página fica acima do destaque e o topo dele se funde ao fundo da página. */}
        <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b to-transparent ${compactTop ? "from-ink xl:from-ink/70" : "from-ink/70"}`} />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink via-ink/50 to-transparent sm:h-2/5" />
      </div>

      <div className={`${CONTENT} ${compactTop ? TOP.compact : TOP.default}`}>
        {/* Celular: pôster centralizado com cantos arredondados. */}
        <Link href={details} tabIndex={-1} aria-hidden="true" className={`${POSTER} shadow-2xl shadow-black/60 ring-1 ring-white/10`}>
          {slides.map((slide, i) => (
            <div
              key={items[i]?.id ?? i}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${i === current ? "opacity-100" : "opacity-0"}`}
            >
              {slide.poster}
            </div>
          ))}
        </Link>

        <div aria-live={rotating ? "off" : "polite"} className={TEXT}>
          <div
            key={item.id}
            role="group"
            aria-roledescription="destaque"
            aria-label={`${current + 1} de ${count}`}
            className="flex w-full animate-fade-up flex-col items-center gap-3 sm:items-start sm:gap-4"
          >
            <p className={`hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber sm:flex ${SHORT_HIDDEN}`}>
              <Icon name={item.type === "tv" ? "tv" : "film"} size={16} />
              {item.type === "tv" ? "Série" : "Filme"} em destaque
            </p>
            <div className={TITLE_BOX}>
              <Heading className="line-clamp-2 text-balance font-display font-bold tracking-tight drop-shadow-[0_2px_12px_rgb(0_0_0/0.5)]">
                {item.title}
              </Heading>
            </div>
            {genres.length > 0 && <p className="-mt-1 text-sm text-text/75 sm:hidden">{genres.join(" • ")}</p>}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-text/80 sm:justify-start sm:text-base">
              <span className="sm:hidden">
                <RatingBadge rating={item.ageRating} />
              </span>
              <NewBadge title={item} />
              <AvailabilityBadge title={item} />
              {item.year && <span>{item.year}</span>}
              {item.rating > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-amber">
                  <Icon name="star" size={15} className="fill-current" />
                  <span className="sr-only">Nota</span>
                  {item.rating.toFixed(1)}
                </span>
              )}
            </div>
            <p className={`line-clamp-3 max-w-xl text-pretty text-sm text-text/85 max-sm:hidden sm:text-base xl:text-lg 3xl:text-xl ${SHORT_HIDDEN}`}>
              {item.overview}
            </p>
            <div className={BUTTONS}>
              <Link
                href={`/watch/${item.type}/${encodeURIComponent(item.id)}`}
                className={`bg-brand ${BUTTON} text-ink shadow-lg shadow-ember/25 hover:brightness-110`}
              >
                <Icon name="play" size={20} className="shrink-0 max-[22.5rem]:hidden" />
                {isFullMovie(item) ? "Assistir filme" : "Ver trailer"}
              </Link>
              <Link href={details} className={`${BUTTON} bg-white/15 backdrop-blur-md hover:bg-white/25`}>
                <Icon name="info" size={20} className="shrink-0 max-[22.5rem]:hidden" />
                Mais informações
              </Link>
            </div>
          </div>
        </div>

        {/* Indicadores e pausa; no desktop, à direita e junto do selo de classificação colado na borda. */}
        <div className="mt-5 flex shrink-0 items-center justify-center gap-3 sm:mt-0 sm:min-h-12 sm:gap-4">
          {count > 1 && (
            <div className="flex items-center" role="group" aria-label="Escolher destaque">
              {items.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  aria-label={`Destaque ${i + 1}: ${t.title}`}
                  aria-current={i === current ? "true" : undefined}
                  onClick={() => go(i)}
                  className="group/dot flex h-6 min-w-6 items-center justify-center rounded-full px-1"
                >
                  <span
                    className={`block h-1 rounded-full transition-all duration-500 ease-out-expo ${
                      i === current ? "bg-brand w-7" : "w-3 bg-white/35 group-hover/dot:bg-white/70"
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
          {canRotate && (
            <button
              type="button"
              onClick={() => setStopped((s) => !s)}
              aria-label={stopped ? "Retomar destaques" : "Pausar destaques"}
              className="grid size-9 place-items-center rounded-full border border-white/35 bg-black/30 text-text/90 backdrop-blur transition hover:border-white/80 hover:text-text"
            >
              <Icon name={stopped ? "play" : "pause"} size={14} />
            </button>
          )}
          {item.ageRating && (
            <span
              key={item.id}
              style={{ marginRight: `calc(-1 * ${EDGE})`, paddingRight: EDGE }}
              className="hidden animate-fade-in items-center border-l-[0.1875rem] border-white/70 bg-black/40 py-1.5 pl-3 backdrop-blur-sm sm:flex"
            >
              <RatingBadge rating={item.ageRating} />
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

/** Esqueleto do destaque com as mesmas medidas (loading.tsx e Suspense). */
export function HeroSkeleton({ compactTop }: { compactTop?: boolean }) {
  return (
    <div aria-hidden="true" className={FRAME}>
      <div className="skeleton absolute inset-0 -z-10 hidden sm:block" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-2/5 bg-gradient-to-t from-ink to-transparent" />
      <div className={`${CONTENT} ${compactTop ? TOP.compact : TOP.default}`}>
        <div className={`${POSTER} skeleton`} />
        <div className={TEXT}>
          <div className={`skeleton hidden h-3 w-36 rounded sm:block ${SHORT_HIDDEN}`} />
          <div className={TITLE_BOX}>
            <div className="skeleton h-[1lh] w-3/4 rounded-lg" />
          </div>
          <div className="skeleton -mt-1 h-5 w-40 rounded sm:hidden" />
          <div className="skeleton h-7 w-48 rounded sm:w-64" />
          <div className={`w-full max-w-xl space-y-2 max-sm:hidden ${SHORT_HIDDEN}`}>
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-11/12 rounded" />
            <div className="skeleton h-4 w-2/3 rounded" />
          </div>
          <div className={BUTTONS}>
            <div className="skeleton h-11 rounded-full sm:h-12 sm:w-40" />
            <div className="skeleton h-11 rounded-full sm:h-12 sm:w-52" />
          </div>
        </div>
        <div className="mt-5 h-9 sm:mt-0 sm:h-12" />
      </div>
    </div>
  );
}
