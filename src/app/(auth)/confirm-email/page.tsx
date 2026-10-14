import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/dal";
import { verificationRequired } from "@/lib/verification";
import { ResendButton } from "./resend-button";

export const metadata: Metadata = { title: "Confirme seu e-mail" };

export default async function ConfirmEmailPage({ searchParams }: PageProps<"/confirm-email">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!verificationRequired(user)) redirect("/profiles");
  const { error } = await searchParams;

  return (
    <div className="w-full max-w-md rounded-3xl border border-line bg-ink/70 p-8 text-center backdrop-blur">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber/15 text-3xl" aria-hidden>
        ✉️
      </div>
      <h1 className="mb-3 font-display text-2xl font-semibold">Confirme seu e-mail</h1>
      {error === "link" && (
        <p role="alert" className="mb-4 rounded-xl bg-ember/15 px-4 py-3 text-sm text-ember">
          Esse link de confirmação expirou ou não é válido. Peça um novo abaixo.
        </p>
      )}
      <p className="text-muted">
        {user.verificationSentAt ? "Enviamos um link de confirmação para" : "Vamos enviar um link de confirmação para"}{" "}
        <strong className="text-text">{user.email}</strong>. Abra o e-mail e toque em <strong className="text-text">Confirmar e-mail</strong> para
        liberar sua conta.
      </p>
      <p className="mt-3 text-sm text-muted">O link vale por 24 horas. Não achou? Confira a caixa de spam.</p>
      <div className="mt-6 flex flex-col gap-3">
        <ResendButton />
        <form action={logout}>
          <button className="text-sm text-muted hover:text-text">Usar outra conta</button>
        </form>
      </div>
    </div>
  );
}
