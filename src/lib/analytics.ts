import "server-only";
import { and, between, count, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { charges, dailyActivity, profiles, settings, subscriptions, titleStats, users, type LicensedTitle } from "@/db/schema";
import { adsEnabled } from "./ads";
import { billingEnabled, PREMIUM_PRICE } from "./billing";
import { getTitle } from "./catalog";
import { formatCents } from "./money";
import { brazilDay } from "./stats";
import type { MediaType } from "./types";

// Números do painel (/admin), no estilo do YouTube Studio: um período (7, 28, 90 ou 365 dias, até hoje
// no horário de Brasília) comparado ao período anterior do mesmo tamanho.
//
// Receita líquida = assinaturas pagas (Pix e cartão) − tarifas do Mercado Pago + anúncios (estimados pelo
// CPM informado no painel). Lucro = receita líquida − licenças do período − custos fixos do período.

export const PERIODS = [7, 28, 90, 365] as const;
export type Period = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: Period = 28;

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_PER_MONTH = 365 / 12;
/** Filmes completos (o que gera receita); trailers do TMDB ficam de fora da divisão da receita. */
const FULL_TYPES: MediaType[] = ["archive", "commons", "licensed"];

/* --------------------------------- Datas --------------------------------- */

/** Soma dias a "AAAA-MM-DD". */
export const shiftDay = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** Meia-noite do dia no horário de Brasília. */
const startOfDay = (day: string) => new Date(`${day}T00:00:00-03:00`);

type Range = { from: string; to: string; days: number; start: Date; end: Date };

function rangeOf(from: string, days: number): Range {
  const to = shiftDay(from, days - 1);
  return { from, to, days, start: startOfDay(from), end: startOfDay(shiftDay(to, 1)) };
}

/** Período escolhido (terminando hoje) e o anterior, do mesmo tamanho. */
function rangesFor(period: Period, today = brazilDay()) {
  const current = rangeOf(shiftDay(today, -(period - 1)), period);
  return { current, previous: rangeOf(shiftDay(current.from, -period), period) };
}

/** Dias em comum (fração) entre o período e um intervalo [start, end). */
function overlapDays(range: Range, start: Date, end: Date | null) {
  const from = Math.max(range.start.getTime(), start.getTime());
  const to = Math.min(range.end.getTime(), end?.getTime() ?? Infinity);
  return Math.max(0, to - from) / DAY_MS;
}

/* ------------------------------ Configurações ------------------------------ */

export type DashboardSettings = {
  /** Receita estimada por mil anúncios exibidos, em centavos. */
  adCpmCents: number;
  /** Custos fixos por mês (hospedagem, Mux, domínio...), em centavos. */
  fixedCostsCents: number;
};

const SETTING_KEYS = { adCpmCents: "ad_cpm_cents", fixedCostsCents: "fixed_costs_cents" } as const;

export async function getDashboardSettings(): Promise<DashboardSettings> {
  const rows = await db.select().from(settings).where(inArray(settings.key, Object.values(SETTING_KEYS)));
  const value = (key: string) => {
    const n = Number(rows.find((r) => r.key === key)?.value);
    return Number.isSafeInteger(n) && n >= 0 ? n : 0;
  };
  return { adCpmCents: value(SETTING_KEYS.adCpmCents), fixedCostsCents: value(SETTING_KEYS.fixedCostsCents) };
}

export async function saveDashboardSettings(values: DashboardSettings) {
  const now = new Date();
  for (const [field, key] of Object.entries(SETTING_KEYS) as [keyof DashboardSettings, string][]) {
    const value = String(values[field]);
    await db.insert(settings).values({ key, value, updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } });
  }
}

/* --------------------------------- Séries --------------------------------- */

export type DayPoint = {
  day: string;
  views: number;
  watchSeconds: number;
  /** Tempo assistido só de filmes completos (base da divisão da receita). */
  fullWatchSeconds: number;
  adImpressions: number;
  activeUsers: number;
  signups: number;
  grossCents: number;
  feeCents: number;
  /** Assinaturas − tarifas + anúncios estimados. */
  netCents: number;
};

export type Totals = Omit<DayPoint, "day" | "activeUsers"> & {
  /** Contas diferentes que usaram o Olwe no período. */
  activeUsers: number;
  adCents: number;
};

