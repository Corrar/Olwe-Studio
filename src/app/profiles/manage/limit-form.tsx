"use client";

import { useActionState, useState } from "react";
import { updateProfileLimit, updateProfileLock } from "@/app/actions/profiles";
import { KIDS_MAX_LIMIT, limitLabel, PROFILE_LIMITS, type AgeRating } from "@/lib/classification";

const field = "rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs focus:border-amber focus:outline-none";

function PasswordField({ id }: { id: string }) {
  return (
    <>
      <label className="sr-only" htmlFor={id}>
        Senha da conta
      </label>
      <input id={id} name="password" type="password" required autoComplete="current-password" placeholder="Senha da conta" className={`w-32 ${field}`} />
    </>
  );
}

function Status({ state, saved }: { state: { error?: string; saved?: boolean } | undefined; saved: string }) {
  if (state?.error) {
    return (
      <p role="alert" className="text-xs text-ember">
        {state.error}
      </p>
    );
  }
  return state?.saved ? <p className="text-xs text-muted">{saved}</p> : null;
}

/** Limite de classificação de um perfil. Salvar pede a senha da conta. */
export function LimitForm({ profileId, name, isKids, limit }: { profileId: string; name: string; isKids: boolean; limit: AgeRating }) {
  const [state, action, pending] = useActionState(updateProfileLimit.bind(null, profileId), undefined);
  // Controlado: o React limpa o formulário depois da ação, e o select precisa manter o valor escolhido.
  const [value, setValue] = useState<number>(limit);
  return (
    <form action={action} className="mt-2 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`limit-${profileId}`}>
          Classificação máxima de {name}
        </label>
        <select id={`limit-${profileId}`} name="maxRating" value={value} onChange={(e) => setValue(Number(e.target.value))} className={field}>
          {PROFILE_LIMITS.filter((l) => !isKids || l <= KIDS_MAX_LIMIT).map((l) => (
            <option key={l} value={l}>
              {limitLabel(l)}
            </option>
          ))}
        </select>
        <PasswordField id={`password-${profileId}`} />
        <button disabled={pending} className="rounded-lg px-2 py-1 text-xs text-amber hover:bg-amber/10 disabled:opacity-50">
          Salvar
        </button>
      </div>
      <Status state={state} saved="Limite salvo." />
    </form>
  );
}

/** Bloqueio de perfil com PIN de 4 dígitos (ativar, trocar ou remover). Pede a senha da conta. */
export function LockForm({ profileId, name, locked }: { profileId: string; name: string; locked: boolean }) {
  const [state, action, pending] = useActionState(updateProfileLock.bind(null, profileId), undefined);
  return (
    <details className="mt-2 text-xs" open={!!state?.error}>
      <summary className="cursor-pointer text-muted hover:text-text">
        {locked ? "🔒 Bloqueio de perfil ativo" : "Bloqueio de perfil"}
      </summary>
      <form action={action} className="mt-2 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`pin-${profileId}`}>
            PIN de 4 números para {name}
          </label>
          <input
            id={`pin-${profileId}`}
            name="pin"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            autoComplete="off"
            placeholder="PIN (4 números)"
            className={`w-28 ${field}`}
          />
          <PasswordField id={`lock-password-${profileId}`} />
          <button disabled={pending} className="rounded-lg px-2 py-1 text-amber hover:bg-amber/10 disabled:opacity-50">
            {locked ? "Trocar PIN" : "Ativar"}
          </button>
          {locked && (
            <button
              name="intent"
              value="remove"
              formNoValidate
              disabled={pending}
              className="rounded-lg px-2 py-1 text-muted hover:bg-ember/15 hover:text-ember disabled:opacity-50"
            >
              Remover bloqueio
            </button>
          )}
        </div>
        <Status state={state} saved="Bloqueio atualizado." />
      </form>
    </details>
  );
}
