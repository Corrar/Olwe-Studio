import { useEffect, useMemo, useRef } from "react";
import type { MediaType } from "@/lib/types";

// Estatísticas do painel do Olwe (/admin): o player conta o tempo em que o vídeo esteve tocando de
// verdade (pausado ou carregando não conta) e manda a cada 30 s, ao esconder a aba e ao sair da página.
// A visualização vai na hora em que completa 30 s: o aviso de saída da página às vezes se perde.

/** Segundos assistidos para contar uma visualização, como no YouTube. */
const VIEW_SECONDS = 30;
const FLUSH_MS = 30_000;
/** O servidor aceita até 300 s por aviso: o que juntou além disso (aba em segundo plano) vai em partes. */
const CHUNK_SECONDS = 300;

type StatsEvent =
  | { kind: "watch"; mediaType: MediaType; itemId: string; seconds: number; view: boolean }
  | { kind: "ad"; mediaType: MediaType; itemId: string };

/** Manda um aviso para o painel. sendBeacon sobrevive ao fechamento da aba; fetch é o fallback. */
export function sendStats(event: StatsEvent) {
  const body = JSON.stringify(event);
  if (navigator.sendBeacon?.("/api/stats", new Blob([body], { type: "application/json" }))) return;
  fetch("/api/stats", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
}

/**
 * Tempo assistido e visualização do título. O player chama playing() quando o vídeo começa a tocar e
 * stopped() quando ele pausa, para para carregar ou termina.
 */
export function useWatchStats(mediaType: MediaType, itemId: string) {
  const watch = useRef({
    since: null as number | null,
    pending: 0,
    total: 0,
    counted: false,
    viewTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    flush: () => {},
  });

  useEffect(() => {
    const w = watch.current;
    w.pending = 0;
    w.total = 0;
    w.counted = false;
    clearTimeout(w.viewTimer);
    // Trocou de título com o vídeo tocando: a contagem recomeça agora.
    if (w.since !== null) {
      w.since = performance.now();
      w.viewTimer = setTimeout(() => w.flush(), VIEW_SECONDS * 1000 + 250);
    }

    const collect = () => {
      if (w.since === null) return;
      const now = performance.now();
      const seconds = (now - w.since) / 1000;
      w.pending += seconds;
      w.total += seconds;
      w.since = now;
    };
    const flush = () => {
      collect();
      for (let i = 0; i < 12; i++) {
        const view = !w.counted && w.total >= VIEW_SECONDS;
        const seconds = Math.min(Math.floor(w.pending), CHUNK_SECONDS);
        if (seconds < 1 && !view) return;
        w.pending -= seconds;
        if (view) w.counted = true;
        sendStats({ kind: "watch", mediaType, itemId, seconds, view });
      }
    };
    const onHidden = () => document.visibilityState === "hidden" && flush();
    w.flush = flush;
    const interval = setInterval(flush, FLUSH_MS);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      flush();
      clearInterval(interval);
      clearTimeout(w.viewTimer);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [mediaType, itemId]);

  return useMemo(
    () => ({
      playing() {
        const w = watch.current;
        if (w.since !== null) return;
        w.since = performance.now();
        // Avisa assim que completar os segundos da visualização.
        if (!w.counted) w.viewTimer = setTimeout(() => w.flush(), Math.max(0, VIEW_SECONDS - w.total) * 1000 + 250);
      },
      stopped() {
        const w = watch.current;
        clearTimeout(w.viewTimer);
        if (w.since === null) return;
        const seconds = (performance.now() - w.since) / 1000;
        w.pending += seconds;
        w.total += seconds;
        w.since = null;
      },
    }),
    [],
  );
}
