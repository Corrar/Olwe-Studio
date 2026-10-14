"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useLayoutEffect, useOptimistic, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from "react";
import type { Season } from "@/lib/types";
import { Icon } from "./icons";

export type TitleTabId = "episodios" | "relacionados" | "detalhes";
export type TitleTab = { id: TitleTabId; label: string; content: ReactNode };

/**
 * Abas da página do título (padrão WAI-ARIA, ativação automática): setas, Home e End trocam de aba.
 * A aba escolhida vai para ?tab= sem recarregar a página, e volta igual depois de recarregar. Só o
 * painel ativo fica no DOM; o conteúdo dos outros já chegou do servidor e aparece na hora.
 */
export function TitleTabs({ tabs, defaultTab }: { tabs: TitleTab[]; defaultTab: TitleTabId }) {
  const params = useSearchParams();
  const requested = params.get("tab");
  const active = tabs.find((t) => t.id === requested)?.id ?? defaultTab;
  const id = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  // Sublinhado que desliza até a aba ativa; antes da hidratação, cada aba tem o próprio sublinhado.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const tab = list.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!tab) return;
    const measure = () => setIndicator({ left: tab.offsetLeft, width: tab.offsetWidth });
    measure();
    // A aba muda de largura quando a fonte carrega; a lista, quando a tela muda.
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    observer.observe(tab);
    return () => observer.disconnect();
  }, [active]);

  function select(next: TitleTabId) {
    if (next === active) return;
    const query = new URLSearchParams(params.toString());
    query.set("tab", next);
    window.history.replaceState(null, "", `?${query}`);
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const index = tabs.findIndex((t) => t.id === active);
    const target = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (target === undefined) return;
    e.preventDefault();
    const next = tabs[(target + tabs.length) % tabs.length];
    select(next.id);
    document.getElementById(`${id}-${next.id}-tab`)?.focus();
  }

  return (
    <div>
      <div className="gutter border-b border-line">
        <div ref={listRef} role="tablist" aria-label="Seções do título" className="no-scrollbar relative -mb-px flex gap-6 overflow-x-auto sm:gap-8">
          {tabs.map((t) => {
            const selected = t.id === active;
            return (
              <button
                key={t.id}
                id={`${id}-${t.id}-tab`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${id}-${t.id}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(t.id)}
                onKeyDown={onKeyDown}
                className={`relative shrink-0 whitespace-nowrap py-3 font-display text-[0.9375rem] font-semibold tracking-tight transition-colors duration-200 sm:py-4 sm:text-lg 3xl:text-xl ${
                  selected ? "text-text" : "text-muted hover:text-text"
                }`}
              >
                {t.label}
                {!indicator && selected && <span aria-hidden="true" className="bg-brand absolute inset-x-0 bottom-0 h-[0.1875rem] rounded-full" />}
              </button>
            );
          })}
          {indicator && (
            <span
              aria-hidden="true"
              className="bg-brand absolute bottom-0 left-0 h-[0.1875rem] rounded-full transition-[transform,width] duration-500 ease-out-expo"
              style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
            />
          )}
        </div>
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          id={`${id}-${t.id}-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-${t.id}-tab`}
          hidden={t.id !== active}
          tabIndex={0}
          className="gutter pb-16 pt-6 focus-visible:outline-offset-[-0.125rem] sm:pt-8 3xl:pt-10"
        >
          {t.id === active && <div className="animate-fade-in">{t.content}</div>}
        </div>
      ))}
    </div>
  );
}

/**
 * Escolha de temporada (?season=N): a lista de episódios vem do servidor. Enquanto a temporada nova
 * carrega, a lista atual esmaece em vez de sumir.
 */
export function SeasonPicker({
  seasons,
  current,
  note,
  children,
}: {
  seasons: Season[];
  current: number;
  /** Aviso à direita da escolha de temporada. */
  note?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  // A escolha aparece na hora; a lista chega do servidor logo depois.
  const [selected, setSelected] = useOptimistic(current);
  const season = seasons.find((s) => s.number === selected) ?? seasons[0];

  function change(value: string) {
    const query = new URLSearchParams(params.toString());
    query.set("tab", "episodios");
    query.set("season", value);
    startTransition(() => {
      setSelected(Number(value));
      router.replace(`${pathname}?${query}`, { scroll: false });
    });
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 sm:mb-6">
        {seasons.length > 1 ? (
          <div className="relative">
            <select
              aria-label="Temporada"
              value={season.number}
              onChange={(e) => change(e.target.value)}
              className="cursor-pointer appearance-none rounded-lg border border-white/15 bg-surface-2 py-2.5 pl-4 pr-11 font-display font-semibold transition hover:border-white/35 sm:text-lg"
            >
              {seasons.map((s) => (
                <option key={s.number} value={s.number}>
                  {s.name}
                </option>
              ))}
            </select>
            <Icon name="chevron-down" size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
          </div>
        ) : (
          <p className="font-display font-semibold sm:text-lg">{season.name}</p>
        )}
        <p className="text-sm text-muted">
          {season.episodeCount} {season.episodeCount === 1 ? "episódio" : "episódios"}
          {season.year ? ` · ${season.year}` : ""}
        </p>
        {note && <p className="w-full text-sm text-muted sm:ml-auto sm:w-auto">{note}</p>}
      </div>
      <div aria-busy={pending} className="transition-opacity duration-300 aria-busy:opacity-50">
        {children}
      </div>
    </div>
  );
}
