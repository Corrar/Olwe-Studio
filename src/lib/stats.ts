import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyActivity, titleStats } from "@/db/schema";
import type { MediaType } from "./types";

// Coleta das estatísticas do painel (/admin): contas ativas por dia e, por título, visualizações, tempo
// assistido e anúncios exibidos. Tudo agregado por dia no horário de Brasília: nada do que a pessoa
// assiste fica guardado com o nome dela, só as contagens do dia.

const BRAZIL_OFFSET_MS = 3 * 60 * 60 * 1000;

/** "AAAA-MM-DD" no horário de Brasília (o Brasil não tem mais horário de verão). */
export const brazilDay = (date = new Date()) => new Date(date.getTime() - BRAZIL_OFFSET_MS).toISOString().slice(0, 10);

/** Tempo assistido aceito num aviso do player (ele avisa a cada 30 s; aba em segundo plano atrasa os avisos). */
export const MAX_WATCH_SECONDS = 300;

// Por instância do servidor: cada conta é gravada uma vez por dia, não a cada página aberta.
const seen = new Map<string, string>();

/** Marca a conta como ativa hoje. Falhar aqui nunca atrapalha a página. */
export async function recordActivity(userId: string) {
  const day = brazilDay();
  if (seen.get(userId) === day) return;
  try {
    await db.insert(dailyActivity).values({ day, userId }).onConflictDoNothing();
    if (seen.size > 10_000) seen.clear();
    seen.set(userId, day);
  } catch (err) {
    console.error("[stats] atividade", err);
  }
}

/** Soma visualizações, tempo assistido e anúncios ao título, no dia de hoje. */
export async function recordTitleStats(
  mediaType: MediaType,
  itemId: string,
  { views = 0, watchSeconds = 0, adImpressions = 0 }: { views?: number; watchSeconds?: number; adImpressions?: number },
) {
  if (!views && !watchSeconds && !adImpressions) return;
  await db
    .insert(titleStats)
    .values({ day: brazilDay(), mediaType, itemId, views, watchSeconds, adImpressions })
    .onConflictDoUpdate({
      target: [titleStats.day, titleStats.mediaType, titleStats.itemId],
      set: {
        views: sql`${titleStats.views} + ${views}`,
        watchSeconds: sql`${titleStats.watchSeconds} + ${watchSeconds}`,
        adImpressions: sql`${titleStats.adImpressions} + ${adImpressions}`,
      },
    });
}