const brazilDate = (column: typeof users.createdAt | typeof charges.paidAt) => sql<string>`date(${column}, 'unixepoch', '-3 hours')`;

async function seriesFor(range: Range, adCpmCents: number): Promise<{ points: DayPoint[]; totals: Totals }> {
  const signupDay = brazilDate(users.createdAt);
  const chargeDay = brazilDate(charges.paidAt);
  const [titleRows, activeRows, [unique], signupRows, chargeRows] = await Promise.all([
    db
      .select({
        day: titleStats.day,
        views: sql<number>`sum(${titleStats.views})`,
        watchSeconds: sql<number>`sum(${titleStats.watchSeconds})`,
        fullWatchSeconds: sql<number>`sum(case when ${inArray(titleStats.mediaType, FULL_TYPES)} then ${titleStats.watchSeconds} else 0 end)`,
        adImpressions: sql<number>`sum(${titleStats.adImpressions})`,
      })
      .from(titleStats)
      .where(between(titleStats.day, range.from, range.to))
      .groupBy(titleStats.day),
    db
      .select({ day: dailyActivity.day, users: count() })
      .from(dailyActivity)
      .where(between(dailyActivity.day, range.from, range.to))
      .groupBy(dailyActivity.day),
    db
      .select({ users: sql<number>`count(distinct ${dailyActivity.userId})` })
      .from(dailyActivity)
      .where(between(dailyActivity.day, range.from, range.to)),
    db
      .select({ day: signupDay, signups: count() })
      .from(users)
      .where(and(gte(users.createdAt, range.start), lt(users.createdAt, range.end)))
      .groupBy(signupDay),
    db
      .select({
        day: chargeDay,
        grossCents: sql<number>`sum(${charges.amountCents})`,
        feeCents: sql<number>`sum(coalesce(${charges.feeCents}, 0))`,
      })
      .from(charges)
      .where(and(gte(charges.paidAt, range.start), lt(charges.paidAt, range.end)))
      .groupBy(chargeDay),
  ]);

  const byDay = <T extends { day: string }>(rows: T[]) => new Map(rows.map((r) => [r.day, r]));
  const titles = byDay(titleRows);
  const active = byDay(activeRows);
  const signups = byDay(signupRows);
  const money = byDay(chargeRows);

  const points: DayPoint[] = [];
  for (let i = 0; i < range.days; i++) {
    const day = shiftDay(range.from, i);
    const t = titles.get(day);
    const m = money.get(day);
    const adImpressions = Number(t?.adImpressions ?? 0);
    const grossCents = Number(m?.grossCents ?? 0);
    const feeCents = Number(m?.feeCents ?? 0);
    points.push({
      day,
      views: Number(t?.views ?? 0),
      watchSeconds: Number(t?.watchSeconds ?? 0),
      fullWatchSeconds: Number(t?.fullWatchSeconds ?? 0),
      adImpressions,
      activeUsers: Number(active.get(day)?.users ?? 0),
      signups: Number(signups.get(day)?.signups ?? 0),
      grossCents,
      feeCents,
      netCents: grossCents - feeCents + Math.round((adImpressions * adCpmCents) / 1000),
    });
  }

  const sum = (key: keyof Omit<DayPoint, "day">) => points.reduce((total, p) => total + p[key], 0);
  const adImpressions = sum("adImpressions");
  const grossCents = sum("grossCents");
  const feeCents = sum("feeCents");
  const adCents = Math.round((adImpressions * adCpmCents) / 1000);
  return {
    points,
    totals: {
      views: sum("views"),
      watchSeconds: sum("watchSeconds"),
      fullWatchSeconds: sum("fullWatchSeconds"),
      adImpressions,
      activeUsers: Number(unique?.users ?? 0),
      signups: sum("signups"),
      grossCents,
      feeCents,
      adCents,
      netCents: grossCents - feeCents + adCents,
    },
  };
}

/* -------------------------------- Licenças -------------------------------- */

export const COST_MODEL_LABELS: Record<LicensedTitle["costModel"], string> = {
  none: "Sem custo",
  flat: "Valor fixo",
  monthly: "Por mês",
  per_view: "Por visualização",
  share: "% da receita",
};

