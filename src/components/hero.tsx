"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { isFullMovie, type Title } from "@/lib/types";
import { AvailabilityBadge } from "./badges";

export function Hero({ items, slides }: { items: Title[]; slides: ReactNode[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), 8000);
    return () => clearInterval(id);
  }, [paused, items.length]);

  const current = items[index];
  if (!current) return null;

  return (
    <section
      className="relative h-[68vh] min-h-[420px] w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carrossel"
    >
      {slides.map((slide, i) => (
        <div key={i} className={`absolute inset-0 transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0"}`} aria-hidden={i !== index}>
          {slide}
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />

      <div className="relative flex h-full max-w-2xl flex-col justify-end gap-4 px-4 pb-16 sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber">
          {current.type === "tv" ? "Série" : "Filme"} em destaque
        </p>
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-6xl">{current.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <AvailabilityBadge title={current} />
          {current.year && <span>{current.year}</span>}
          {current.rating > 0 && <span className="text-amber">★ {current.rating.toFixed(1)}</span>}
        </div>
        <p className="line-clamp-3 max-w-xl text-sm text-text/85 sm:text-base">{current.overview}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/watch/${current.type}/${encodeURIComponent(current.id)}`} className="bg-brand rounded-full px-6 py-3 font-semibold text-ink shadow-lg shadow-ember/20 transition hover:brightness-110">
            ▶ {isFullMovie(current) ? "Assistir filme" : "Ver trailer"}
          </Link>
          <Link href={`/title/${current.type}/${encodeURIComponent(current.id)}`} className="rounded-full bg-white/10 px-6 py-3 font-semibold backdrop-blur transition hover:bg-white/20">
            Mais informações
          </Link>
        </div>
      </div>

      {items.length > 1 && (
        <div className="absolute bottom-16 right-4 flex gap-2 sm:right-10">
          {items.map((t, i) => (
            <button
              key={t.id}
              type="button"
              aria-label={`Ir para ${t.title}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? "bg-brand w-8" : "w-3 bg-white/30 hover:bg-white/60"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
