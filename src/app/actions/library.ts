"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { watchlist } from "@/db/schema";
import { requireProfile } from "@/lib/dal";
import { isMediaType, type MediaType } from "@/lib/types";

export async function toggleWatchlist(mediaType: MediaType, itemId: string): Promise<boolean> {
  if (!isMediaType(mediaType) || typeof itemId !== "string" || !itemId || itemId.length > 255) return false;
  const profile = await requireProfile();
  const where = and(
    eq(watchlist.profileId, profile.id),
    eq(watchlist.mediaType, mediaType),
    eq(watchlist.itemId, itemId),
  );
  const existing = await db.query.watchlist.findFirst({ where });
  if (existing) {
    await db.delete(watchlist).where(where);
  } else {
    await db.insert(watchlist).values({ profileId: profile.id, mediaType, itemId });
  }
  revalidatePath("/my-list");
  revalidatePath("/browse");
  revalidatePath("/free");
  return !existing;
}
