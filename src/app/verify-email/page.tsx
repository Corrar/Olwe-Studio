import type { Metadata } from "next";
import { confirmEmailAction } from "@/app/actions/auth";
import { IconBadge, SubmitButton } from "@/components/auth-form";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Confirmar e-mail" };

// Abrir o link só mostra o botão: verificadores de links dos provedores de e-mail abrem os endereços
// sozinhos, e a confirmação precisa ser um clique de verdade.
export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  return (
    <div className="gutter relative isolate flex min-h-svh flex-col items-center justify-center gap-8 overflow-hidden py-12 text-center">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-48 -top-48 size-[36rem] rounded-full bg-ember/20 blur-3xl" />
        <div className="absolute -bottom-56 -right-40 size-[38rem] rounded-full bg-amber/10 blur-3xl" />
      </div>
      <Logo />
      <div className="w-full max-w-md animate-fade-up rounded-3xl border border-line/80 bg-ink/70 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-10">
        <IconBadge icon="mail" />
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Confirmar e-mail</h1>
        <p className="mb-7 mt-3 text-pretty text-muted">Toque no botão para confirmar seu e-mail e liberar sua conta no Olwe.</p>
        <form action={confirmEmailAction.bind(null, value)}>
          <SubmitButton pendingLabel="Confirmando…">Confirmar e-mail</SubmitButton>
        </form>
        <p className="mt-5 text-xs text-muted">Não pediu uma conta no Olwe? Pode fechar esta página: nada muda sem o toque no botão.</p>
      </div>
    </div>
  );
}
