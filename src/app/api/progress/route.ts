import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { progress } from "@/db/schema";
import { getCurrentProfile } from "@/lib/dal";

const bodySchema = z.object({
  mediaType: z.enum(["movie", "tv", "archive", "commons"]),
  itemId: z.string().min(1).max(200),
  position: z.number().min(0),
  duration: z.number().min(0),
});

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { mediaType, itemId } = parsed.data;
  const position = Math.floor(parsed.data.position);
  const duration = Math.floor(parsed.data.duration);
  const now = new Date();

  await db
    .insert(progress)
    .values({ profileId: profile.id, mediaType, itemId, position, duration, updatedAt: now })
    .onConflictDoUpdate({
      target: [progress.profileId, progress.mediaType, progress.itemId],
      set: { position, duration, updatedAt: now },
    });

  return new NextResponse(null, { status: 204 });
}
