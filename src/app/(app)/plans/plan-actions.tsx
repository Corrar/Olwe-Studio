"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { cancelPremium, payWithPix, subscribeWithCard } from "@/app/actions/billing";
import type { FormState } from "@/app/actions/auth";
import { Icon, type IconName } from "@/components/icons";

const FIELD =
  "h-12 w-full rounded-xl border border-line bg-surface-2/70 px-4 text-base text-text transition-colors placeholder:text-muted/60 focus:border-amber focus:outline-none! focus:ring-3 focus:ring-amber/20";

function Submit({ icon, children, variant = "primary" }: { icon: IconName; children: string; variant?: "primary" | "ghost" }) {
  const { pending } = useFormStatus();
  const look =
    variant === "primary"
      ? "bg-brand text-ink shadow-lg shadow-ember/20 hover:brightness-110"
      : "bg-white/10 text-text ring-1 ring-inset ring-white/15 hover:bg-white/20";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 font-semibold transition active:scale-[0.98] disabled:opacity-70 ${look}`}
    >
      {pending ? (
        <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <Icon name={icon} size={18} />
      )}
      {pending ? "Aguarde…" : children}
    </button>
  );
}

function Feedback({ state }: { state: FormState }) {
  if (state?.error) {
    return (
      <p role="alert" className="flex items-start gap-2 text-sm text-ember">
        <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
        {state.error}
      </p>
    );
  }
  if (state?.notice) {
    return (
      <p role="status" className="flex items-start gap-2 text-sm text-amber">
        <Icon name="check" size={16} className="mt-0.5 shrink-0" />
        {state.notice}
      </p>
    );
  }
  return null;
}

/** Assinatura mensal no cartão (checkout do Mercado Pago) e 30 dias avulsos no Pix. */
export function CheckoutForms({ email }: { email: string }) {
  const [cardState, cardAction] = useActionState(subscribeWithCard, undefined);
  const [pixState, pixAction] = useActionState(payWithPix, undefined);
  return (
    <div className="space-y-5">
      <form action={cardAction} className="space-y-3">
        <label htmlFor="payerEmail" className="block text-sm text-muted">
          E-mail da sua conta do Mercado Pago
        </label>
        <input id="payerEmail" name="payerEmail" type="email" required autoComplete="email" defaultValue={email} className={FIELD} />
        <Submit icon="sparkles">Assinar no cartão</Submit>
        <p className="text-xs text-muted">Renova sozinho todo mês. Cancele quando quiser, aqui mesmo.</p>
        <Feedback state={cardState} />
      </form>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        ou
        <span className="h-px flex-1 bg-line" />
      </div>

      <form action={pixAction} className="space-y-3">
        <Submit icon="clock" variant="ghost">
          Pagar 30 dias com Pix
        </Submit>
        <p className="text-xs text-muted">O Pix não renova sozinho: quando os 30 dias acabarem, a conta volta para o Olwe Grátis.</p>
        <Feedback state={pixState} />
      </form>
    </div>
  );
}

export function CancelForm() {
  const [state, action] = useActionState(cancelPremium, undefined);
  return (
    <form action={action} className="space-y-3">
      {!state?.notice && (
        <Submit icon="x" variant="ghost">
          Cancelar renovação
        </Submit>
      )}
      <Feedback state={state} />
    </form>
  );
}
