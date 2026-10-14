import { FreeIntro, LoadingNote, RowSkeleton, RowStack } from "@/components/catalog-page";
import { HeroSkeleton } from "@/components/hero";
import { FREE_SHELVES } from "@/lib/free";

export default function FreeLoading() {
  return (
    <>
      <LoadingNote />
      <HeroSkeleton />
      <RowStack>
        <FreeIntro />
        {FREE_SHELVES.slice(0, 3).map((s) => (
          <RowSkeleton key={s.key} label={s.label} />
        ))}
      </RowStack>
    </>
  );
}
