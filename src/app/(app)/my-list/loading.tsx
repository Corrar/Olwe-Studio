import { GridSkeleton, LoadingNote, PAGE_TOP } from "@/components/catalog-page";

export default function MyListLoading() {
  return (
    <div className={`gutter pb-12 ${PAGE_TOP}`}>
      <LoadingNote />
      <div className="mb-6 flex items-baseline gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Minha Lista</h1>
      </div>
      <GridSkeleton count={12} />
    </div>
  );
}
