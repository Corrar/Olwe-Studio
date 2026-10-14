import { isFullMovie, type Title } from "@/lib/types";

/** Deixa claro se o título tem o filme completo (com a qualidade) ou apenas sinopse e trailer. */
export function AvailabilityBadge({ title, size = "md" }: { title: Pick<Title, "type" | "quality">; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";
  if (!isFullMovie(title)) {
    return (
      <span className={`rounded border border-white/25 bg-black/60 font-medium text-text/85 backdrop-blur ${cls}`}>
        Só sinopse e trailer
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={`rounded bg-emerald-500/90 font-semibold text-ink ${cls}`}>Filme completo · grátis</span>
      {title.quality && (
        <span className={`rounded border border-amber/70 bg-black/60 font-semibold text-amber backdrop-blur ${cls}`}>
          {title.quality}
        </span>
      )}
    </span>
  );
}

/** Selo "Novo": lançamento recente (TMDB) ou adicionado recentemente à fonte (filmes completos). */
export function NewBadge({ title, size = "md" }: { title: Pick<Title, "isNew">; size?: "sm" | "md" }) {
  if (!title.isNew) return null;
  const cls = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";
  return <span className={`bg-brand rounded font-bold uppercase tracking-wide text-ink shadow ${cls}`}>Novo</span>;
}
