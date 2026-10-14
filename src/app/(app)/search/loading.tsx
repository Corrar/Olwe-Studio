import { GridSkeleton, LoadingNote, PAGE_TOP } from "@/components/catalog-page";

/** Contêiner da busca, igual na página e no carregamento (nada pula quando os resultados chegam). */
export const SEARCH_PAGE = `gutter pb-12 ${PAGE_TOP}`;

export default function SearchLoading() {
  return (
    <div className={SEARCH_PAGE}>
      <LoadingNote />
      <div aria-hidden="true" className="skeleton mb-8 h-8 w-72 max-w-full rounded-lg sm:h-9" />
      <GridSkeleton count={12} />
    </div>
  );
}