export type LicenseDue = {
  id: string;
  title: string;
  licensor: string;
  model: LicensedTitle["costModel"];
  /** "R$ 500,00 por mês", "50% da receita"... */
  terms: string;
  views: number;
  watchSeconds: number;
  amountCents: number;
  licenseEnd: Date | null;
};

type TitleUse = { views: number; watchSeconds: number };

/** Quanto a licença custa no período. */
function licenseCost(t: LicensedTitle, range: Range, use: TitleUse, totals: Pick<Totals, "netCents" | "fullWatchSeconds">) {
  const start = t.licenseStart ?? t.createdAt;
  switch (t.costModel) {
    case "per_view":
      return t.costCents * use.views;
    case "share":
      // Receita do filme: a do período, dividida pelo tempo assistido de cada filme completo.
      return totals.fullWatchSeconds > 0 ? Math.round((totals.netCents * use.watchSeconds * t.revenueShare) / (totals.fullWatchSeconds * 100)) : 0;
    case "monthly":
      return Math.round((t.costCents * overlapDays(range, start, t.licenseEnd)) / DAYS_PER_MONTH);
    case "flat": {
      // Valor do contrato distribuído pelos dias da licença (sem fim: 12 meses a partir do início).
      const end = t.licenseEnd ?? new Date(start.getTime() + 365 * DAY_MS);
      const total = Math.max(1, (end.getTime() - start.getTime()) / DAY_MS);
      return Math.round((t.costCents * overlapDays(range, start, end)) / total);
    }
    default:
      return 0;
  }
}

function termsOf(t: LicensedTitle) {
  switch (t.costModel) {
    case "flat":
      return `${formatCents(t.costCents)} pelo contrato`;
    case "monthly":
      return `${formatCents(t.costCents)} por mês`;
    case "per_view":
      return `${formatCents(t.costCents)} por visualização`;
    case "share":
      return `${t.revenueShare}% da receita`;
    default:
      return "Sem custo";
  }
}

async function licensedUse(range: Range) {
  const rows = await db
    .select({
      itemId: titleStats.itemId,
      views: sql<number>`sum(${titleStats.views})`,
      watchSeconds: sql<number>`sum(${titleStats.watchSeconds})`,
    })
    .from(titleStats)
    .where(and(eq(titleStats.mediaType, "licensed"), between(titleStats.day, range.from, range.to)))
    .groupBy(titleStats.itemId);
  return new Map(rows.map((r) => [r.itemId, { views: Number(r.views), watchSeconds: Number(r.watchSeconds) }]));
}

/* ---------------------------------- Painel ---------------------------------- */

export type Finance = {
  grossCents: number;
  feeCents: number;
  adCents: number;
  netCents: number;
  licenseCents: number;
  fixedCents: number;
  profitCents: number;
};

export type TopTitle = {
  mediaType: MediaType;
  itemId: string;
  title: string;
  views: number;
  watchSeconds: number;
  adImpressions: number;
};

export type Dashboard = {
  period: Period;
  range: { from: string; to: string };
  points: DayPoint[];
  totals: Totals;
  previous: Totals;
  finance: Finance;
  previousFinance: Finance;
  licenses: LicenseDue[];
  expiring: { id: string; title: string; licenseEnd: Date }[];
  topTitles: TopTitle[];
  audience: {
    totalUsers: number;
    premiumUsers: number;
    profiles: number;
    kidsProfiles: number;
    cardSubscriptions: number;
    /** Premium ativos × preço do mês. */
    mrrCents: number;
  };
  settings: DashboardSettings;
  billing: boolean;
  ads: boolean;
};

async function titleName(mediaType: MediaType, itemId: string, licensed: Map<string, string>) {
  if (mediaType === "licensed") return licensed.get(itemId) ?? "Filme licenciado excluído";
  try {
    return (await getTitle(mediaType, itemId))?.title ?? itemId;
  } catch {
    return itemId;
  }
}

