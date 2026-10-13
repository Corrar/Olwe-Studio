"use client";

import { useRef, type ReactNode } from "react";

export function Row({ title, children, href }: { title: string; children: ReactNode; href?: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) =>
    scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.85, behavior: "smooth" });

  return (
    <section className="group/row relative">
      <div className="mb-3 flex items-baseline gap-3 px-4 sm:px-10">
        <h2 className="font-display text-lg font-semibold sm:text-xl">{title}</h2>
        {href && (
          <a href={href} className="text-sm text-muted hover:text-amber">
            Ver tudo
          </a>
        )}
      </div>
      <div className="relative">
        <div ref={scroller} className="no-scrollbar flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 pt-1 sm:scroll-px-10 sm:px-10">
          {children}
        </div>
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => scroll(-1)}
          className="absolute inset-y-0 left-0 hidden w-10 items-center justify-center bg-gradient-to-r from-ink to-transparent text-3xl opacity-0 transition group-hover/row:opacity-100 sm:flex"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Próximo"
          onClick={() => scroll(1)}
          className="absolute inset-y-0 right-0 hidden w-10 items-center justify-center bg-gradient-to-l from-ink to-transparent text-3xl opacity-0 transition group-hover/row:opacity-100 sm:flex"
        >
          ›
        </button>
      </div>
    </section>
  );
}
