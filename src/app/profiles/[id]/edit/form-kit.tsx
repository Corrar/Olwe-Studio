"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import type { ProfileFormState } from "@/app/actions/profiles";
import { Icon } from "@/components/icons";

// Peças comuns dos formulários de perfil (criar, editar, PIN). text-base nos campos: o iPhone não dá zoom ao focar.
// No foco, borda e halo âmbar no lugar do contorno global (o "!" vence o :focus-visible de globals.css).
export const FIELD =
  "w-full rounded-xl border border-line bg-surface-2/70 px-4 py-3 text-base text-text transition-colors placeholder:text-muted/60 hover:border-muted/60 focus:border-amber focus:outline-none! focus:ring-3 focus:ring-amber/20";
export const PRIMARY_BUTTON =
  "bg-brand inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 font-semibold text-ink transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60";

/**
 * Envio sem a limpeza automática do React depois da ação (que apagaria o que foi digitado e devolveria
 * os selects ao primeiro item): depois de um erro, o formulário continua como estava. O atributo
 * action continua no <form> para funcionar sem JavaScript.
 */
export function useManualSubmit(action: (data: FormData) => void) {
  const [, startTransition] = useTransition();
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // FormData(form, submitter) não existe em Safari/Chromium antigos: o botão que enviou entra à mão.
    const data = new FormData(e.currentTarget);
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.name && !data.has(submitter.name)) data.append(submitter.name, submitter.value);
    startTransition(() => action(data));
  };
}

/** Conta as respostas da ação (cada envio respondido devolve um objeto novo): chave para repetir animações. */
export function useResultKey(state: unknown) {
  const [last, setLast] = useState(state);
  const [count, setCount] = useState(0);
  if (state !== last) {
    setLast(state);
    setCount(count + 1);
  }
  return count;
}

/** Depois de salvar, apaga a senha da conta e o PIN digitados (ref no <form>). */
export function useClearSecretsOnSave(state: ProfileFormState) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state?.saved) return;
    form.current?.querySelectorAll<HTMLInputElement>("input[name=password], input[name=pin]").forEach((input) => {
      input.value = "";
    });
  }, [state]);
  return form;
}

/** Senha da conta, com o botão de mostrar/ocultar. */
export function PasswordField({ id, hint }: { id: string; hint?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm text-muted">
        Senha da conta
      </label>
      <div className="relative">
        <input
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          required
          autoComplete="current-password"
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`${FIELD} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label="Mostrar senha"
          aria-pressed={visible}
          aria-controls={id}
          className="absolute inset-y-0 right-1 my-auto grid size-10 place-items-center rounded-lg text-muted transition-colors hover:text-text"
        >
          <Icon name={visible ? "eye-off" : "eye"} size={18} />
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Resultado do envio: o erro treme (e é lido na hora); o "salvo" entra com um check animado numa
 * região polida. resultKey (useResultKey) repete a animação a cada resposta, mesmo com o texto igual.
 */
export function FormStatus({ state, saved, resultKey }: { state: ProfileFormState; saved?: string; resultKey: number }) {
  return (
    <>
      {state?.error && (
        <p key={resultKey} role="alert" className="flex animate-shake items-start gap-2 text-sm text-ember">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}
      <p aria-live="polite" className="text-sm">
        {state?.saved && saved && (
          <span key={resultKey} className="inline-flex animate-fade-in items-center gap-2">
            <span className="grid size-5 animate-scale-in place-items-center rounded-full bg-brand text-ink">
              <Icon name="check" size={13} />
            </span>
            {saved}
          </span>
        )}
      </p>
    </>
  );
}
