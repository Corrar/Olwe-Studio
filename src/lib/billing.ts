import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { charges, payments, subscriptions, users } from "@/db/schema";
import { siteUrl } from "./verification";

// Olwe Premium (sem anúncios) pago pelo Mercado Pago: assinatura mensal no cartão (preapproval) ou
// 30 dias avulsos no Pix. O que vale é users.premiumUntil; o Mercado Pago é sempre consultado de novo
// (nunca se confia no corpo do webhook nem no retorno do checkout), então reprocessar não muda nada.

const API = "https://api.mercadopago.com";
const DAY = 24 * 60 * 60 * 1000;
/** Dias de Premium de um Pix. */
export const PIX_DAYS = 30;
/** Folga depois da data da próxima cobrança, para o Mercado Pago tentar de novo um cartão recusado. */
const GRACE_DAYS = 3;
const PIX_EXPIRES_MINUTES = 30;

function priceFromEnv() {
  const value = Number(String(process.env.PREMIUM_PRICE ?? "").replace(",", "."));
  return Number.isFinite(value) && value >= 1 ? Math.round(value * 100) / 100 : 9.9;
}

/** Preço mensal do Premium, em reais (PREMIUM_PRICE; padrão R$ 9,90). */
export const PREMIUM_PRICE = priceFromEnv();

export const priceLabel = (value = PREMIUM_PRICE) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** "14 de novembro de 2026", no horário de Brasília. */
export const dateLabel = (date: Date) =>
  date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric" });

/** Pagamentos ligados (MERCADOPAGO_ACCESS_TOKEN). Sem eles, a página de planos só mostra os planos. */
export function billingEnabled() {
  return !!process.env.MERCADOPAGO_ACCESS_TOKEN;
}

export function isPremium(user: { premiumUntil: Date | null }, now = Date.now()) {
  return !!user.premiumUntil && user.premiumUntil.getTime() > now;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>;

export class MercadoPagoError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function mp(method: "GET" | "POST" | "PUT", path: string, body?: unknown, idempotencyKey?: string): Promise<Raw> {
  const headers: HeadersInit = {
    authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
    accept: "application/json",
  };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (idempotencyKey) headers["x-idempotency-key"] = idempotencyKey;
  const res = await fetch(API + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as Raw;
  if (!res.ok) {
    console.error("[mercadopago]", method, path, res.status, data?.message ?? data);
    throw new MercadoPagoError(res.status, String(data?.message ?? `Mercado Pago ${res.status}`));
  }
  return data;
}

/** Endereço para o Mercado Pago avisar das mudanças. Ele só aceita HTTPS público (não localhost). */
async function notificationUrl() {
  const base = await siteUrl();
  return base.startsWith("https://") ? `${base}/api/webhooks/mercadopago` : undefined;
}

const toDate = (value: unknown) => {
  const time = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? new Date(time) : null;
};

/**
 * Guarda a cobrança aprovada para o painel (/admin): valor, tarifa do Mercado Pago e data. O id é fixo
 * por cobrança, então reprocessar o mesmo aviso não duplica a receita. Falhar aqui não atrapalha o Premium.
 */
async function recordCharge(id: string, userId: string, method: "pix" | "card", payment: Raw) {
  const amount = Number(payment.transaction_amount);
  if (!Number.isFinite(amount) || amount <= 0) return;
  const fees = Array.isArray(payment.fee_details)
    ? payment.fee_details.reduce((sum: number, fee: Raw) => sum + (Number(fee?.amount) || 0), 0)
    : null;
  try {
    await db
      .insert(charges)
      .values({
        id,
        userId,
        method,
        amountCents: Math.round(amount * 100),
        feeCents: fees === null ? null : Math.round(fees * 100),
        paidAt: toDate(payment.date_approved) ?? new Date(),
      })
      .onConflictDoNothing();
  } catch (err) {
    console.error("[billing] não foi possível registrar a cobrança", id, err);
  }
}

/** Estende o Premium até `until`, sem nunca encurtar o que já foi pago. */
async function extendUntil(userId: string, until: Date) {
  const seconds = Math.floor(until.getTime() / 1000);
  await db
    .update(users)
    .set({ premiumUntil: sql`max(coalesce(${users.premiumUntil}, 0), ${seconds})` })
    .where(eq(users.id, userId));
}

/* ----------------------------- Assinatura no cartão ----------------------------- */

type Account = { id: string; email: string };

/**
 * Cria a assinatura mensal e devolve o link do checkout do Mercado Pago. payerEmail é o e-mail da
 * conta do Mercado Pago de quem paga (pode ser diferente do e-mail do Olwe).
 */
export async function startCardSubscription(user: Account, payerEmail: string): Promise<string> {
  const base = await siteUrl();
  const data = await mp("POST", "/preapproval", {
    reason: "Olwe Premium · sem anúncios",
    external_reference: user.id,
    payer_email: payerEmail,
    auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: PREMIUM_PRICE, currency_id: "BRL" },
    back_url: `${base}/plans/return`,
    notification_url: await notificationUrl(),
    status: "pending",
  });
  if (typeof data.id !== "string" || typeof data.init_point !== "string") throw new MercadoPagoError(502, "Resposta sem link de checkout");
  await db
    .insert(subscriptions)
    .values({ id: data.id, userId: user.id, status: String(data.status ?? "pending") })
    .onConflictDoNothing();
  return data.init_point;
}

/**
 * Busca a assinatura no Mercado Pago e aplica: guarda o status e, se autorizada, libera o Premium até a
 * próxima cobrança (mais a folga). Só mexe em assinaturas criadas pelo Olwe para aquela conta.
 */
export async function syncSubscription(id: string, expectedUserId?: string) {
  const row = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, id) });
  if (!row || (expectedUserId && row.userId !== expectedUserId)) return null;
  const data = await mp("GET", `/preapproval/${encodeURIComponent(id)}`);
  if (data.external_reference !== row.userId) return null;

  const status = String(data.status ?? row.status);
  const nextPaymentAt = toDate(data.next_payment_date);
  await db.update(subscriptions).set({ status, nextPaymentAt, updatedAt: new Date() }).where(eq(subscriptions.id, id));

  if (status === "authorized") {
    const now = Date.now();
    // Sem data (ou com uma data absurda), vale um mês a partir de agora.
    const next = nextPaymentAt && nextPaymentAt.getTime() > now && nextPaymentAt.getTime() < now + 40 * DAY ? nextPaymentAt.getTime() : now + 31 * DAY;
    await extendUntil(row.userId, new Date(next + GRACE_DAYS * DAY));
  }
  return status;
}

