import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PAGE_TOP } from "@/components/catalog-page";
import { Icon } from "@/components/icons";
import { billingEnabled, PIX_DAYS, priceLabel, syncPayment } from "@/lib/billing";
import { requireUser } from "@/lib/dal";
import { PixWaiter } from "./pix-waiter";

export const metadata: Metadata = { title: "Pagar com Pix" };

export default async function PixPage({ params }: PageProps<"/plans/pix/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!billingEnabled() || !/^\d{1,30}$/.test(id)) notFound();
  const result = await syncPayment(id, user.id).catch(() => null);
  if (!result) notFound();

  return (
    <div className={`gutter mx-auto max-w-md pb-12 text-center ${PAGE_TOP}`}>
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Pague com Pix</h1>
      <p className="mt-1 text-muted">
        {priceLabel()} · {PIX_DAYS} dias de Olwe Premium, sem anúncios
      </p>
      <PixWaiter
        id={id}
        initialStatus={result.status}
        qrCode={result.charge.qrCode}
        qrCodeBase64={result.charge.qrCodeBase64}
      />
      <Link href="/plans" className="mt-8 inline-flex min-h-10 items-center gap-2 text-sm text-muted transition hover:text-amber">
        <Icon name="arrow-left" size={16} />
        Voltar para os planos
      </Link>
    </div>
  );
}
