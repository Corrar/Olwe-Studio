import type { Metadata } from "next";
import { login } from "@/app/actions/auth";
import { AuthForm, Notice } from "@/components/auth-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { verified, error, reset } = await searchParams;
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Entrar</h1>
      <p className="mb-7 mt-2 text-muted">Que bom ver você de novo. Seus perfis estão esperando.</p>
      {verified === "1" && <Notice tone="success">E-mail confirmado! Entre na sua conta para começar a assistir.</Notice>}
      {reset === "1" && <Notice tone="success">Senha alterada! Entre com a nova senha.</Notice>}
      {error === "link" && (
        <Notice tone="error">Esse link de confirmação expirou ou não é válido. Entre na sua conta para receber um novo.</Notice>
      )}
      <AuthForm
        action={login}
        submitLabel="Entrar"
        fields={[
          { name: "email", label: "E-mail", type: "email", autoComplete: "email", autoFocus: true },
          {
            name: "password",
            label: "Senha",
            type: "password",
            autoComplete: "current-password",
            link: { href: "/forgot-password", label: "Esqueceu a senha?" },
          },
        ]}
        footer={{ text: "Ainda não tem conta?", href: "/signup", link: "Criar conta" }}
      />
    </>
  );
}
