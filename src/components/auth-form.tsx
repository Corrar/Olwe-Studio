"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

type Field = { name: string; label: string; type: string; autoComplete: string };

export function AuthForm({
  action,
  fields,
  submitLabel,
  footer,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  fields: Field[];
  submitLabel: string;
  footer: { text: string; href: string; link: string };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="w-full space-y-4">
      {fields.map((f) => (
        <label key={f.name} className="block space-y-1.5">
          <span className="text-sm text-muted">{f.label}</span>
          <input
            name={f.name}
            type={f.type}
            autoComplete={f.autoComplete}
            defaultValue={state?.fields?.[f.name]}
            required
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 focus:border-amber focus:outline-none"
          />
        </label>
      ))}
      {state?.error && (
        <p role="alert" className="text-sm text-ember">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="bg-brand w-full rounded-full py-3 font-semibold text-ink transition hover:brightness-110 disabled:opacity-60">
        {pending ? "Aguarde…" : submitLabel}
      </button>
      <p className="text-center text-sm text-muted">
        {footer.text}{" "}
        <Link href={footer.href} className="text-amber hover:underline">
          {footer.link}
        </Link>
      </p>
    </form>
  );
}
