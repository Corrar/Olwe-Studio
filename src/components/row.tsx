"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "./icons";

// Cada item da fileira é um link (o cartão). As setas do teclado passam de um para o outro.
const ITEM = "a[href]";
const SCROLLER = "[data-row-scroller]";

type ScrollState = { start: boolean; end: boolean; page: number; pages: number };

function itemsOf(scroller: Element) {
  return Array.from(scroller.querySelectorAll<HTMLElement>(ITEM));
}

/** Passo de uma página: quantos cartões inteiros cabem entre as margens. */
function pageStep(el: HTMLElement) {
  const style = getComputedStyle(el);
  const visible = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const gap = parseFloat(style.columnGap) || 0;
  const unit = ((el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0) + gap;
  return unit > 0 ? Math.max(1, Math.floor((visible + gap) / unit)) * unit : visible;
}

function focusItem(item: HTMLElement) {
  item.focus({ preventScroll: true });
  item.scrollIntoView({ block: "nearest", inline: "nearest" });
}

/** Cartão da fileira de cima/de baixo mais perto na horizontal (navegação de controle remoto). */
function verticalNeighbour(from: HTMLElement, dir: 1 | -1) {
  const rows = Array.from(document.querySelectorAll(SCROLLER)).filter((r) => itemsOf(r).length > 0);
  const target = rows[rows.indexOf(from.closest(SCROLLER)!) + dir];
  if (!target) return;
  const x = from.getBoundingClientRect().left;
  let best: HTMLElement | undefined;
  let distance = Infinity;
  for (const item of itemsOf(target)) {
    const d = Math.abs(item.getBoundingClientRect().left - x);
    if (d < distance) [best, distance] = [item, d];
  }
  return best;
}

/**
 * Fileira no estilo Netflix: título com "Ver tudo", carrossel com rolagem por toque e snap, setas
 * paginadas e traços de página no mouse, setas do teclado entre os cartões (um só ponto de Tab por fileira).
 */
export function Row({ title, href, children, ariaLabel }: { title: string; href?: string; children: ReactNode; ariaLabel?: string }) {
  const headingId = useId();
  const scrollerId = useId();
  const scroller = useRef<HTMLDivElement>(null);
  const active = useRef(0);
  const [scroll, setScroll] = useState<ScrollState>({ start: true, end: false, page: 0, pages: 1 });

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const step = pageStep(el);
      const max = el.scrollWidth - el.clientWidth;
      const x = el.scrollLeft;
      const pages = max > 2 ? Math.ceil(max / step - 0.05) + 1 : 1;
      const end = x >= max - 2;
      const next = { start: x <= 2, end, pages, page: end ? pages - 1 : Math.min(pages - 1, Math.round(x / step)) };
      setScroll((s) => (s.start === next.start && s.end === next.end && s.page === next.page && s.pages === next.pages ? s : next));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    // Só o cartão ativo entra na ordem do Tab; os outros, pelas setas.
    const roving = () => {
      const items = itemsOf(el);
      active.current = Math.min(active.current, Math.max(0, items.length - 1));
      items.forEach((item, i) => (item.tabIndex = i === active.current ? 0 : -1));
    };
    schedule();
    roving();
    el.addEventListener("scroll", schedule, { passive: true });
    const resize = new ResizeObserver(schedule);
    resize.observe(el);
    const mutations = new MutationObserver(() => {
      roving();
      schedule();
    });
    mutations.observe(el, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", schedule);
      resize.disconnect();
      mutations.disconnect();
    };
  }, []);

  // Sem behavior: a classe scroll-smooth anima, e o CSS de movimento reduzido desliga.
  const turnPage = (dir: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * pageStep(el) });
  };

  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    const items = itemsOf(e.currentTarget);
    const index = items.indexOf(e.target as HTMLElement);
    if (index < 0) return;
    active.current = index;
    items.forEach((item, i) => (item.tabIndex = i === index ? 0 : -1));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const items = itemsOf(e.currentTarget);
    const index = items.indexOf(e.target as HTMLElement);
    if (index < 0) return;
    let next: HTMLElement | undefined;
    if (e.key === "ArrowRight") next = items[index + 1];
    else if (e.key === "ArrowLeft") next = items[index - 1];
    else if (e.key === "Home") next = items[0];
    else if (e.key === "End") next = items.at(-1);
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") next = verticalNeighbour(items[index], e.key === "ArrowDown" ? 1 : -1);
    if (!next) return;
    e.preventDefault();
    focusItem(next);
  };

  const heading = (
    <h2 id={headingId} className="min-w-0 text-balance font-display text-base font-semibold tracking-tight sm:text-lg lg:text-xl">
      {title}
    </h2>
  );

  const arrow = (dir: 1 | -1) => {
    const hidden = dir === 1 ? scroll.end : scroll.start;
    return (
      <button
        type="button"
        // Atalho do mouse: no teclado as setas já movem entre os cartões.
        tabIndex={-1}
        aria-label={dir === 1 ? `Próximos em ${title}` : `Anteriores em ${title}`}
        aria-controls={scrollerId}
        onClick={() => turnPage(dir)}
        className={`group/arrow absolute inset-y-2 z-20 hidden w-[max(var(--gutter),2.5rem)] items-center justify-center from-ink/95 via-ink/60 to-transparent text-text opacity-0 transition duration-300 ease-out-expo pointer-fine:flex group-hover/row:opacity-100 group-focus-within/row:opacity-100 ${
          dir === 1 ? "right-0 bg-gradient-to-l" : "left-0 bg-gradient-to-r"
        } ${hidden ? "invisible" : ""}`}
      >
        <Icon
          name={dir === 1 ? "chevron-right" : "chevron-left"}
          size={36}
          className="drop-shadow-lg transition-transform duration-300 ease-out-expo group-hover/arrow:scale-125"
        />
      </button>
    );
  };

  return (
    <section
      aria-labelledby={ariaLabel ? undefined : headingId}
      aria-label={ariaLabel}
      className="reveal group/row relative"
    >
      <div className="gutter mb-1 flex items-end justify-between gap-4 sm:mb-1.5">
        {href ? (
          <Link href={href} className="group/head flex min-w-0 items-baseline gap-2.5 rounded-sm">
            {heading}
            {/* "Ver tudo" desliza para dentro com o mouse ou o foco na fileira; no toque fica sempre à vista. */}
            <span className="inline-flex shrink-0 items-center text-xs font-semibold text-amber transition duration-300 ease-out-expo sm:text-sm pointer-fine:-translate-x-2 pointer-fine:opacity-0 pointer-fine:group-hover/row:translate-x-0 pointer-fine:group-hover/row:opacity-100 pointer-fine:group-focus-within/row:translate-x-0 pointer-fine:group-focus-within/row:opacity-100">
              Ver tudo
              <Icon name="chevron-right" size={16} className="transition-transform duration-300 group-hover/head:translate-x-0.5" />
            </span>
          </Link>
        ) : (
          heading
        )}

        {scroll.pages > 1 && (
          <div
            aria-hidden="true"
            className="hidden shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-300 pointer-fine:flex group-hover/row:opacity-100 group-focus-within/row:opacity-100"
          >
            {Array.from({ length: scroll.pages }, (_, i) => (
              <span key={i} className={`h-0.5 w-3 rounded-full transition-colors duration-300 ${i === scroll.page ? "bg-text" : "bg-white/25"}`} />
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <div
          ref={scroller}
          id={scrollerId}
          data-row-scroller=""
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          className="no-scrollbar gutter flex snap-x snap-mandatory scroll-pl-[max(var(--gutter),env(safe-area-inset-left))] scroll-pr-[max(var(--gutter),env(safe-area-inset-right))] gap-2 overflow-x-auto overscroll-x-contain scroll-smooth py-2 sm:gap-3 xl:gap-4 pointer-fine:snap-proximity"
        >
          {children}
        </div>
        {arrow(-1)}
        {arrow(1)}
      </div>
    </section>
  );
}
