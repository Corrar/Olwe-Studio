"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions/auth";
import { Icon, type IconName } from "./icons";

// Peças das telas de conta (entrar, cadastro, senha, confirmação de e-mail).

export type AuthField = {
  name: string;
  label: string;
  type: "text" | "email" | "password";
  autoComplete: string;
  defaultValue?: string;
  /** Dica embaixo do campo, trocada pelo erro quando ele aparece. */
  hint?: string;
  /** Link embaixo do campo (ex.: "Esqueceu a senha?"). */
  link?: { href: string; label: string };
  autoFocus?: boolean;
};

const INPUT =
  "h-12 w-full rounded-xl border bg-surface/80 px-4 text-base text-text transition-[border-color,box-shadow] duration-200 outline-none focus:border-amber focus:ring-3 focus:ring-amber/25";

function Spinner() {
  return <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

/** Botão de envio com "Aguarde…" enquanto a ação roda. */
export function SubmitButton({ children, pendingLabel = "Aguarde…" }: { children: ReactNode; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-brand flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 font-semibold text-ink shadow-lg shadow-ember/20 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-75"
    >
      {pending ? (
        <>
          <Spinner />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Aviso dentro do cartão: sucesso é anunciado com educação (status), erro na hora (alert). Dentro de
 * uma região que já anuncia (live), vai sem papel próprio.
 */
export function Notice({ tone, live = true, children }: { tone: "success" | "error"; live?: boolean; children: ReactNode }) {
  const error = tone === "error";
  return (
    <p
      role={!live ? undefined : error ? "alert" : "status"}
      className={`mb-5 flex animate-fade-in items-start gap-3 rounded-xl px-4 py-3 text-left text-sm ${
        error ? "bg-ember/15 text-ember" : "bg-amber/12 text-amber"
      }`}
    >
      <Icon name={error ? "alert" : "check"} size={18} className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Ícone num círculo com o degradê da marca, no topo dos cartões de mensagem. */
export function IconBadge({ icon, pulse }: { icon: IconName; pulse?: boolean }) {
  return (
    <div className="relative mx-auto mb-6 flex size-16 items-center justify-center">
      {/* Onda saindo do círculo: "esperando o e-mail". Some com o movimento reduzido. */}
      {pulse && <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-ember/30 [animation-duration:2.4s]" />}
      <span className="bg-brand relative flex size-16 items-center justify-center rounded-full text-ink shadow-xl shadow-ember/30">
        <Icon name={icon} size={30} />
      </span>
    </div>
  );
}

/**
 * Formulário de conta: erro no campo certo (role=alert, ligado ao campo), botão de mostrar a senha,
 * aviso de Caps Lock e foco no campo a corrigir depois de um erro.
 */
export function AuthForm({
  action,
  fields,
  submitLabel,
  footer,
  username,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  fields: AuthField[];
  submitLabel: string;
  footer?: { text: string; href: string; link: string };
  /** Conta do formulário de nova senha: o gerenciador de senhas salva a senha nova na conta certa. */
  username?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [capsLock, setCapsLock] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  // Durante um novo envio o erro anterior sai de cena (e volta animado se repetir).
  const error = pending ? undefined : state?.error;
  const errorField = error && fields.some((f) => f.name === state?.field) ? state?.field : undefined;

  // Depois de um erro, o foco vai para o campo a corrigir (ou para o primeiro campo vazio).
  useEffect(() => {
    if (!state?.error) return;
    const inputs = [...(formRef.current?.querySelectorAll<HTMLInputElement>("input:not([type=hidden]):not(.hidden)") ?? [])];
    (inputs.find((i) => i.name === state.field) ?? inputs.find((i) => !i.value))?.focus();
  }, [state]);

  const watchCapsLock = (name: string) => (e: KeyboardEvent<HTMLInputElement>) => {
    const on = e.getModifierState("CapsLock");
    setCapsLock((current) => (on ? name : current === name ? null : current));
  };

  return (
    <form ref={formRef} action={formAction} onSubmit={() => setVisible({})} className="w-full">
      {username && <input type="text" name="username" autoComplete="username" value={username} readOnly className="hidden" />}

      <div role="status" aria-live="polite">
        {!pending && state?.notice && (
          <Notice tone="success" live={false}>
            {state.notice}
          </Notice>
        )}
      </div>

      <div className="space-y-5">
        {fields.map((f) => {
          const inputId = `${id}-${f.name}`;
          const invalid = errorField === f.name;
          const password = f.type === "password";
          const shown = password && visible[f.name];
          const describedBy = invalid ? `${inputId}-error` : f.hint ? `${inputId}-hint` : undefined;
          return (
            <div key={f.name}>
              <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-text/85">
                {f.label}
              </label>
              <div className="relative">
                <input
                  id={inputId}
                  name={f.name}
                  type={shown ? "text" : f.type}
                  autoComplete={f.autoComplete}
                  defaultValue={state?.fields?.[f.name] ?? f.defaultValue}
                  required
                  autoFocus={f.autoFocus}
                  autoCapitalize={f.type === "text" ? "words" : "none"}
                  autoCorrect="off"
                  spellCheck={false}
                  aria-invalid={invalid || undefined}
                  aria-describedby={describedBy}
                  onKeyDown={password ? watchCapsLock(f.name) : undefined}
                  onKeyUp={password ? watchCapsLock(f.name) : undefined}
                  onBlur={password ? () => setCapsLock(null) : undefined}
                  className={`${INPUT} ${password ? "pr-12" : ""} ${invalid ? "border-ember" : "border-line hover:border-muted/60"}`}
                />
                {password && (
                  <button
                    type="button"
                    onClick={() => setVisible((v) => ({ ...v, [f.name]: !v[f.name] }))}
                    aria-label={shown ? "Ocultar senha" : "Mostrar senha"}
                    aria-controls={inputId}
                    className="absolute inset-y-1 right-1 flex w-10 items-center justify-center rounded-lg text-muted transition-colors hover:text-text"
                  >
                    <Icon name={shown ? "eye-off" : "eye"} size={20} />
                  </button>
                )}
              </div>
              {invalid ? (
                <p id={`${inputId}-error`} role="alert" className="mt-1.5 flex animate-fade-in items-start gap-1.5 text-sm text-ember">
                  <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
                  {error}
                </p>
              ) : (
                f.hint && (
                  <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-muted">
                    {f.hint}
                  </p>
                )
              )}
              {capsLock === f.name && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber">
                  <Icon name="alert" size={14} />
                  Caps Lock ativado
                </p>
              )}
              {f.link && (
                <p className="mt-2 text-right">
                  <Link href={f.link.href} className="rounded text-sm text-muted underline-offset-4 transition-colors hover:text-text hover:underline">
                    {f.link.label}
                  </Link>
                </p>
              )}
            </div>
          );
        })}

        {error && !errorField && (
          <p role="alert" className="flex animate-shake items-start gap-2 rounded-xl bg-ember/15 px-4 py-3 text-sm text-ember">
            <Icon name="alert" size={18} className="mt-px shrink-0" />
            {error}
          </p>
        )}

        <SubmitButton>{submitLabel}</SubmitButton>

        {footer && (
          <p className="text-center text-sm text-muted">
            {footer.text}{" "}
            <Link href={footer.href} className="rounded font-semibold text-amber underline-offset-4 hover:underline">
              {footer.link}
            </Link>
          </p>
        )}
      </div>
    </form>
  );
}
