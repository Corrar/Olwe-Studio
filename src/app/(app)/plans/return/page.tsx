import type { Metadata } from "next";
import Link from "next/link";
import { PAGE_TOP } from "@/components/catalog-page";
import { Icon } from "@/components/icons";
import { billingEnabled, syncSubscription } from "@/lib/billing";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Assinatura" };

// Volta do checkout do Mercado Pago (back_url), com ?preapproval_id=… da assinatura.
export default async function SubscriptionReturnPage({ searchParams }: PageProps<"/plans/return">) {
  const user = await requireUser();
  const { preapproval_id: raw } = await searchParams;
  const id = typeof raw === "string" && /^[\w-]{1,64}$/.test(raw) ? raw : null;
  const status = billingEnabled() && id ? await syncSubscription(id, user.id).catch(() => null) : null;
  const ok = status === "authorized";

  return (
    <div className={`gutter mx-auto max-w-md pb-12 text-center ${PAGE_TOP}`}>
      <Icon name={ok ? "check" : "clock"} size={44} className="mx-auto text-amber" />
      <h1 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        {ok ? "Bem-vindo ao Olwe Premium!" : "Estamos confirmando sua assinatura"}
      </h1>
      <p className="mt-2 text-muted">
        {ok
          ? "Pronto: nenhum anúncio, em nenhum perfil. A renovação é mensal e você pode cancelar quando quiser."
          : "O Mercado Pago ainda está processando o pagamento. Assim que ele confirmar, o Premium é liberado sozinho."}
      </p>
      <Link href={ok ? "/browse" : "/plans"} className="bg-brand mt-6 inline-flex min-h-11 items-center gap-2 rounded-full px-6 font-semibold text-ink">
        <Icon name={ok ? "play" : "arrow-left"} size={18} />
        {ok ? "Começar a assistir" : "Ver meu plano"}
      </Link>
    </div>
  );
}