export async function getDashboard(period: Period): Promise<Dashboard> {
  const now = new Date();
  const { current, previous } = rangesFor(period, brazilDay(now));
  const config = await getDashboardSettings();

  const [cur, prev, useNow, usePrev, titles, topRows, [userCounts], [profileCounts], [cards]] = await Promise.all([
    seriesFor(current, config.adCpmCents),
    seriesFor(previous, config.adCpmCents),
    licensedUse(current),
    licensedUse(previous),
    db.query.licensedTitles.findMany(),
    db
      .select({
        mediaType: titleStats.mediaType,
        itemId: titleStats.itemId,
        views: sql<number>`sum(${titleStats.views})`,
        watchSeconds: sql<number>`sum(${titleStats.watchSeconds})`,
        adImpressions: sql<number>`sum(${titleStats.adImpressions})`,
      })
      .from(titleStats)
      .where(between(titleStats.day, current.from, current.to))
      .groupBy(titleStats.mediaType, titleStats.itemId)
      .orderBy(desc(sql`sum(${titleStats.watchSeconds})`), desc(sql`sum(${titleStats.views})`))
      .limit(10),
    db
      .select({ total: count(), premium: sql<number>`sum(case when ${users.premiumUntil} > ${Math.floor(now.getTime() / 1000)} then 1 else 0 end)` })
      .from(users),
    db.select({ total: count(), kids: sql<number>`sum(case when ${profiles.isKids} then 1 else 0 end)` }).from(profiles),
    db.select({ total: count() }).from(subscriptions).where(eq(subscriptions.status, "authorized")),
  ]);

  const finance = (range: Range, totals: Totals, use: Map<string, TitleUse>): { finance: Finance; licenses: LicenseDue[] } => {
    const licenses = titles
      .filter((t) => t.costModel !== "none")
      .map((t) => {
        const u = use.get(t.id) ?? { views: 0, watchSeconds: 0 };
        return {
          id: t.id,
          title: t.title,
          licensor: t.licensor,
          model: t.costModel,
          terms: termsOf(t),
          views: u.views,
          watchSeconds: u.watchSeconds,
          amountCents: licenseCost(t, range, u, totals),
          licenseEnd: t.licenseEnd,
        };
      })
      .sort((a, b) => b.amountCents - a.amountCents);
    const licenseCents = licenses.reduce((total, l) => total + l.amountCents, 0);
    const fixedCents = Math.round((config.fixedCostsCents * range.days) / DAYS_PER_MONTH);
    return {
      licenses,
      finance: {
        grossCents: totals.grossCents,
        feeCents: totals.feeCents,
        adCents: totals.adCents,
        netCents: totals.netCents,
        licenseCents,
        fixedCents,
        profitCents: totals.netCents - licenseCents - fixedCents,
      },
    };
  };
  const currentFinance = finance(current, cur.totals, useNow);
  const before = finance(previous, prev.totals, usePrev);

  const licensedNames = new Map(titles.map((t) => [t.id, t.title]));
  const topTitles = await Promise.all(
    topRows.map(async (r) => ({
      mediaType: r.mediaType,
      itemId: r.itemId,
      title: await titleName(r.mediaType, r.itemId, licensedNames),
      views: Number(r.views),
      watchSeconds: Number(r.watchSeconds),
      adImpressions: Number(r.adImpressions),
    })),
  );

  const soon = now.getTime() + 30 * DAY_MS;
  const expiring = titles
    .filter((t) => t.published && t.licenseEnd && t.licenseEnd > now && t.licenseEnd.getTime() <= soon)
    .map((t) => ({ id: t.id, title: t.title, licenseEnd: t.licenseEnd! }))
    .sort((a, b) => a.licenseEnd.getTime() - b.licenseEnd.getTime());

  const premiumUsers = Number(userCounts?.premium ?? 0);
  return {
    period,
    range: { from: current.from, to: current.to },
    points: cur.points,
    totals: cur.totals,
    previous: prev.totals,
    finance: currentFinance.finance,
    previousFinance: before.finance,
    licenses: currentFinance.licenses,
    expiring,
    topTitles,
    audience: {
      totalUsers: Number(userCounts?.total ?? 0),
      premiumUsers,
      profiles: Number(profileCounts?.total ?? 0),
      kidsProfiles: Number(profileCounts?.kids ?? 0),
      cardSubscriptions: Number(cards?.total ?? 0),
      mrrCents: Math.round(premiumUsers * PREMIUM_PRICE * 100),
    },
    settings: config,
    billing: billingEnabled(),
    ads: adsEnabled(),
  };
}

/** Valor de ?periodo= aceito pelo painel. */
export function parsePeriod(value: unknown): Period {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (PERIODS as readonly number[]).includes(n) ? (n as Period) : DEFAULT_PERIOD;
}
