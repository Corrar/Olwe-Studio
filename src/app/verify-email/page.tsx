import type { Metadata } from "next";
import { confirmEmailAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Confirmar e-mail" };

// Abrir o link só mostra o botão: verificadores de links dos provedores de e-mail abrem os endereços
// sozinhos, e a confirmação precisa ser um clique de verdade.
export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface/70 p-8">
        <h1 className="mb-3 font-display text-2xl font-semibold">Confirmar e-mail</h1>
        <p className="mb-6 text-muted">Toque no botão para confirmar seu e-mail e liberar sua conta no Olwe.</p>
        <form action={confirmEmailAction.bind(null, value)}>
          <button className="bg-brand w-full rounded-full py-3 font-semibold text-ink transition hover:brightness-110">Confirmar e-mail</button>
        </form>
      </div>
    </div>
  );
}
