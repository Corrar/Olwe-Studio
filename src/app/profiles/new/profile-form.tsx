"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createProfile } from "@/app/actions/profiles";
import { Avatar, AvatarPicker } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { AVATARS } from "@/lib/avatars";
import { DEFAULT_ADULT_LIMIT, DEFAULT_KIDS_LIMIT, KIDS_MAX_LIMIT, limitLabel, PROFILE_LIMITS } from "@/lib/classification";
import { FIELD, FormStatus, PasswordField, PRIMARY_BUTTON, useManualSubmit, useResultKey } from "../[id]/edit/form-kit";

const MAX_NAME = 20;

export function ProfileForm() {
  const [state, action, pending] = useActionState(createProfile, undefined);
  const resultKey = useResultKey(state);
  // Envio manual: um erro (senha errada, por exemplo) mantém o que foi preenchido, inclusive o limite.
  const onSubmit = useManualSubmit(action);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string>(AVATARS[0].id);
  const [isKids, setIsKids] = useState(false);
  const [limit, setLimit] = useState<number>(DEFAULT_ADULT_LIMIT);
  const limits = PROFILE_LIMITS.filter((l) => !isKids || l <= KIDS_MAX_LIMIT);
  // Mais conteúdo que o infantil padrão pede a senha da conta (a mesma regra da ação).

  return (
    <form
      action={action}
      onSubmit={onSubmit}
      className="w-full max-w-2xl animate-fade-up space-y-8 rounded-3xl border border-line bg-surface/80 p-5 [animation-delay:80ms] sm:p-8"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        <div className="relative mx-auto shrink-0 sm:mx-0">
          {/* A chave troca a cada escolha: a prévia entra de novo com o avatar novo. */}
          <Avatar key={avatar} avatar={avatar} className="size-28 animate-scale-in shadow-xl shadow-black/40 sm:size-36" />
          {isKids && (
            <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 animate-scale-in whitespace-nowrap rounded-full bg-amber px-2.5 py-0.5 text-xs font-bold text-ink shadow-md shadow-black/40">
              Infantil
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-6">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="new-profile-name" className="text-sm text-muted">
                Nome
              </label>
              <span aria-hidden="true" className="text-xs tabular-nums text-muted">
                {name.length}/{MAX_NAME}
              </span>
            </div>
            <input
              id="new-profile-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME}
              required
              autoComplete="off"
              className={FIELD}
            />
          </div>
          <AvatarPicker value={avatar} onChange={setAvatar} legend="Escolha um avatar" />
        </div>
      </div>

      <div className="space-y-5 border-t border-line pt-6">
        {/* Interruptor: o checkbox de verdade fica por cima do desenho (clique, toque e teclado iguais). */}
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line bg-surface-2/50 p-4 transition-colors hover:border-muted/50">
          <span className="min-w-0">
            <span id="kids-label" className="block font-medium">
              Perfil infantil
            </span>
            <span id="kids-hint" className="block text-sm text-muted">
              Só títulos até {KIDS_MAX_LIMIT} anos, sem acesso ao gerenciamento de perfis.
            </span>
          </span>
          <span className="relative inline-flex h-8 w-14 shrink-0">
            <input
              type="checkbox"
              role="switch"
              name="isKids"
              aria-labelledby="kids-label"
              aria-describedby="kids-hint"
              checked={isKids}
              onChange={(e) => {
                setIsKids(e.target.checked);
                setLimit(e.target.checked ? DEFAULT_KIDS_LIMIT : DEFAULT_ADULT_LIMIT);
              }}
              className="peer absolute inset-0 z-10 cursor-pointer appearance-none rounded-full opacity-0"
            />
            <span className="absolute inset-0 rounded-full border border-line bg-surface-2 transition-colors duration-300 peer-checked:border-transparent peer-checked:bg-linear-to-br peer-checked:from-ember peer-checked:to-amber peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-amber" />
            <span className="absolute left-1 top-1 grid size-6 place-items-center rounded-full bg-text text-ink shadow-md shadow-black/40 transition-transform duration-300 ease-out-expo peer-checked:translate-x-6">
              {isKids && <Icon name="check" size={14} className="animate-scale-in" />}
            </span>
          </span>
        </label>

        <div className="space-y-1.5">
          <label htmlFor="new-profile-limit" className="block text-sm text-muted">
            Classificação indicativa máxima
          </label>
          <div className="relative">
            <select
              id="new-profile-limit"
              name="maxRating"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              aria-describedby="new-profile-limit-hint"
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
          <p id="new-profile-limit-hint" className="text-xs text-muted">
            Títulos acima desse limite não aparecem neste perfil. Conteúdo 18+ não existe no Olwe.
          </p>
        </div>

        {/* Criar perfil sempre pede a senha da conta (controle parental). */}
        <PasswordField
          id="new-profile-password"
          hint="A senha da conta protege o controle parental: sem ela, um perfil novo poderia liberar mais conteúdo."
        />
      </div>

      <FormStatus state={state} resultKey={resultKey} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Link
          href="/profiles"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-line px-6 text-muted transition-colors hover:border-text hover:text-text"
        >
          Cancelar
        </Link>
        <button disabled={pending} className={`${PRIMARY_BUTTON} flex-1`}>
          {pending ? "Criando…" : "Criar perfil"}
        </button>
      </div>
    </form>
  );
}
