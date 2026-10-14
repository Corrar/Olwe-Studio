import Link from "next/link";
import { isFullMovie, type Title } from "@/lib/types";
import { Artwork } from "./artwork";
import { AvailabilityBadge, NewBadge, QualityBadge } from "./badges";
import { CardPreviewAnchor, type PreviewTitle } from "./card-preview";
import { Icon } from "./icons";
import { RatingBadge, ratingText } from "./rating-badge";

// Larguras de var(--card-w) em cada ponto de quebra (ver globals.css), para o next/image escolher o tamanho.
const POSTER_SIZES =
  "(min-width: 160rem) 380px, (min-width: 120rem) 261px, (min-width: 80rem) 192px, (min-width: 64rem) 176px, (min-width: 40rem) 152px, 116px";

const OVERVIEW_CHARS = 220;

function previewOf(t: Title): PreviewTitle {
  const overview = t.overview.length > OVERVIEW_CHARS ? `${t.overview.slice(0, OVERVIEW_CHARS).trimEnd()}…` : t.overview;
  return {
    id: t.id,
    type: t.type,
    title: t.title,
    overview,
    poster: t.poster,
    backdrop: t.backdrop,
    year: t.year,
    genreIds: t.genreIds,
    quality: t.quality,
    isNew: t.isNew,
    ageRating: t.ageRating,
  };
}

/**
 * Cartão só com a capa (2:3), como na Netflix e no Prime Video: o nome fica no link (aria-label) e,
 * no mouse ou teclado, na prévia ampliada. fluid ocupa a largura do contêiner (grades) em vez de var(--card-w).
 */
export function TitleCard({
  title,
  progress,
  remainingLabel,
  priority,
  rank,
  fluid,
}: {
  title: Title;
  /** 0 a 1, para "Continuar assistindo". */
  progress?: number;
  /** "Faltam 42 min". */
  remainingLabel?: string;
  priority?: boolean;
  /** Posição no Top 10: muda o nome acessível e mostra o selo. */
  rank?: number;
  fluid?: boolean;
}) {
  const name = title.year ? `${title.title} (${title.year})` : title.title;
  // Os selos da capa também são ditos no nome do link (o leitor de tela não os lê sozinhos dentro dele).
  const availability = isFullMovie(title) ? `Filme completo, ${title.premiumOnly ? "exclusivo Premium" : "grátis"}${title.quality ? `, ${title.quality}` : ""}` : "Só sinopse e trailer";
  const label = [
    rank ? `${rank}º lugar: ${name}` : name,
    title.ageRating ? ratingText(title.ageRating) : null,
    title.isNew ? "Novo" : null,
    availability,
    remainingLabel,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <CardPreviewAnchor
      title={previewOf(title)}
      progress={progress}
      remainingLabel={remainingLabel}
      className={`relative ${fluid ? "w-full" : "card-w"} ${rank ? "" : "snap-start"}`}
    >
      <Link
        href={`/title/${title.type}/${encodeURIComponent(title.id)}`}
        aria-label={label}
        className="group/card relative block aspect-[2/3] overflow-hidden rounded-md bg-surface-2 shadow-lg shadow-black/40 ring-1 ring-inset ring-white/[0.07] transition duration-300 ease-out-expo active:scale-[0.98] sm:rounded-lg pointer-fine:hover:ring-white/35"
      >
        <div className="absolute inset-0 transition-transform duration-700 ease-out-expo pointer-fine:group-hover/card:scale-[1.04]">
          <Artwork title={title} variant="poster" priority={priority} sizes={POSTER_SIZES} />
        </div>

        {/* Selos pequenos nos cantos; a faixa de baixo tem um degradê para o selo de disponibilidade. */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-x-1.5 top-1.5 flex items-start justify-between gap-1">
          <div className="flex flex-col items-start gap-1">
            {rank !== undefined && <Top10Badge />}
            <NewBadge title={title} size="xs" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <RatingBadge rating={title.ageRating} size="sm" />
            <QualityBadge title={title} size="xs" />
          </div>
        </div>
        <div className={`absolute inset-x-1.5 flex ${progress !== undefined ? "bottom-3.5" : "bottom-1.5"}`}>
          <AvailabilityBadge title={title} size="xs" quality={false} />
        </div>

        {progress !== undefined && (
          <div aria-hidden="true" className="absolute inset-x-1.5 bottom-1.5 h-1 overflow-hidden rounded-full bg-white/25">
            <div className="bg-brand h-full rounded-full" style={{ width: `${Math.min(100, Math.max(4, progress * 100))}%` }} />
          </div>
        )}
      </Link>
    </CardPreviewAnchor>
  );
}

function Top10Badge() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-[0.3125rem] bg-ink/85 px-1 py-[0.1875rem] text-[0.5625rem] font-extrabold leading-none tracking-wider text-text ring-1 ring-inset ring-amber/60 backdrop-blur-sm sm:text-[0.625rem]">
      <Icon name="trophy" size={11} className="text-amber" />
      TOP 10
    </span>
  );
}
