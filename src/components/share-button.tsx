"use client";

import { Icon } from "./icons";
import { useToast } from "./toast";

/**
 * Botão redondo de compartilhar: abre a folha de compartilhamento do sistema (Web Share API) e,
 * sem ela, copia o link e avisa. O rótulo aparece como dica no hover e no foco.
 */
export function ShareButton({ title, path }: { title: string; /** Caminho da página, sem parâmetros. */ path: string }) {
  const { show } = useToast();

  async function share() {
    const url = new URL(path, window.location.origin).href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${title} | Olwe`, url });
        return;
      } catch (err) {
        // Cancelar a folha não é erro; outras falhas caem para copiar o link.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      show("Link copiado", { tone: "success" });
    } catch {
      show("Não foi possível copiar o link.", { tone: "error" });
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label="Compartilhar"
      className="group/share relative grid size-12 shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-inset ring-white/15 backdrop-blur transition duration-200 ease-out-expo hover:bg-white/20 active:scale-[0.94]"
    >
      <Icon name="share" size={20} />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md bg-surface-2 px-2 py-1 text-xs font-semibold opacity-0 shadow-lg ring-1 ring-white/10 transition duration-200 ease-out-expo group-focus-visible/share:translate-y-0 group-focus-visible/share:opacity-100 pointer-fine:group-hover/share:translate-y-0 pointer-fine:group-hover/share:opacity-100"
      >
        Compartilhar
      </span>
    </button>
  );
}
