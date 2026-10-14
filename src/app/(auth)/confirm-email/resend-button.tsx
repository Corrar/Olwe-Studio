"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { resendVerification } from "@/app/actions/auth";
import { Icon } from "@/components/icons";

const BUTTON = "flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 font-semibold transition active:scale-[0.98] disabled:opacity-75";

/**
 * Contagem regressiva no relógio do aparelho, a partir dos segundos que o servidor informou (o relógio
 * do aparelho pode não bater com o do servidor). O prazo começa quando a tela chega ao aparelho.
 */
function countdown(seconds: number) {
  let deadline: number | null = null;
  return {
    subscribe(onTick: () => void) {
      const timer = setInterval(onTick, 250);
      return () => clearInterval(timer);
    },
    left() {
      deadline ??= Date.now() + seconds * 1000;
      return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    },
    initial: () => seconds,
  };
}

/** "Reenviar e-mail", com a espera de um minuto entre envios contada na tela. */
export function ResendButton({ wait }: { wait: number }) {
  const [state, action, pending] = useActionState(resendVerification, undefined);
  // Cada resposta do servidor recomeça a contagem com o tempo que ele informou.
  const timer = useMemo(() => countdown(state?.wait ?? wait), [state, wait]);
  const left = useSyncExternalStore(timer.subscribe, timer.left, timer.initial);
  // Toques durante a espera não vão ao servidor: a contagem balança para chamar a atenção.
  const [nudges, setNudges] = useState(0);
  const hintId = useId();

  return (
    <div>
      <form
        action={action}
        onSubmit={(e) => {
          if (left === 0) return;
          e.preventDefault();
          setNudges((n) => n + 1);
        }}
      >
        <button
          type="submit"
          disabled={pending}
          aria-describedby={hintId}
          className={`${BUTTON} border border-line bg-white/[0.04] hover:bg-white/10 ${left > 0 ? "text-muted" : "text-text"}`}
        >
          <Icon name="mail" size={18} />
          {pending ? "Enviando…" : "Reenviar e-mail"}
        </button>
      </form>
      <p id={hintId} key={nudges} className={`mt-2 min-h-5 text-sm text-muted ${nudges ? "animate-shake" : ""}`}>
        {left > 0 ? `Aguarde ${left} segundos para reenviar.` : "Não chegou? Você já pode pedir outro."}
      </p>
      <div role="status" aria-live="polite" className="text-sm font-medium text-amber">
        {!pending && state?.sent && "E-mail enviado. Confira sua caixa de entrada."}
        {nudges > 0 && left > 0 && <span className="sr-only">Ainda não dá para reenviar. Espere a contagem terminar.</span>}
      </div>
      {!pending && state?.error && !state.wait && (
        <p role="alert" className="mt-1 text-sm text-ember">
          {state.error}
        </p>
      )}
    </div>
  );
}

/**
 * "Já confirmei": recarrega a página no servidor, que leva para os perfis se o e-mail já foi
 * confirmado. Também confere sozinho quando a aba volta a ficar visível (depois de abrir o link).
 */
export function ConfirmedButton() {
  const router = useRouter();
  const [checking, startTransition] = useTransition();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let last = 0;
    const recheck = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 3000) return;
      last = Date.now();
      router.refresh();
    };
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [router]);

  return (
    <div>
      <button
        type="button"
        disabled={checking}
        onClick={() =>
          startTransition(() => {
            setChecked(true);
            router.refresh();
          })
        }
        className={`bg-brand ${BUTTON} text-ink shadow-lg shadow-ember/20 hover:brightness-110`}
      >
        <Icon name="check" size={18} />
        {checking ? "Verificando…" : "Já confirmei"}
      </button>
      <p role="status" aria-live="polite" className="text-sm text-muted not-empty:mt-2">
        {checked && !checking ? "Ainda não recebemos a confirmação. Abra o link do e-mail e depois toque aqui de novo." : ""}
      </p>
    </div>
  );
}
