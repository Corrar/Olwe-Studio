"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveDashboardSettingsAction } from "@/app/actions/dashboard";
import { FIELD, useManualSubmit } from "@/app/profiles/[id]/edit/form-kit";
import { Icon } from "@/components/icons";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-brand inline-flex min-h-11 items-center gap-2 rounded-full px-5 font-semibold text-ink transition hover:brightness-110 disabled:opacity-70"
    >
      <Icon name="check" size={18} />
      {pending ? "Salvando…" : "Salvar"}
    </button>
  );
}

/** CPM estimado dos anúncios e custos fixos por mês, que entram na receita e no lucro do painel. */
export function SettingsForm({ adCpm, fixedCosts }: { adCpm: string; fixedCosts: string }) {
  const [state, action] = useActionState(saveDashboardSettingsAction, undefined);
  const onSubmit = useManualSubmit(action);
  const field = (name: string, label: string, hint: string, value: string) => (
    <div>
      <label htmlFor={name} className="block text-sm text-muted">
        {label}
      </label>
      <div className="relative mt-1.5">
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted">
          R$
        </span>
        <input
          id={name}
          name={name}
          defaultValue={value}
          inputMode="decimal"
          placeholder="0,00"
          maxLength={20}
          aria-invalid={state?.field === name || undefined}
          aria-describedby={`${name}-hint`}
          className={`${FIELD} pl-11`}
        />
      </div>
      <p id={`${name}-hint`} className={`mt-1 text-xs ${state?.field === name ? "text-ember" : "text-muted/80"}`}>
        {state?.field === name ? state.error : hint}
      </p>
    </div>
  );

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {field(
          "adCpm",
          "CPM estimado dos anúncios",
          "Quanto o provedor de anúncios paga a cada mil anúncios exibidos (veja no painel dele).",
          adCpm,
        )}
        {field("fixedCosts", "Custos fixos por mês", "Hospedagem, Mux, domínio e outros gastos mensais do Olwe.", fixedCosts)}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SaveButton />
        {state?.notice && (
          <p role="status" className="flex items-center gap-1.5 text-sm text-emerald-300">
            <Icon name="check" size={16} />
            {state.notice}
          </p>
        )}
      </div>
    </form>
  );
}
