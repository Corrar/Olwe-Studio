import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/dal";
import { withinLimit } from "@/lib/rate-limit";
import { MAX_WATCH_SECONDS, recordActivity, recordTitleStats } from "@/lib/stats";
import { MEDIA_TYPES } from "@/lib/types";

// Avisos do player para o painel: tempo assistido (a cada 30 s tocando e ao sair), a visualização (depois
// de 30 s assistidos) e cada anúncio que começou a passar.
const title = { mediaType: z.enum(MEDIA_TYPES), itemId: z.string().min(1).max(255) };
const bodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("watch"), ...title, seconds: z.number().min(0).max(3600), view: z.boolean() }),
  z.object({ kind: z.literal("ad"), ...title }),
]);

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  // Alguns players abertos ao mesmo tempo cabem com folga; um robô inflando os números, não.
  if (!(await withinLimit(`stats:profile:${profile.id}`, 400, 60 * 60))) return new NextResponse(null, { status: 429 });

  const data = parsed.data;
  if (data.kind === "watch") {
    await recordTitleStats(data.mediaType, data.itemId, {
      views: data.view ? 1 : 0,
      watchSeconds: Math.min(Math.round(data.seconds), MAX_WATCH_SECONDS),
    });
  } else {
    await recordTitleStats(data.mediaType, data.itemId, { adImpressions: 1 });
  }
  await recordActivity(profile.userId);
  return new NextResponse(null, { status: 204 });
}
