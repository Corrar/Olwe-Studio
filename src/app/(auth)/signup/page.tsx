import type { Metadata } from "next";
import { signup } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage() {
  return (
    <div className="w-full max-w-sm rounded-3xl border border-line bg-ink/70 p-8 backdrop-blur">
      <h1 className="mb-2 font-display text-3xl font-semibold">Criar conta</h1>
      <p className="mb-6 text-sm text-muted">Filmes e séries sem nenhum anúncio.</p>
      <AuthForm
        action={signup}
        submitLabel="Criar conta"
        fields={[
          { name: "name", label: "Nome", type: "text", autoComplete: "name" },
          { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
          { name: "password", label: "Senha (mín. 8 caracteres)", type: "password", autoComplete: "new-password" },
        ]}
        footer={{ text: "Já tem conta?", href: "/login", link: "Entrar" }}
      />
    </div>
  );
}
