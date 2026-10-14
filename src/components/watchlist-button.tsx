"use client";

import { unstable_rethrow } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toggleWatchlist } from "@/app/actions/library";
import type { MediaType } from "@/lib/types";
import { Icon } from "./icons";
import { useToast } from "./toast";

/** Avisos da Minha Lista, iguais no botão da página do título e na prévia dos cartões. */
export function useWatchlistToasts() {
  const { show } = useToast();
  return {
    added: () => show("Adicionado à Minha Lista", { tone: "success", action: { label: "Ver lista", href: "/my-list" } }),
    removed: () => show("Removido da Minha Lista"),
    failed: () => show("Não foi possível atualizar a Minha Lista. Tente de novo.", { tone: "error" }),
  };
}

export function WatchlistButton({ mediaType, itemId, initial }: { mediaType: MediaType; itemId: string; initial: boolean }) {
  const [saved, setSaved] = useOptimistic(initial);
  const [pending, startTransition] = useTransition();
  const toasts = useWatchlistToasts();

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-busy={pending}
      onClick={() => {
        // Sem disabled: o botão não perde o foco do teclado enquanto salva.
        if (pending) return;
        startTransition(async () => {
          setSaved(!saved);
          try {
            if (await toggleWatchlist(mediaType, itemId)) toasts.added();
            else toasts.removed();
          } catch (err) {
            unstable_rethrow(err);
            toasts.failed();
          }
        });
      }}
      className={`inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold ring-1 ring-inset backdrop-blur transition duration-200 ease-out-expo active:scale-[0.97] aria-busy:opacity-80 ${
        saved ? "bg-white/15 ring-amber/50 hover:bg-white/20" : "bg-white/10 ring-white/15 hover:bg-white/20"
      }`}
    >
      <Icon key={saved ? "check" : "plus"} name={saved ? "check" : "plus"} className={`animate-scale-in ${saved ? "text-amber" : ""}`} />
      {/* O sinal continua no texto ("✓ Na Minha Lista"), mas quem aparece é o ícone e quem lê é o aria-pressed. */}
      <span aria-hidden="true" className="sr-only">
        {saved ? "✓ " : "+ "}
      </span>
      {saved ? "Na Minha Lista" : "Minha Lista"}
    </button>
  );
}
