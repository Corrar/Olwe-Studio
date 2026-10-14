import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { IconBadge, Notice } from "@/components/auth-form";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/dal";
import { resendWaitSeconds, verificationRequired } from "@/lib/verification";
import { ConfirmedButton, ResendButton } from "./resend-button";

export const metadata: Metadata = { title: "Confirme seu e-mail" };

export default async function ConfirmEmailPage({ searchParams }: PageProps<"/confirm-email">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!verificationRequired(user)) redirect("/profiles");
  const { error } = await searchParams;

  return (
    <div className="text-center">
      <IconBadge icon="mail" pulse />
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Confirme seu e-mail</h1>
      <p className="mt-3 text-muted">{user.verificationSentAt ? "Enviamos um link de confirmação para" : "Vamos enviar um link de confirmação para"}</p>
      <p className="mx-auto mt-2 w-fit max-w-full break-all rounded-full bg-white/[0.06] px-4 py-1.5 font-semibold text-text ring-1 ring-inset ring-white/10">
        {user.email}
      </p>
      <p className="mt-3 text-pretty text-muted">
        Abra o e-mail e toque em <strong className="text-text">Confirmar e-mail</strong> para liberar sua conta.
      </p>
      <p className="mb-6 mt-2 text-sm text-muted">O link vale por 24 horas. Não achou? Confira a caixa de spam.</p>

      {error === "link" && <Notice tone="error">Esse link de confirmação expirou ou não é válido. Peça um novo abaixo.</Notice>}

      <div className="space-y-3">
        <ConfirmedButton />
        {/* Um envio novo (outra aba, outro aparelho) recomeça a contagem. */}
        <ResendButton key={user.verificationSentAt?.getTime() ?? 0} wait={resendWaitSeconds(user.verificationSentAt)} />
      </div>

      <form action={logout} className="mt-6 border-t border-line pt-5">
        <button className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-text">
          <Icon name="logout" size={16} />
          Usar outra conta
        </button>
      </form>
    </div>
  );
}
