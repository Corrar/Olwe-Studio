import { RATING_COLORS, ratingLabel, type RatingInfo } from "@/lib/classification";

const SOURCE_NOTE: Record<RatingInfo["source"], string> = {
  oficial: "Classificação indicativa oficial",
  equivalente: "Equivalente à classificação americana",
  estimada: "Classificação estimada pelo Olwe",
};

// Em rem para crescer junto com o texto nas TVs.
const DIMS = {
  sm: "h-5 min-w-5 rounded-[0.25rem] px-1 text-[0.625rem]",
  md: "h-7 min-w-7 rounded-[0.3125rem] px-1 text-xs",
  lg: "h-9 min-w-9 rounded-md px-1.5 text-base",
};

/** Texto falado da classificação (leitores de tela). */
export function ratingText(rating: RatingInfo) {
  return `${rating.value === 0 ? "Livre" : `Não recomendado para menores de ${rating.value} anos`} (${SOURCE_NOTE[rating.source].toLowerCase()})`;
}

/** Selo da classificação indicativa nas cores do ClassInd. Estimativas levam um asterisco. */
export function RatingBadge({ rating, size = "md" }: { rating: RatingInfo | null | undefined; size?: "sm" | "md" | "lg" }) {
  if (!rating) return null;
  const { bg, fg } = RATING_COLORS[rating.value];
  return (
    <span
      role="img"
      title={SOURCE_NOTE[rating.source]}
      aria-label={ratingText(rating)}
      className={`inline-flex shrink-0 items-center justify-center font-display font-bold leading-none shadow-md shadow-black/40 ring-1 ring-inset ring-black/15 ${DIMS[size]}`}
      style={{ background: bg, color: fg }}
    >
      {ratingLabel(rating.value)}
      {rating.source === "estimada" && "*"}
    </span>
  );
}
