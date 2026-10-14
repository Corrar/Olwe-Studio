"use client";

import { useActionState, useState } from "react";
import { deleteProfile, updateProfileLimit, updateProfileLock } from "@/app/actions/profiles";
import { Icon } from "@/components/icons";
import { KIDS_MAX_LIMIT, limitLabel, PROFILE_LIMITS, RATING_COLORS, ratingLabel, type AgeRating } from "@/lib/classification";
import { FIELD, FormStatus, PasswordField, PRIMARY_BUTTON, useClearSecretsOnSave, useManualSubmit, useResultKey } from "./form-kit";

/** Limite de classificação de um perfil. Salvar pede a senha da conta. */
export function LimitForm({ profileId, isKids, limit }: { profileId: string; isKids: boolean; limit: AgeRating }) {
  const [state, action, pending] = useActionState(updateProfileLimit.bind(null, profileId), undefined);
  const resultKey = useResultKey(state);
  const onSubmit = useManualSubmit(action);
  const form = useClearSecretsOnSave(state);
  // Controlado: o select mantém o valor escolhido depois de um erro de senha.
  const [value, setValue] = useState<AgeRating>(limit);
  const limits = PROFILE_LIMITS.filter((l) => !isKids || l <= KIDS_MAX_LIMIT);

  return (
    <form ref={form} action={action} onSubmit={onSubmit} className="space-y-5">
      {/* A escala do ClassInd: o que fica liberado (até o limite) e o que some do perfil. */}
      <ol aria-hidden="true" className="flex flex-wrap gap-2">
        {limits.map((l) => {
          const allowed = l <= value;
          return (
            <li
              key={l}
              className={`relative grid size-10 place-items-center rounded-lg font-display text-sm font-bold transition duration-300 ease-out-expo sm:size-11 ${
                allowed ? "scale-100 shadow-md shadow-black/40" : "scale-90 opacity-30 grayscale"
              }`}
              style={{ background: RATING_COLORS[l].bg, color: RATING_COLORS[l].fg }}
            >
              {ratingLabel(l)}
              {!allowed && (
                <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full bg-ink text-text">
                  <Icon name="lock" size={10} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={`limit-${profileId}`} className="block text-sm text-muted">
            Classificação máxima
          </label>
          <div className="relative">
            <select
              id={`limit-${profileId}`}
              name="maxRating"
              value={value}
              onChange={(e) => setValue(Number(e.target.value) as AgeRating)}
              className={`${FIELD} cursor-pointer appearance-none pr-11`}
            >
              {limits.map((l) => (
                <option key={l} value={l}>
                  {limitLabel(l)}
                </option>
              ))}
            </select>
            <Icon name="chevron-down" size={18} className="pointer-events-none absolute inset-y-0 right-4 my-auto text-muted" />
          </div>
        </div>
        <PasswordField id={`limit-password-${profileId}`} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button disabled={pending} className={PRIMARY_BUTTON}>
          Salvar
        </button>
        <FormStatus state={state} saved="Limite salvo." resultKey={resultKey} />
      </div>
    </form>
  );
}

/** Bloqueio de perfil com PIN de 4 dígitos (ativar, trocar ou remover). Pede a senha da conta. */
export function LockForm({ profileId, name, locked }: { profileId: string; name: string; locked: boolean }) {
  const [state, action, pending] = useActionState(updateProfileLock.bind(null, profileId), undefined);
  const resultKey = useResultKey(state);
  const onSubmit = useManualSubmit(action);
  const form = useClearSecretsOnSave(state);

  return (
    <form ref={form} action={action} onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={`pin-${profileId}`} className="block text-sm text-muted">
            {locked ? "Novo PIN" : "PIN"} de 4 números para {name}
          </label>
          <input
            id={`pin-${profileId}`}
            name="pin"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            required
            autoComplete="off"
            placeholder="••••"
            title="4 números"
            className={`${FIELD} font-display text-lg tracking-[0.5em]`}
          />
        </div>
        <PasswordField id={`lock-password-${profileId}`} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className={PRIMARY_BUTTON}>
          <Icon name="lock" size={18} />
          {locked ? "Trocar PIN" : "Ativar"}
        </button>
        {locked && (
          // Remover não precisa de PIN: formNoValidate deixa o campo vazio passar.
          <button
            name="intent"
            value="remove"
            formNoValidate
            disabled={pending}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-5 text-muted transition-colors hover:border-ember/60 hover:bg-ember/10 hover:text-ember disabled:opacity-60"
          >
            <Icon name="unlock" size={18} />
            Remover bloqueio
          </button>
        )}
      </div>
      <FormStatus state={state} saved="Bloqueio atualizado." resultKey={resultKey} />
    </form>
  );
}

/** Excluir perfil, com confirmação pela senha da conta. Deu certo: volta para "Gerenciar perfis". */
export function DeleteForm({ profileId, name }: { profileId: string; name: string }) {
  const [state, action, pending] = useActionState(deleteProfile.bind(null, profileId), undefined);
  const resultKey = useResultKey(state);
  const onSubmit = useManualSubmit(action);

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-5">
      <p className="flex items-start gap-3 rounded-xl border border-ember/30 bg-ember/10 p-4 text-sm text-text">
        <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-ember" />
        Excluir {name}? A Minha Lista, o progresso e o histórico deste perfil somem para sempre.
      </p>
      <div className="sm:max-w-sm">
        <PasswordField id={`delete-password-${profileId}`} />
      </div>
      <button
        disabled={pending}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ember px-6 font-semibold text-ink transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
      >
        <Icon name="trash" size={18} />
        Confirmar exclusão
      </button>
      <FormStatus state={state} resultKey={resultKey} />
    </form>
  );
}
