"use client";

import { useActionState } from "react";
import { unlockProfile } from "@/app/actions/profiles";

export function PinForm({ profileId }: { profileId: string }) {
  const [state, action, pending] = useActionState(unlockProfile.bind(null, profileId), undefined);
  return (
    <form action={action} className="flex w-full max-w-xs flex-col items-center gap-3">
      <label className="sr-only" htmlFor="pin">
        PIN
      </label>
      <input
        id="pin"
        name="pin"
        type="password"
        inputMode="numeric"
        pattern="\d{4}"
        maxLength={4}
        required
        autoFocus
        autoComplete="off"
        className="w-40 rounded-xl border border-line bg-surface px-4 py-3 text-center font-display text-2xl tracking-[0.6em] focus:border-amber focus:outline-none"
      />
      {state?.error && (
        <p role="alert" className="text-sm text-ember">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="bg-brand w-40 rounded-full py-3 font-semibold text-ink disabled:opacity-60">
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
