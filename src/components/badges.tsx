import { isFullMovie, type Title } from "@/lib/types";

/** Deixa claro se o título tem o filme completo ou apenas sinopse e trailer. */
export function AvailabilityBadge({ title, size = "md" }: { title: Pick<Title, "type">; size?: "sm" | "md" }) {
  const full = isFullMovie(title);
  const cls = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";
  return full ? (
    <span className={`rounded bg-emerald-500/90 font-semibold text-ink ${cls}`}>Filme completo · grátis</span>
  ) : (
    <span className={`rounded border border-white/25 bg-black/60 font-medium text-text/85 backdrop-blur ${cls}`}>
      Só sinopse e trailer
    </span>
  );
}
