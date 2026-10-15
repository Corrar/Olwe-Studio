import type { Metadata } from "next";
import { signup } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { MAX_PROFILES } from "@/lib/avatars";
import { billingEnabled, priceLabel } from "@/lib/billing";
import { emailEnabled } from "@/lib/email";
import { PlanPicker, type PlanOption } from "./plan-picker";

export const metadata: Metadata = { title: "Criar conta" };

const FORM_ID = "signup-form";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  // E-mail digitado na página inicial ("Vamos lá") e plano vindo de um link (?plan=premium).
  const { email, plan } = await searchParams;
  const prefill = typeof email === "string" ? email.trim().slice(0, 254) : "";
  const premiumOpen = billingEnabled();
  const plans: PlanOption[] = [
    {
      value: "free",
      name: "Olwe Grátis",
      price: "R$ 0",
      period: "",
      tagline: "Com um anúncio curto antes dos filmes.",
      perks: ["Filmes completos de graça", "Anúncio só antes do filme, nunca no meio", "Perfil infantil sempre sem anúncios", `Até ${MAX_PROFILES} perfis`],
    },
    {
      value: "premium",
      name: "Olwe Premium",
      price: priceLabel(),
      period: "/mês",
      tagline: "Nenhum anúncio, em nenhum perfil.",
      perks: ["Sem anúncios em nenhum filme", "Filmes exclusivos do Premium", `Até ${MAX_PROFILES} perfis`, "Cancele quando quiser"],
      badge: "Sem anúncios",
      disabledNote: premiumOpen ? undefined : "Assinaturas abrem em breve",
    },
  ];

  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_19rem] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:[grid-template-areas:'head_plans'_'form_plans']">
      <div className="lg:[grid-area:head]">
        <h1 className="font-display text-3xl font-bold tracking-tight">Criar conta</h1>
        <p className="mt-2 text-muted">
          {emailEnabled()
            ? "Filmes e séries grátis, ou sem anúncios no Premium. Depois do cadastro, enviamos um link para confirmar seu e-mail."
            : "Filmes e séries grátis, ou sem anúncios no Premium. Leva menos de um minuto."}
        </p>
      </div>
      {/* Na ordem do código os planos vêm antes dos campos (escolhe o plano, depois preenche). */}
      <div className="lg:border-l lg:border-line/70 lg:pl-10 lg:[grid-area:plans]">
        <PlanPicker
          formId={FORM_ID}
          plans={plans}
          initial={plan === "premium" && premiumOpen ? "premium" : "free"}
          note={
            premiumOpen
              ? "Escolheu o Premium? Você assina logo depois de criar a conta, no cartão ou no Pix. Dá para mudar de plano quando quiser."
              : "Por enquanto todas as contas começam no Olwe Grátis."
          }
        />
      </div>
      <div className="lg:[grid-area:form]">
        <AuthForm
          id={FORM_ID}
          action={signup}
          submitLabel="Criar conta"
          fields={[
            { name: "name", label: "Nome", type: "text", autoComplete: "name", autoFocus: true },
            { name: "email", label: "E-mail", type: "email", autoComplete: "email", defaultValue: prefill },
            { name: "password", label: "Senha", type: "password", autoComplete: "new-password", hint: "Use pelo menos 8 caracteres." },
          ]}
          footer={{ text: "Já tem conta?", href: "/login", link: "Entrar" }}
        />
      </div>
    </div>
  );
}
