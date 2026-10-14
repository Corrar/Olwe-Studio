"use client";

import { useActionState } from "react";
import { resendVerification } from "@/app/actions/auth";

export function ResendButton() {
  const [state, action, pending] = useActionState(resendVerification, undefined);
  return (
    <form action={action} className="space-y-2">
      <button disabled={pending} className="bg-brand w-full rounded-full py-3 font-semibold text-ink transition hover:brightness-110 disabled:opacity-60">
        {pending ? "Enviando…" : "Reenviar e-mail"}
      </button>
      {state?.sent && <p className="text-sm text-amber">E-mail enviado. Confira sua caixa de entrada.</p>}
      {state?.error && (
        <p role="alert" className="text-sm text-ember">
          {state.error}
        </p>
      )}
    </form>
  );
}
