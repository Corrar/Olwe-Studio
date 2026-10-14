import { isFullMovie, type Title } from "@/lib/types";
import { Icon } from "./icons";

type BadgeSize = "xs" | "sm" | "md";

// Em rem para crescer junto com o texto nas TVs. xs é o selo compacto sobre a capa dos cartões: nos
// cartões de celular (7,25rem) fica um pouco menor para "Filme completo · grátis" caber numa linha.
const SIZES: Record<BadgeSize, string> = {
  xs: "gap-0.5 px-1 py-[0.1875rem] text-[0.5625rem] leading-tight sm:px-1.5 sm:text-[0.625rem]",
  sm: "gap-1 px-1.5 py-0.5 text-[0.6875rem] leading-tight",
  md: "gap-1 px-2 py-0.5 text-xs leading-5",
};

const CHIP = "inline-flex items-center rounded-[0.3125rem] font-semibold";

/**
 * Deixa claro se o título tem o filme completo (com a qualidade) ou apenas sinopse e trailer.
 * Com quality={false}, a qualidade fica de fora (o cartão mostra QualityBadge em outro canto).
 */
export function AvailabilityBadge({
  title,
  size = "md",
  quality = true,
}: {
  title: Pick<Title, "type" | "quality">;
  size?: BadgeSize;
  quality?: boolean;
}) {
  const cls = `${CHIP} ${SIZES[size]} ${size === "xs" ? "tracking-tight sm:tracking-normal" : ""}`;
  if (!isFullMovie(title)) {
    return (
      <span className={`${cls} border border-white/20 bg-black/55 text-text/85 backdrop-blur-sm`}>
        {size === "md" && <Icon name="film" size={13} className="shrink-0 opacity-80" />}
        Só sinopse e trailer
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={`${cls} bg-emerald-400 text-ink shadow-sm shadow-black/40`}>
        {size !== "xs" && <Icon name="play" size={size === "md" ? 12 : 10} className="shrink-0" />}
        Filme completo · grátis
      </span>
      {quality && <QualityBadge title={title} size={size} />}
    </span>
  );
}

/** Qualidade do vídeo dos filmes completos ("4K", "Full HD", "HD", "SD"). */
export function QualityBadge({ title, size = "md" }: { title: Pick<Title, "quality">; size?: BadgeSize }) {
  if (!title.quality) return null;
  return (
    <span className={`${CHIP} border border-amber/70 bg-black/60 tracking-wide text-amber backdrop-blur-sm ${SIZES[size]}`}>
      {title.quality}
    </span>
  );
}

/** Selo "Novo": lançamento recente (TMDB) ou adicionado recentemente à fonte (filmes completos). */
export function NewBadge({ title, size = "md" }: { title: Pick<Title, "isNew">; size?: BadgeSize }) {
  if (!title.isNew) return null;
  return (
    <span className={`bg-brand ${CHIP} font-extrabold uppercase tracking-wider text-ink shadow-md shadow-black/40 ${SIZES[size]}`}>
      Novo
    </span>
  );
}
