import type { Metadata } from "next";
import Link from "next/link";
import { resetPassword } from "@/app/actions/auth";
import { AuthForm, IconBadge } from "@/components/auth-form";
import { passwordResetAccount } from "@/lib/verification";

// O token vai no endereço: nenhum link da página repassa o endereço (Referer) adiante.
export const metadata: Metadata = { title: "Nova senha", referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  const account = value ? await passwordResetAccount(value) : null;

  if (!account) {
    return (
      <div className="text-center">
        <IconBadge icon="alert" />
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Link expirado</h1>
        <p className="mt-3 text-pretty text-muted">
          Este link para criar uma nova senha expirou ou já foi usado. Os links valem por 1 hora e deixam de funcionar assim que a
          senha é trocada.
        </p>
        <div className="mt-7 flex flex-col gap-3">
          <Link
            href="/forgot-password"
            className="bg-brand flex h-12 items-center justify-center rounded-full px-6 font-semibold text-ink shadow-lg shadow-ember/20 transition hover:brightness-110"
          >
            Pedir um novo link
          </Link>
          <Link href="/login" className="rounded py-2 text-sm text-muted transition-colors hover:text-text">
            Voltar para entrar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Nova senha</h1>
      <p className="mb-7 mt-2 text-pretty text-muted">
        Crie uma nova senha para <strong className="break-all font-semibold text-text">{account.email}</strong>.
      </p>
      <AuthForm
        action={resetPassword.bind(null, value)}
        username={account.email}
        submitLabel="Salvar nova senha"
        fields={[
          {
            name: "password",
            label: "Nova senha",
            type: "password",
            autoComplete: "new-password",
            hint: "Use pelo menos 8 caracteres.",
            autoFocus: true,
          },
          { name: "confirmPassword", label: "Confirme a nova senha", type: "password", autoComplete: "new-password" },
        ]}
        footer={{ text: "O link venceu?", href: "/forgot-password", link: "Pedir outro" }}
      />
    </>
  );
}
