"use client";

import { useOptimistic, useTransition } from "react";
import { toggleWatchlist } from "@/app/actions/library";
import type { MediaType } from "@/lib/types";

export function WatchlistButton({ mediaType, tmdbId, initial }: { mediaType: MediaType; tmdbId: number; initial: boolean }) {
  const [saved, setSaved] = useOptimistic(initial);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={saved}
      onClick={() =>
        startTransition(async () => {
          setSaved(!saved);
          await toggleWatchlist(mediaType, tmdbId);
        })
      }
      className="rounded-full bg-white/10 px-6 py-3 font-semibold backdrop-blur transition hover:bg-white/20 disabled:opacity-70"
    >
      {saved ? "✓ Na Minha Lista" : "+ Minha Lista"}
    </button>
  );
}
