"use client";

import { useActionState } from "react";
import { updateProfileLimit } from "@/app/actions/profiles";
import { KIDS_MAX_LIMIT, limitLabel, PROFILE_LIMITS, type AgeRating } from "@/lib/classification";

/** Limite de classificação de um perfil. Salvar pede a senha da conta. */
export function LimitForm({ profileId, name, isKids, limit }: { profileId: string; name: string; isKids: boolean; limit: AgeRating }) {
  const [state, action, pending] = useActionState(updateProfileLimit.bind(null, profileId), undefined);
  return (
    <form action={action} className="mt-2 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`limit-${profileId}`}>
          Classificação máxima de {name}
        </label>
        <select
          id={`limit-${profileId}`}
          name="maxRating"
          defaultValue={limit}
          className="rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs focus:border-amber focus:outline-none"
        >
          {PROFILE_LIMITS.filter((l) => !isKids || l <= KIDS_MAX_LIMIT).map((l) => (
            <option key={l} value={l}>
              {limitLabel(l)}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={`password-${profileId}`}>
          Senha da conta
        </label>
        <input
          id={`password-${profileId}`}
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Senha da conta"
          className="w-32 rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs focus:border-amber focus:outline-none"
        />
        <button disabled={pending} className="rounded-lg px-2 py-1 text-xs text-amber hover:bg-amber/10 disabled:opacity-50">
          Salvar
        </button>
      </div>
      {state?.error && (
        <p role="alert" className="text-xs text-ember">
          {state.error}
        </p>
      )}
      {state?.saved && <p className="text-xs text-muted">Limite salvo.</p>}
    </form>
  );
}
