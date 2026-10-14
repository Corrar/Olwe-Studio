import "server-only";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

/**
 * Conta mais um uso de `key` e diz se ainda está dentro do limite. A contagem é atômica no banco
 * (vale entre instâncias da Vercel) e a janela recomeça sozinha depois de `windowSeconds`.
 */
export async function withinLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetAt: new Date((now + windowSeconds) * 1000) })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.resetAt} <= ${now} then 1 else ${rateLimits.count} + 1 end`,
        resetAt: sql`case when ${rateLimits.resetAt} <= ${now} then ${now + windowSeconds} else ${rateLimits.resetAt} end`,
      },
    })
    .returning({ count: rateLimits.count });
  return (row?.count ?? 1) <= limit;
}

/** IP de quem fez a requisição (na Vercel, o primeiro de x-forwarded-for é o do visitante). */
export async function clientIp() {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
}
