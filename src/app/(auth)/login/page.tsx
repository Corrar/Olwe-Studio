import type { Metadata } from "next";
import { login } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm rounded-3xl border border-line bg-ink/70 p-8 backdrop-blur">
      <h1 className="mb-6 font-display text-3xl font-semibold">Entrar</h1>
      <AuthForm
        action={login}
        submitLabel="Entrar"
        fields={[
          { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
          { name: "password", label: "Senha", type: "password", autoComplete: "current-password" },
        ]}
        footer={{ text: "Ainda não tem conta?", href: "/signup", link: "Criar conta" }}
      />
    </div>
  );
}