/** Cobrança recorrente avisada pelo Mercado Pago: reprocessa a assinatura dela e, se paga, registra a receita. */
export async function syncAuthorizedPayment(id: string) {
  const data = await mp("GET", `/authorized_payments/${encodeURIComponent(id)}`);
  if (typeof data.preapproval_id !== "string") return;
  await syncSubscription(data.preapproval_id);

  const paymentId = data.payment?.id;
  if (data.payment?.status !== "approved" || paymentId === undefined || data.currency_id !== "BRL") return;
  const subscription = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, data.preapproval_id), columns: { userId: true } });
  if (!subscription) return;
  // Tarifa e data de aprovação estão no pagamento em si; sem ele, fica o valor da cobrança.
  const payment = await mp("GET", `/v1/payments/${encodeURIComponent(String(paymentId))}`).catch(() => null);
  await recordCharge(`card:${id}`, subscription.userId, "card", payment ?? { transaction_amount: data.transaction_amount, date_approved: data.debit_date });
}

/** Assinatura em andamento da conta (autorizada ou pausada), se houver. */
export async function activeSubscription(userId: string) {
  return db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.userId, userId), inArray(subscriptions.status, ["authorized", "paused"])),
    orderBy: desc(subscriptions.updatedAt),
  });
}

/** Cancela a renovação. O Premium já pago continua até o fim do período. */
export async function cancelSubscriptions(userId: string) {
  const open = await db.query.subscriptions.findMany({
    where: and(eq(subscriptions.userId, userId), inArray(subscriptions.status, ["authorized", "paused", "pending"])),
  });
  for (const s of open) {
    await mp("PUT", `/preapproval/${encodeURIComponent(s.id)}`, { status: "cancelled" });
    await db.update(subscriptions).set({ status: "cancelled", updatedAt: new Date() }).where(eq(subscriptions.id, s.id));
  }
  return open.length;
}

