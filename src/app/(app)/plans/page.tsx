import type { Metadata } from "next";
import Link from "next/link";
import { PAGE_TOP } from "@/components/catalog-page";
import { Icon } from "@/components/icons";
import { adsEnabled } from "@/lib/ads";
import { activeSubscription, billingEnabled, dateLabel, isPremium, priceLabel } from "@/lib/billing";
import { requireProfile, requireUser } from "@/lib/dal";
import { CancelForm, CheckoutForms } from "./plan-actions";

export const metadata: Metadata = { title: "Planos" };

const FREE_PERKS = ["Filmes completos de graça", "Anúncios curtos antes dos filmes", "Perfil infantil sempre sem anúncios", "Até 5 perfis"];
const PREMIUM_PERKS = ["Nenhum anúncio, em nenhum perfil", "Todo o catálogo do Olwe Grátis", "Filmes exclusivos do Premium quando chegarem", "Cancele quando quiser"];

function Perks({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-2.5 text-sm">
      {items.map((p) => (
        <li key={p} className="flex items-start gap-2">
          <Icon name="check" size={16} className="mt-0.5 shrink-0 text-amber" />
          {p}
        </li>
      ))}
    </ul>
  );
}

export default async function PlansPage() {
  const user = await requireUser();
  const profile = await requireProfile();
  const premium = isPremium(user);
  const subscription = premium ? await activeSubscription(user.id) : undefined;

  return (
    <div className={`gutter mx-auto max-w-4xl pb-12 ${PAGE_TOP}`}>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Planos do Olwe</h1>
      <p className="mt-1 mb-8 text-muted">Assista de graça com anúncios curtos, ou tire todos eles com o Premium.</p>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <section aria-labelledby="free" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <h2 id="free" className="font-display text-xl font-semibold">
            Olwe Grátis
          </h2>
          <p className="mt-2 text-3xl font-bold">R$ 0</p>
          <Perks items={FREE_PERKS} />
          {!premium && <p className="mt-6 rounded-full bg-white/[0.06] px-4 py-2 text-center text-sm text-muted">Seu plano atual</p>}
        </section>

        <section aria-labelledby="premium" className="rounded-2xl border border-amber/40 bg-surface p-5 shadow-lg shadow-ember/10 sm:p-6">
          <h2 id="premium" className="font-display text-xl font-semibold">
            Olwe Premium · <span className="text-gradient">sem anúncios</span>
          </h2>
          <p className="mt-2 text-3xl font-bold">
            {priceLabel()}
            <span className="text-base font-normal text-muted">/mês</span>
          </p>
          <Perks items={PREMIUM_PERKS} />

          <div className="mt-6">
            {premium ? (
              <div className="space-y-4">
                <p className="rounded-xl bg-amber/10 px-4 py-3 text-sm text-amber">
                  {subscription?.status === "authorized"
                    ? `Assinatura ativa. Próxima renovação: ${subscription.nextPaymentAt ? dateLabel(subscription.nextPaymentAt) : "em breve"}.`
                    : `Premium ativo até ${dateLabel(user.premiumUntil!)}. Não renova sozinho: depois dessa data, a conta volta para o Olwe Grátis.`}
                </p>
                {subscription && !profile.isKids && <CancelForm />}
              </div>
            ) : profile.isKids ? (
              <p className="text-sm text-muted">Peça para um adulto assinar em um perfil adulto.</p>
            ) : billingEnabled() ? (
              <CheckoutForms email={user.email} />
            ) : (
              <p className="text-sm text-muted">As assinaturas abrem em breve.</p>
            )}
          </div>
        </section>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        Pagamento processado pelo Mercado Pago. O Olwe não recebe nem guarda os dados do seu cartão. Pelo Código de Defesa do
        Consumidor, você pode desistir em até 7 dias depois da contratação.
        {!adsEnabled() && " Por enquanto o Olwe Grátis ainda não exibe anúncios."}{" "}
        <Link href="/account" className="underline underline-offset-2 hover:text-text">
          Voltar para a conta
        </Link>
      </p>
    </div>
  );
}
