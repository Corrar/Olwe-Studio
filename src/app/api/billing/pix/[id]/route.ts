import { NextResponse } from "next/server";
import { billingEnabled, syncPayment } from "@/lib/billing";
import { getCurrentUser } from "@/lib/dal";
import { withinLimit } from "@/lib/rate-limit";

// A página do Pix pergunta aqui se o pagamento já caiu (também funciona sem o webhook).
export async function GET(_: Request, { params }: RouteContext<"/api/billing/pix/[id]">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!billingEnabled()) return NextResponse.json({ error: "Pagamentos desligados" }, { status: 404 });
  const { id } = await params;
  if (!/^\d{1,30}$/.test(id)) return NextResponse.json({ error: "Pagamento inválido" }, { status: 400 });
  // A página consulta a cada 5 segundos: até 60 consultas a cada 5 minutos por conta.
  if (!(await withinLimit(`pix:user:${user.id}`, 60, 5 * 60))) return NextResponse.json({ status: "pending" });

  try {
    const result = await syncPayment(id, user.id);
    if (!result) return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 });
    return NextResponse.json({ status: result.status });
  } catch {
    return NextResponse.json({ status: "pending" });
  }
}
