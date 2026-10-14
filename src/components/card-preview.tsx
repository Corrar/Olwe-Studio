"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { addToWatchlist } from "@/app/actions/library";
import { genreName } from "@/lib/genres";
import { isFullMovie, type Title } from "@/lib/types";
import { Artwork } from "./artwork";
import { AvailabilityBadge, NewBadge } from "./badges";
import { Icon } from "./icons";
import { RatingBadge } from "./rating-badge";
import { useWatchlistToasts } from "./watchlist-button";

/** O que a prévia mostra: só o necessário, porque segue junto com cada cartão para o navegador. */
export type PreviewTitle = Pick<
  Title,
  "id" | "type" | "title" | "overview" | "poster" | "backdrop" | "year" | "genreIds" | "quality" | "isNew" | "ageRating"
>;

const HOVER_DELAY = 450;
const FOCUS_DELAY = 600;
// Folga para o ponteiro passar do cartão para a prévia (e de volta) sem fechar.
const LEAVE_GRACE = 120;
const EXIT_MS = 160;
// Distância mínima das bordas da janela, em px.
const EDGE = 12;

const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const FOCUSABLE = "a[href]:not([tabindex='-1']), button:not([disabled])";

type Placement = { rect: DOMRect; left: number; width: number };

// Só uma prévia montada por vez: abrir outra fecha a anterior na hora.
let active: { owner: object; close: () => void } | null = null;

const matches = (query: string) => typeof window !== "undefined" && window.matchMedia(query).matches;

/** Largura e posição horizontal: 1,65× o cartão, sem sair da tela perto das bordas. */
function place(rect: DOMRect): Placement {
  const vw = document.documentElement.clientWidth;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const width = Math.min(vw - EDGE * 2, Math.max(rect.width * 1.65, 16 * rem));
  let left = rect.left + rect.width / 2 - width / 2;
  // Perto das bordas, cresce para dentro da tela alinhada ao cartão (como na Netflix).
  if (left < EDGE) left = rect.left;
  else if (left + width > vw - EDGE) left = rect.right - width;
  return { rect, width, left: Math.max(EDGE, Math.min(left, vw - EDGE - width)) };
}

/**
 * Envolve um cartão (o primeiro link dentro dele) e mostra a prévia ampliada: depois de ~450 ms com o
 * mouse em cima ou ~600 ms com o foco do teclado. Em telas de toque não há prévia: o toque abre o título.
 */
