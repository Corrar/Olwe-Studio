import { createHash } from "node:crypto";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import type { Profile } from "@/db/schema";
import { adTagFor } from "@/lib/ads";
import { isPremium } from "@/lib/billing";
import { getTitle } from "@/lib/catalog";
import { getCurrentProfile, getCurrentUser } from "@/lib/dal";
import { consumeQuota, pruneRateLimits, withinLimit } from "@/lib/rate-limit";
import { accessFor, viewerOf } from "@/lib/ratings";
import { brazilDay, MAX_WATCH_SECONDS, recordActivity, recordTitleStats } from "@/lib/stats";
import { isFullMovie, MEDIA_TYPES, type MediaType } from "@/lib/types";

// Avisos do player para o painel: tempo assistido (a cada 30 s tocando e ao sair), a visualização (depois
// de 30 s assistidos) e cada anúncio que começou a passar.
//
// Esses números viram dinheiro no painel (licenças por visualização, divisão da receita, anúncios), então
// o servidor não confia no que chega: o título precisa existir e poder ser assistido pelo perfil, cada
// perfil conta no máximo uma visualização por título e por dia, o tempo assistido não passa do tempo real
// (uma hora por hora, com folga) e anúncio só conta onde o Olwe de fato passa anúncio.

const title = { mediaType: z.enum(MEDIA_TYPES), itemId: z.string().min(1).max(255) };
const bodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("watch"), ...title, seconds: z.number().min(0).max(3600), view: z.boolean() }),
  z.object({ kind: z.literal("ad"), ...title }),
]);

const HOUR = 60 * 60;
const DAY = 24 * HOUR;
/** Avisos por conta por hora: cinco perfis assistindo ao mesmo tempo cabem; um robô, não. */
const REQUESTS_PER_HOUR = 600;
/** Segundos assistidos aceitos por perfil por hora (uma hora de vídeo, com folga para os atrasos dos avisos). */
const WATCH_SECONDS_PER_HOUR = HOUR + 5 * 60;
/** Anúncios contados por perfil, título e dia (um intervalo antes de cada vez que o filme começa). */
const ADS_PER_TITLE_PER_DAY = 3;

/** Chave das janelas de limite: o hash não deixa na tabela quem assistiu o quê. */
const hashed = (...parts: string[]) => createHash("sha256").update(parts.join("\n")).digest("base64url").slice(0, 32);

type Checked = { allowed: boolean; premiumOnly: boolean; full: boolean };
// Títulos já conferidos nesta instância: o player avisa a cada 30 s e o catálogo não precisa ser consultado toda vez.
const checked = new Map<string, Checked & { until: number }>();

/** O título existe e este perfil pode assisti-lo (as mesmas regras da página do player)? */
async function check(mediaType: MediaType, itemId: string, profile: Profile, user: { premiumUntil: Date | null }): Promise<Checked> {
  const viewer = viewerOf(profile);
  const key = `${mediaType}:${itemId}:${viewer.maxRating}:${viewer.isKids}`;
  const now = Date.now();
  let result = checked.get(key);
  if (!result || result.until < now) {
    const t = await getTitle(mediaType, itemId).catch(() => null);
    const allowed = !!t && (await accessFor(t, viewer)).status === "allowed";
    result = { allowed, premiumOnly: !!t?.premiumOnly, full: !!t && isFullMovie(t), until: now + 10 * 60 * 1000 };
    if (checked.size > 5000) checked.clear();
    checked.set(key, result);
  }
  return { ...result, allowed: result.allowed && (!result.premiumOnly || isPremium(user)) };
}

export async function POST(request: Request) {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);
  if (!user || !profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  if (!(await withinLimit(`stats:user:${user.id}`, REQUESTS_PER_HOUR, HOUR))) return new NextResponse(null, { status: 429 });
  after(pruneRateLimits);

  const data = parsed.data;
  // Título que não existe ou que o perfil não pode ver: o aviso é ignorado (sem erro, o player não insiste).
  const target = await check(data.mediaType, data.itemId, profile, user);
  if (!target.allowed) return new NextResponse(null, { status: 204 });

  const day = brazilDay();
  if (data.kind === "watch") {
    const asked = Math.min(Math.round(data.seconds), MAX_WATCH_SECONDS);
    const watchSeconds = asked > 0 ? await consumeQuota(`stats:watch:${profile.id}`, asked, WATCH_SECONDS_PER_HOUR, HOUR) : 0;
    const views = data.view && (await withinLimit(`stats:view:${hashed(profile.id, data.mediaType, data.itemId, day)}`, 1, DAY)) ? 1 : 0;
    await recordTitleStats(data.mediaType, data.itemId, { views, watchSeconds });
  } else if (
    // Anúncio só passa nos filmes completos, para quem está no Grátis e fora do perfil infantil.
    target.full &&
    adTagFor(user, profile) &&
    (await withinLimit(`stats:ad:${hashed(profile.id, data.mediaType, data.itemId, day)}`, ADS_PER_TITLE_PER_DAY, DAY))
  ) {
    await recordTitleStats(data.mediaType, data.itemId, { adImpressions: 1 });
  }
  await recordActivity(user.id);
  return new NextResponse(null, { status: 204 });
}
