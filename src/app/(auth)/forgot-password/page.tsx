import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requestPasswordReset } from "@/app/actions/auth";
import { AuthForm, IconBadge } from "@/components/auth-form";
import { Icon } from "@/components/icons";
import { passwordResetAvailable } from "@/lib/verification";

export const metadata: Metadata = { title: "Recuperar senha" };

export default async function ForgotPasswordPage() {
  // A disponibilidade depende da configuração do servidor em que a página roda, não da do build.
  await connection();

  if (!passwordResetAvailable()) {
    return (
      <div className="text-center">
        <IconBadge icon="lock" />
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Recuperação de senha indisponível</h1>
        <p className="mt-3 text-pretty text-muted">
          Esta instalação do Olwe não envia e-mails, então não dá para criar uma nova senha por aqui. Fale com quem administra o
          Olwe para recuperar o acesso.
        </p>
        <Link
          href="/login"
          className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white/10 px-6 font-semibold transition-colors hover:bg-white/20"
        >
          <Icon name="arrow-left" size={18} />
          Voltar para entrar
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Esqueceu a senha?</h1>
      <p className="mb-7 mt-2 text-pretty text-muted">
        Informe o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.
      </p>
      <AuthForm
        action={requestPasswordReset}
        submitLabel="Enviar link"
        fields={[{ name: "email", label: "E-mail", type: "email", autoComplete: "email", autoFocus: true }]}
        footer={{ text: "Lembrou a senha?", href: "/login", link: "Entrar" }}
      />
    </>
  );
}