export function CardPreviewAnchor({
  title,
  progress,
  remainingLabel,
  className,
  children,
}: {
  title: PreviewTitle;
  progress?: number;
  remainingLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Foco devolvido ao cartão pela própria prévia não deve reabri-la.
  const skipFocus = useRef(false);
  const overPreview = useRef(false);
  const [state, setState] = useState<(Placement & { leaving: boolean }) | null>(null);

  const card = () => root.current?.querySelector<HTMLElement>("a[href]") ?? null;
  const focusables = () => Array.from(preview.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
  const wait = (fn: () => void, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  };

  const kill = useCallback(() => {
    clearTimeout(timer.current);
    overPreview.current = false;
    setState(null);
    if (active?.owner === root) active = null;
  }, []);

  const show = () => {
    const rect = card()?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    if (active && active.owner !== root) active.close();
    active = { owner: root, close: kill };
    setState({ ...place(rect), leaving: false });
  };

  const hide = () => {
    clearTimeout(timer.current);
    if (matches("(prefers-reduced-motion: reduce)")) return kill();
    setState((s) => s && { ...s, leaving: true });
    timer.current = setTimeout(kill, EXIT_MS);
  };

  // Voltar com o mouse durante a saída mantém a prévia aberta.
  const keep = () => {
    clearTimeout(timer.current);
    setState((s) => s && (s.leaving ? { ...s, leaving: false } : s));
  };

  const backToCard = () => {
    skipFocus.current = true;
    card()?.focus({ preventScroll: true });
    hide();
  };

  // Esc fecha; rolar, redimensionar ou trocar de janela também (a prévia ficaria fora do lugar).
  const onDocumentKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (preview.current?.contains(document.activeElement)) backToCard();
    else hide();
  });
  const open = state !== null;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => onDocumentKey(e);
    // Só rolagens que movem o cartão (a página ou a fileira dele); outros carrosséis não fecham a prévia.
    const onScroll = (e: Event) => {
      if (e.target === document || (e.target instanceof Node && e.target.contains(root.current))) kill();
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", kill);
    window.addEventListener("blur", kill);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", kill);
      window.removeEventListener("blur", kill);
    };
  }, [open, kill]);

  useEffect(() => kill, [kill]);

  // Altura só se conhece depois de montar: centraliza a prévia no cartão sem passar das bordas e faz
  // a animação crescer a partir do próprio cartão.
  useLayoutEffect(() => {
    const el = preview.current;
    if (!el || !state) return;
    const { rect, left, width } = state;
    const height = el.offsetHeight;
    const vh = document.documentElement.clientHeight;
    const top = Math.max(EDGE, Math.min(rect.top + rect.height / 2 - height / 2, vh - height - EDGE));
    const s = rect.width / width;
    const originX = s < 1 ? (rect.left - left) / (1 - s) : width / 2;
    const originY = s < 1 ? (rect.top + rect.height / 2 - top - (height / 2) * s) / (1 - s) : height / 2;
    el.style.top = `${top}px`;
    el.style.transformOrigin = `${originX}px ${originY}px`;
  }, [state]);

  return (
    <>
      <div
        ref={root}
        className={className}
        onPointerEnter={(e) => {
          if (e.pointerType !== "mouse" || !matches(FINE_POINTER)) return;
          if (state) keep();
          else wait(show, HOVER_DELAY);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType !== "mouse") return;
          if (state) wait(hide, LEAVE_GRACE);
          else clearTimeout(timer.current);
        }}
        onPointerDown={() => clearTimeout(timer.current)}
        onFocus={(e) => {
          if (e.target !== card()) return;
          if (skipFocus.current) {
            skipFocus.current = false;
            return;
          }
          // Só foco de teclado/controle remoto (não o clique) e fora das telas de toque.
          if (e.target.matches(":focus-visible") && !matches("(pointer: coarse)")) wait(show, FOCUS_DELAY);
        }}
        onBlur={(e) => {
          if (e.relatedTarget && preview.current?.contains(e.relatedTarget)) return;
          if (state) hide();
          else clearTimeout(timer.current);
        }}
        onKeyDown={(e) => {
          // Tab no cartão entra na prévia aberta; Shift+Tab ou Tab no fim dela devolve ao cartão.
          if (e.key !== "Tab" || e.shiftKey || !state || state.leaving || e.target !== card()) return;
          const first = focusables()[0];
          if (!first) return;
          e.preventDefault();
          first.focus();
        }}
      >
        {children}
      </div>
      {state &&
        createPortal(
          <CardPreview
            ref={preview}
            title={title}
            progress={progress}
            remainingLabel={remainingLabel}
            width={state.width}
            left={state.left}
            from={state.rect.width / state.width}
            leaving={state.leaving}
            onPointerEnter={() => {
              overPreview.current = true;
              keep();
            }}
            onPointerLeave={(e) => {
              overPreview.current = false;
              if (e.pointerType === "mouse") wait(hide, LEAVE_GRACE);
            }}
            onFocusOut={(to) => {
              if (to && (preview.current?.contains(to) || to === card())) return;
              // Clique numa área sem foco da prévia (texto, imagem) não a fecha.
              if (!to && overPreview.current) return;
              hide();
            }}
            onEdgeTab={backToCard}
            onNavigate={kill}
          />,
          document.body,
        )}
    </>
  );
}

