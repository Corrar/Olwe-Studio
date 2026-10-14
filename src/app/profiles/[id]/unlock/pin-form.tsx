"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { unlockProfile } from "@/app/actions/profiles";
import { PRIMARY_BUTTON, useManualSubmit, useResultKey } from "../edit/form-kit";

const SLOTS = [0, 1, 2, 3];

/**
 * PIN em quatro quadrados, como na Netflix. Por baixo é um único campo (transparente, por cima dos
 * quadrados): teclado, colar, leitor de tela e gerenciadores de senha funcionam como num campo comum.
 * Não envia sozinho. Ao enviar, os quadrados esvaziam (pulsando enquanto confere), então o que for
 * digitado durante a conferência não se perde; um PIN errado faz os quadrados tremerem.
 */
export function PinForm({ profileId }: { profileId: string }) {
  const [state, action, pending] = useActionState(unlockProfile.bind(null, profileId), undefined);
  const submit = useManualSubmit(action);
  const input = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState("");
  const [focused, setFocused] = useState(false);
  const attempt = useResultKey(state);

  // Resposta com erro: o foco volta para o PIN, pronto para outra tentativa.
  useEffect(() => {
    if (attempt) input.current?.focus();
  }, [attempt]);

  const error = state?.error;
  const checking = pending && !pin;
  const active = Math.min(pin.length, SLOTS.length - 1);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        submit(e); // lê o PIN do formulário antes de esvaziar os quadrados
        setPin("");
      }}
      className="flex w-full max-w-xs flex-col items-center gap-5"
    >
      <div className="relative">
        <label className="sr-only" htmlFor="pin">
          PIN de 4 números
        </label>
        <input
          ref={input}
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          required
          autoFocus
          autoComplete="off"
          enterKeyHint="go"
          title="4 números"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "pin-error" : undefined}
          className="absolute inset-0 z-10 size-full cursor-text opacity-0"
        />
        {/* A chave muda a cada resposta: o tremor repete a cada PIN errado. */}
        <div key={attempt} aria-hidden="true" className={`flex gap-3 sm:gap-4 ${error ? "animate-shake" : ""}`}>
          {SLOTS.map((i) => {
            const filled = checking || i < pin.length;
            const current = focused && !checking && i === active;
            return (
              <span
                key={i}
                className={`grid size-14 place-items-center rounded-xl border-2 bg-surface/80 transition duration-200 sm:size-16 [@media(max-height:31rem)]:size-12 ${
                  current
                    ? "scale-105 border-amber shadow-[0_0_0_0.25rem_rgb(255_181_71/0.15)]"
                    : error && !pin
                      ? "border-ember/70"
                      : filled
                        ? "border-text/40"
                        : "border-line"
                }`}
              >
                {filled ? (
                  <span className={`size-3.5 rounded-full bg-text ${checking ? "animate-pulse" : "animate-scale-in"}`} />
                ) : (
                  current && <span className="h-6 w-0.5 animate-pulse rounded-full bg-amber" />
                )}
              </span>
            );
          })}
        </div>
      </div>

      {error && (
        <p key={attempt} id="pin-error" role="alert" className="animate-fade-in text-center text-sm text-ember">
          {error}
        </p>
      )}

      <button disabled={pending} className={`${PRIMARY_BUTTON} w-full max-w-60`}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
