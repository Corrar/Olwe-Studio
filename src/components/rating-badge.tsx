import { RATING_COLORS, ratingLabel, type RatingInfo } from "@/lib/classification";

const SOURCE_NOTE: Record<RatingInfo["source"], string> = {
  oficial: "Classificação indicativa oficial",
  equivalente: "Equivalente à classificação americana",
  estimada: "Classificação estimada pelo Olwe",
};

/** Selo da classificação indicativa nas cores do ClassInd. Estimativas levam um asterisco. */
export function RatingBadge({ rating, size = "md" }: { rating: RatingInfo | null | undefined; size?: "sm" | "md" | "lg" }) {
  if (!rating) return null;
  const { bg, fg } = RATING_COLORS[rating.value];
  const label = ratingLabel(rating.value);
  const dims = size === "sm" ? "min-w-5 h-5 text-[10px] px-1" : size === "lg" ? "min-w-9 h-9 text-base px-1.5" : "min-w-7 h-7 text-xs px-1";
  return (
    <span
      title={SOURCE_NOTE[rating.source]}
      aria-label={`${rating.value === 0 ? "Livre" : `Não recomendado para menores de ${rating.value} anos`} (${SOURCE_NOTE[rating.source].toLowerCase()})`}
      className={`inline-flex items-center justify-center rounded font-display font-bold leading-none shadow ${dims}`}
      style={{ background: bg, color: fg }}
    >
      {label}
      {rating.source === "estimada" && "*"}
    </span>
  );
}
