"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createProfile } from "@/app/actions/profiles";
import { Avatar } from "@/components/avatar";
import { AVATARS } from "@/lib/avatars";
import { DEFAULT_ADULT_LIMIT, DEFAULT_KIDS_LIMIT, KIDS_MAX_LIMIT, limitLabel, PROFILE_LIMITS } from "@/lib/classification";

export function ProfileForm() {
  const [state, action, pending] = useActionState(createProfile, undefined);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string>(AVATARS[0].id);
  const [isKids, setIsKids] = useState(false);
  const [limit, setLimit] = useState<number>(DEFAULT_ADULT_LIMIT);
  const limits = PROFILE_LIMITS.filter((l) => !isKids || l <= KIDS_MAX_LIMIT);

  return (
    <form action={action} className="w-full max-w-sm space-y-6">
      <div className="flex justify-center">
        <Avatar avatar={avatar} name={name || "?"} size={96} />
      </div>
      <label className="block space-y-2">
        <span className="text-sm text-muted">Nome</span>
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          required
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 focus:border-amber focus:outline-none"
        />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm text-muted">Cor do avatar</legend>
        <div className="flex gap-3">
          {AVATARS.map((a) => (
            <label key={a.id} className="cursor-pointer">
              <input type="radio" name="avatar" value={a.id} checked={avatar === a.id} onChange={() => setAvatar(a.id)} className="peer sr-only" />
              <span
                className="block h-9 w-9 rounded-lg ring-2 ring-transparent ring-offset-2 ring-offset-ink peer-checked:ring-amber peer-focus-visible:ring-amber"
                style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }}
                aria-label={a.id}
              />
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="isKids"
          checked={isKids}
          onChange={(e) => {
            setIsKids(e.target.checked);
            setLimit(e.target.checked ? DEFAULT_KIDS_LIMIT : DEFAULT_ADULT_LIMIT);
          }}
          className="h-5 w-5 accent-[var(--amber)]"
        />
        <span>Perfil infantil</span>
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-muted">Classificação indicativa máxima</span>
        <select
          name="maxRating"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 focus:border-amber focus:outline-none"
        >
          {limits.map((l) => (
            <option key={l} value={l}>
              {limitLabel(l)}
            </option>
          ))}
        </select>
        <span className="block text-xs text-muted">
          Títulos acima desse limite não aparecem neste perfil. Conteúdo 18+ não existe no Olwe.
        </span>
      </label>
      {state?.error && <p className="text-sm text-ember">{state.error}</p>}
      <div className="flex gap-3">
        <button disabled={pending} className="bg-brand flex-1 rounded-full py-3 font-semibold text-ink disabled:opacity-60">
          {pending ? "Criando…" : "Criar perfil"}
        </button>
        <Link href="/profiles" className="flex-1 rounded-full border border-line py-3 text-center text-muted hover:text-text">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
