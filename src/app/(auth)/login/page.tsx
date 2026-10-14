import type { Metadata } from "next";
import { login } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { verified, error } = await searchParams;
  return (
    <div className="w-full max-w-sm rounded-3xl border border-line bg-ink/70 p-8 backdrop-blur">
      <h1 className="mb-6 font-display text-3xl font-semibold">Entrar</h1>
      {verified === "1" && (
        <p role="status" className="mb-4 rounded-xl bg-amber/15 px-4 py-3 text-sm text-amber">
          E-mail confirmado! Entre na sua conta para começar a assistir.
        </p>
      )}
      {error === "link" && (
        <p role="alert" className="mb-4 rounded-xl bg-ember/15 px-4 py-3 text-sm text-ember">
          Esse link de confirmação expirou ou não é válido. Entre na sua conta para receber um novo.
        </p>
      )}
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
