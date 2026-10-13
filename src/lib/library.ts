import "server-only";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { progress, watchlist } from "@/db/schema";
import type { MediaType } from "./types";

export async function getWatchlist(profileId: string) {
  return db.query.watchlist.findMany({
    where: eq(watchlist.profileId, profileId),
    orderBy: desc(watchlist.addedAt),
    limit: 40,
  });
}

export async function isInWatchlist(profileId: string, mediaType: MediaType, itemId: string) {
  const row = await db.query.watchlist.findFirst({
    where: and(eq(watchlist.profileId, profileId), eq(watchlist.mediaType, mediaType), eq(watchlist.itemId, itemId)),
    columns: { itemId: true },
  });
  return !!row;
}

/** Filmes completos começados e ainda não terminados (menos de 95% assistidos). Trailers não contam. */
export async function getContinueWatching(profileId: string) {
  return db.query.progress.findMany({
    where: and(
      eq(progress.profileId, profileId),
      inArray(progress.mediaType, ["archive", "commons"]),
      gt(progress.position, 0),
      sql`${progress.duration} = 0 or ${progress.position} < ${progress.duration} * 0.95`,
    ),
    orderBy: desc(progress.updatedAt),
    limit: 20,
  });
}

export async function getProgress(profileId: string, mediaType: MediaType, itemId: string) {
  return db.query.progress.findFirst({
    where: and(eq(progress.profileId, profileId), eq(progress.mediaType, mediaType), eq(progress.itemId, itemId)),
  });
}
