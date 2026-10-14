import Link from "next/link";
import type { Title } from "@/lib/types";
import { Artwork } from "./artwork";
import { AvailabilityBadge, NewBadge } from "./badges";
import { RatingBadge } from "./rating-badge";

export function TitleCard({ title, progress }: { title: Title; progress?: number }) {
  return (
    <Link
      href={`/title/${title.type}/${encodeURIComponent(title.id)}`}
      className="group/card relative block w-36 shrink-0 snap-start sm:w-44 lg:w-48"
      title={title.title}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-2 ring-1 ring-white/5 transition duration-300 group-hover/card:scale-[1.04] group-hover/card:ring-amber/70">
        <Artwork title={title} variant="poster" sizes="(min-width: 1024px) 192px, (min-width: 640px) 176px, 144px" />
        <span className="absolute left-2 right-8 top-2 flex flex-wrap items-start gap-1">
          <NewBadge title={title} size="sm" />
          <AvailabilityBadge title={title} size="sm" />
        </span>
        <span className="absolute right-2 top-2">
          <RatingBadge rating={title.ageRating} size="sm" />
        </span>
        {progress !== undefined && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
            <div className="bg-brand h-full" style={{ width: `${Math.min(100, Math.max(4, progress * 100))}%` }} />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
        <span className="truncate">{title.title}</span>
        {title.rating > 0 && <span className="ml-auto shrink-0 text-amber">★ {title.rating.toFixed(1)}</span>}
      </div>
    </Link>
  );
}
