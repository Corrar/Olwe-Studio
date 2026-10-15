"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";

export type PlanOption = {
  value: "free" | "premium";
  name: string;
  price: string;
  period: string;
  tagline: string;
  perks: string[];
  badge?: string;
  /** Plano que ainda não pode ser escolhido (ex.: pagamentos desligados). */
  disabledNote?: string;
};

/**
 * Escolha de plano em cards, ao lado do formulário de cadastro (no celular, acima dele). Os radios
 * pertencem ao formulário pelo atributo form. Depois de um erro, o React limpa o formulário
 * (form.reset()), que volta cada radio ao seu defaultChecked: por isso o defaultChecked acompanha a
 * escolha atual (no estado; o React reaplica o valor das props depois de cada clique) e ela sobrevive
 * ao erro.
 */
export function PlanPicker({
  formId,
  plans,
  initial,
  note,
}: {
  formId: string;
  plans: PlanOption[];
  initial: PlanOption["value"];
  note: string;
}) {
  const [choice, setChoice] = useState(initial);

  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-sm font-medium text-text/85">Escolha seu plano</legend>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
        {plans.map((p) => {
          const disabled = !!p.disabledNote;
          return (
            <label
              key={p.value}
              className={`group relative flex flex-col rounded-2xl border border-line bg-surface/60 p-3.5 transition duration-200 has-checked:border-amber has-checked:bg-amber/[0.07] has-checked:shadow-lg has-checked:shadow-ember/10 has-focus-visible:ring-2 has-focus-visible:ring-amber/60 sm:p-4 lg:p-5 ${
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-muted/60"
              }`}
            >
              <input
                type="radio"
                name="plan"
                value={p.value}
                form={formId}
                defaultChecked={p.value === choice && !disabled}
                disabled={disabled}
                onChange={() => setChoice(p.value)}
                className="sr-only"
              />
              <span className="flex items-start justify-between gap-2">
                <span className="font-display text-[0.9375rem] font-semibold leading-tight sm:text-base lg:text-lg">{p.name}</span>
                {/* Indicador de seleção, como um radio. */}
                <span
                  aria-hidden="true"
                  className="grid size-5 shrink-0 place-items-center rounded-full border border-muted/60 transition group-has-checked:border-amber group-has-checked:bg-amber"
                >
                  <Icon name="check" size={12} className="text-ink opacity-0 transition group-has-checked:opacity-100" />
                </span>
              </span>
              {p.badge && (
                <span className="bg-brand mt-2 w-fit rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold text-ink">{p.badge}</span>
              )}
              <span className="mt-2 font-display text-xl font-bold sm:text-2xl">
                {p.price}
                <span className="text-sm font-normal text-muted">{p.period}</span>
              </span>
              <span className="mt-1 text-xs leading-snug text-muted sm:text-sm">{p.tagline}</span>
              <ul className="mt-3 hidden space-y-1.5 text-sm lg:block">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <Icon name="check" size={15} className="mt-0.5 shrink-0 text-amber" />
                    {perk}
                  </li>
                ))}
              </ul>
              {p.disabledNote && <span className="mt-2 text-xs font-medium text-amber">{p.disabledNote}</span>}
            </label>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">{note}</p>
    </fieldset>
  );
}
