import type { Metadata } from "next";
import { signup } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { Icon } from "@/components/icons";
import { MAX_PROFILES } from "@/lib/avatars";
import { emailEnabled } from "@/lib/email";

export const metadata: Metadata = { title: "Criar conta" };

const PERKS = ["Grátis", "Sem anúncios", `Até ${MAX_PROFILES} perfis`];

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  // E-mail digitado na página inicial ("Vamos lá").
  const { email } = await searchParams;
  const prefill = typeof email === "string" ? email.trim().slice(0, 254) : "";
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Criar conta</h1>
      <p className="mt-2 text-muted">
        {emailEnabled()
          ? "Filmes e séries sem nenhum anúncio. Depois do cadastro, enviamos um link para confirmar seu e-mail."
          : "Filmes e séries sem nenhum anúncio. Leva menos de um minuto."}
      </p>
      <ul className="mb-7 mt-4 flex flex-wrap gap-2 text-xs font-medium">
        {PERKS.map((perk) => (
          <li key={perk} className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-text/85 ring-1 ring-inset ring-white/10">
            <Icon name="check" size={14} className="text-amber" />
            {perk}
          </li>
        ))}
      </ul>
      <AuthForm
        action={signup}
        submitLabel="Criar conta"
        fields={[
          { name: "name", label: "Nome", type: "text", autoComplete: "name", autoFocus: true },
          { name: "email", label: "E-mail", type: "email", autoComplete: "email", defaultValue: prefill },
          { name: "password", label: "Senha", type: "password", autoComplete: "new-password", hint: "Use pelo menos 8 caracteres." },
        ]}
        footer={{ text: "Já tem conta?", href: "/login", link: "Entrar" }}
      />
    </>
  );
}