function CardPreview({
  ref,
  title,
  progress,
  remainingLabel,
  width,
  left,
  from,
  leaving,
  onPointerEnter,
  onPointerLeave,
  onFocusOut,
  onEdgeTab,
  onNavigate,
}: {
  ref: Ref<HTMLDivElement>;
  title: PreviewTitle;
  progress?: number;
  remainingLabel?: string;
  width: number;
  left: number;
  from: number;
  leaving: boolean;
  onPointerEnter: () => void;
  onPointerLeave: (e: ReactPointerEvent) => void;
  onFocusOut: (to: Node | null) => void;
  onEdgeTab: () => void;
  onNavigate: () => void;
}) {
  const headingId = useId();
  const id = encodeURIComponent(title.id);
  const full = isFullMovie(title);
  const genres = title.genreIds
    .map((g) => genreName(title.type, g))
    .filter((g): g is string => !!g)
    .slice(0, 3);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby={headingId}
      style={{ left, width, "--bob-from": from } as CSSProperties}
      className={`fixed top-0 z-[60] overflow-hidden rounded-xl bg-surface shadow-[0_1.5rem_4rem_-0.5rem_rgb(0_0_0/0.85)] ring-1 ring-white/10 transition-[scale,opacity] starting:scale-(--bob-from) starting:opacity-0 ${
        leaving ? "pointer-events-none scale-(--bob-from) opacity-0 duration-150 ease-in" : "scale-100 opacity-100 duration-300 ease-out-expo"
      }`}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onBlur={(e) => onFocusOut(e.relatedTarget)}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (e.target === (e.shiftKey ? items[0] : items.at(-1))) {
          e.preventDefault();
          onEdgeTab();
        }
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) onNavigate();
      }}
    >
      {/* A imagem também abre o título (como na Netflix); fora da ordem do Tab porque repete "Mais informações". */}
      <Link href={`/title/${title.type}/${id}`} tabIndex={-1} aria-hidden="true" className="relative block aspect-video overflow-hidden bg-surface">
        <div className="absolute inset-0 animate-ken-burns">
          <Artwork title={title} variant="backdrop" sizes={`${Math.ceil(width)}px`} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/10 to-transparent" />
      </Link>

      <div className="relative -mt-8 space-y-2.5 px-3.5 pb-3.5 3xl:space-y-3 3xl:px-4 3xl:pb-4">
        <h3 id={headingId} className="line-clamp-2 font-display text-base font-semibold leading-snug drop-shadow 3xl:text-lg">
          {title.title}
        </h3>

        <div className="flex items-center gap-2">
          <Link
            href={`/watch/${title.type}/${id}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-text pl-3 pr-4 text-sm font-semibold text-ink transition hover:bg-white active:scale-95"
          >
            <Icon name="play" size={16} />
            {full ? "Assistir" : "Ver trailer"}
          </Link>
          <QuickAdd title={title} />
          <Link
            href={`/title/${title.type}/${id}`}
            aria-label="Mais informações"
            title="Mais informações"
            className="ml-auto grid size-9 place-items-center rounded-full border-2 border-white/35 bg-black/30 transition hover:border-text hover:bg-white/10 active:scale-95"
          >
            <Icon name="chevron-down" size={18} />
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-text/80">
          <RatingBadge rating={title.ageRating} size="sm" />
          {title.year && <span className="font-medium">{title.year}</span>}
          <NewBadge title={title} size="xs" />
          <AvailabilityBadge title={title} size="xs" />
        </div>

        {genres.length > 0 && (
          <ul className="flex flex-wrap items-center gap-x-1.5 text-xs text-text/90" aria-label="Gêneros">
            {genres.map((g, i) => (
              <li key={g} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true" className="size-1 rounded-full bg-muted/70" />}
                {g}
              </li>
            ))}
          </ul>
        )}

        {remainingLabel && (
          <div className="flex items-center gap-2 text-xs font-medium text-amber">
            {progress !== undefined && (
              <span aria-hidden="true" className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                <span className="bg-brand block h-full" style={{ width: `${Math.min(100, Math.max(4, progress * 100))}%` }} />
              </span>
            )}
            <span className="flex shrink-0 items-center gap-1">
              <Icon name="clock" size={14} />
              {remainingLabel}
            </span>
          </div>
        )}

        {title.overview && <p className="line-clamp-2 text-xs leading-relaxed text-muted">{title.overview}</p>}
      </div>
    </div>
  );
}

/** "+ Minha Lista" rápido: só adiciona (repetir não remove), com aviso e atalho para a lista. */
function QuickAdd({ title }: { title: PreviewTitle }) {
  const [added, setAdded] = useState(false);
  const [pending, startTransition] = useTransition();
  const toasts = useWatchlistToasts();
  const label = added ? "Na Minha Lista" : "Adicionar à Minha Lista";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-busy={pending}
      onClick={() => {
        if (pending) return;
        startTransition(async () => {
          try {
            if (!(await addToWatchlist(title.type, title.id))) return toasts.failed();
            setAdded(true);
            toasts.added();
          } catch (err) {
            unstable_rethrow(err);
            toasts.failed();
          }
        });
      }}
      className={`grid size-9 place-items-center rounded-full border-2 bg-black/30 transition hover:bg-white/10 active:scale-95 aria-busy:opacity-70 ${
        added ? "border-amber text-amber" : "border-white/35 hover:border-text"
      }`}
    >
      <Icon key={added ? "check" : "plus"} name={added ? "check" : "plus"} size={18} className="animate-scale-in" />
    </button>
  );
}