/* ----------------------------------- Pix ----------------------------------- */

export type PixCharge = { id: string; qrCode: string; qrCodeBase64: string; ticketUrl: string | null; expiresAt: string | null };

/** Horário de Brasília no formato que o Mercado Pago pede (o Brasil não tem mais horário de verão). */
function brazilTime(date: Date) {
  return new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString().replace("Z", "-03:00");
}

/** Cria a cobrança Pix de 30 dias de Premium (expira em 30 minutos). */
export async function createPixCharge(user: Account): Promise<PixCharge> {
  const data = await mp(
    "POST",
    "/v1/payments",
    {
      transaction_amount: PREMIUM_PRICE,
      description: `Olwe Premium · ${PIX_DAYS} dias sem anúncios`,
      payment_method_id: "pix",
      payer: { email: user.email },
      external_reference: user.id,
      notification_url: await notificationUrl(),
      date_of_expiration: brazilTime(new Date(Date.now() + PIX_EXPIRES_MINUTES * 60 * 1000)),
    },
    crypto.randomUUID(),
  );
  const tx = data.point_of_interaction?.transaction_data ?? {};
  if (data.id === undefined || typeof tx.qr_code !== "string") throw new MercadoPagoError(502, "Resposta sem QR Code do Pix");
  const id = String(data.id);
  await db.insert(payments).values({ id, userId: user.id, status: String(data.status ?? "pending"), days: PIX_DAYS }).onConflictDoNothing();
  return pixFromRaw(id, data);
}

function pixFromRaw(id: string, data: Raw): PixCharge {
  const tx = data.point_of_interaction?.transaction_data ?? {};
  return {
    id,
    qrCode: String(tx.qr_code ?? ""),
    qrCodeBase64: String(tx.qr_code_base64 ?? ""),
    ticketUrl: typeof tx.ticket_url === "string" ? tx.ticket_url : null,
    expiresAt: typeof data.date_of_expiration === "string" ? data.date_of_expiration : null,
  };
}

/**
 * Busca o pagamento no Mercado Pago e, se aprovado, soma os dias de Premium uma única vez (a marca
 * credited é trocada numa operação só, então dois avisos ao mesmo tempo não somam em dobro).
 */
export async function syncPayment(id: string, expectedUserId?: string) {
  const row = await db.query.payments.findFirst({ where: eq(payments.id, id) });
  if (!row || (expectedUserId && row.userId !== expectedUserId)) return null;
  const data = await mp("GET", `/v1/payments/${encodeURIComponent(id)}`);
  if (data.external_reference !== row.userId || data.currency_id !== "BRL") return null;

  const status = String(data.status ?? row.status);
  await db.update(payments).set({ status }).where(eq(payments.id, id));
  if (status !== "approved") return { status, charge: pixFromRaw(id, data) };
  await recordCharge(`pix:${id}`, row.userId, "pix", data);

  const [claimed] = await db
    .update(payments)
    .set({ credited: true })
    .where(and(eq(payments.id, id), eq(payments.credited, false)))
    .returning({ days: payments.days });
  if (claimed) {
    const now = Math.floor(Date.now() / 1000);
    const add = claimed.days * 24 * 60 * 60;
    await db
      .update(users)
      .set({ premiumUntil: sql`max(coalesce(${users.premiumUntil}, 0), ${now}) + ${add}` })
      .where(eq(users.id, row.userId));
  }
  return { status, charge: pixFromRaw(id, data) };
}

/* --------------------------------- Webhook --------------------------------- */

/**
 * Confere a assinatura x-signature do webhook (HMAC-SHA256 com MERCADOPAGO_WEBHOOK_SECRET). Sem o
 * segredo configurado, aceita: nada do corpo é usado sem consultar o Mercado Pago de novo.
 */
export function validWebhookSignature(signature: string | null, requestId: string | null, dataId: string) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;
  const parts = Object.fromEntries(
    signature.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  if (!parts.ts || !parts.v1) return false;
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  let manifest = `id:${id};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(parts.v1));
  return a.length === b.length && timingSafeEqual(a, b);
}
