import { NextResponse, type NextRequest } from "next/server";
import { billingEnabled, syncAuthorizedPayment, syncPayment, syncSubscription, validWebhookSignature } from "@/lib/billing";

// Avisos do Mercado Pago (pagamentos e assinaturas). O corpo só diz o que mudou: o estado de verdade
// é sempre buscado na API dele, então um aviso falso ou repetido não libera nada.
export async function POST(request: NextRequest) {
  if (!billingEnabled()) return new NextResponse(null, { status: 404 });

  const body = (await request.json().catch(() => null)) as { type?: string; topic?: string; data?: { id?: unknown } } | null;
  const params = request.nextUrl.searchParams;
  const type = body?.type ?? body?.topic ?? params.get("type") ?? params.get("topic") ?? "";
  const id = String(params.get("data.id") ?? body?.data?.id ?? params.get("id") ?? "");
  if (!id || !/^[\w-]{1,64}$/.test(id)) return new NextResponse(null, { status: 200 });

  if (!validWebhookSignature(request.headers.get("x-signature"), request.headers.get("x-request-id"), id)) {
    return new NextResponse(null, { status: 401 });
  }

  try {
    if (type === "payment") await syncPayment(id);
    else if (type === "subscription_preapproval" || type === "preapproval") await syncSubscription(id);
    else if (type === "subscription_authorized_payment") await syncAuthorizedPayment(id);
  } catch (err) {
    // Falha ao consultar o Mercado Pago: responde erro para ele reenviar o aviso mais tarde.
    console.error("[webhook mercadopago]", type, id, err);
    return new NextResponse(null, { status: 500 });
  }
  return new NextResponse(null, { status: 200 });
}
