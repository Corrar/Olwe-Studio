import { LoadingNote, RowSkeleton, RowStack } from "@/components/catalog-page";
import { HeroSkeleton } from "@/components/hero";

export default function BrowseLoading() {
  return (
    <>
      <LoadingNote />
      <HeroSkeleton />
      <RowStack>
        <RowSkeleton top10 />
        <RowSkeleton />
        <RowSkeleton />
      </RowStack>
    </>
  );
}
