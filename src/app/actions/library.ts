"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { watchlist } from "@/db/schema";
import { requireProfile } from "@/lib/dal";
import type { MediaType } from "@/lib/types";

export async function toggleWatchlist(mediaType: MediaType, tmdbId: number): Promise<boolean> {
  const profile = await requireProfile();
  const where = and(
    eq(watchlist.profileId, profile.id),
    eq(watchlist.mediaType, mediaType),
    eq(watchlist.tmdbId, tmdbId),
  );
  const existing = await db.query.watchlist.findFirst({ where });
  if (existing) {
    await db.delete(watchlist).where(where);
  } else {
    await db.insert(watchlist).values({ profileId: profile.id, mediaType, tmdbId });
  }
  revalidatePath("/my-list");
  revalidatePath("/browse");
  return !existing;
}
