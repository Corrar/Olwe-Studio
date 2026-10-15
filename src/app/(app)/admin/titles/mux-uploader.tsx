"use client";

import { useEffect, useRef, useState } from "react";
import { checkMuxUpload, startMuxUpload } from "@/app/actions/licensed";
import { Icon } from "@/components/icons";

const POLL_MS = 4000;

type Phase =
  | { step: "idle" }
  | { step: "uploading"; percent: number; name: string }
  | { step: "processing"; name: string }
  | { step: "ready"; name: string }
  | { step: "error"; message: string };

/**
 * Envia o arquivo de vídeo direto do navegador para o Mux, em partes (retoma sozinho quando a rede
 * oscila), e espera o Mux preparar o HLS. No fim, preenche o campo do vídeo com "mux:<asset id>".
 */
export function MuxUploader({ onReady }: { onReady: (assetId: string) => void }) {
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const abort = useRef<() => void>(() => {});
  const busy = phase.step === "uploading" || phase.step === "processing";

  useEffect(() => () => abort.current(), []);

  // Sair da página no meio do envio perde o vídeo: o navegador pergunta antes.
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  async function send(file: File) {
    abort.current();
    setPhase({ step: "uploading", percent: 0, name: file.name });
    const upload = await startMuxUpload();
    if ("error" in upload) return setPhase({ step: "error", message: upload.error });

    const { UpChunk } = await import("@mux/upchunk");
    const chunked = UpChunk.createUpload({ endpoint: upload.url, file, chunkSize: 30720 });
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    abort.current = () => {
      stopped = true;
      clearTimeout(timer);
      chunked.abort();
    };
    chunked.on("progress", (e: CustomEvent<number>) => setPhase({ step: "uploading", percent: Math.floor(e.detail), name: file.name }));
    chunked.on("error", () => setPhase({ step: "error", message: "O envio falhou. Confira a conexão e tente de novo." }));
    chunked.on("success", () => {
      setPhase({ step: "processing", name: file.name });
      const poll = async () => {
        if (stopped) return;
        const state = await checkMuxUpload(upload.id);
        if (stopped) return;
        if (state.status === "ready") {
          setPhase({ step: "ready", name: file.name });
          onReady(state.assetId);
        } else if (state.status === "error") {
          setPhase({ step: "error", message: "O Mux não conseguiu processar este arquivo. Tente outro formato (MP4 H.264 é o mais seguro)." });
        } else timer = setTimeout(poll, POLL_MS);
      };
      poll();
    });
  }

  return (
    <div className="rounded-xl border border-dashed border-line p-4">
      <label className={`flex flex-wrap items-center gap-3 ${busy ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>
        <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold ring-1 ring-inset ring-white/15 hover:bg-white/20">
          <Icon name="film" size={16} />
          Enviar arquivo para o Mux
        </span>
        <span className="text-xs text-muted">O arquivo vai direto para o Mux, que converte para streaming em HD.</span>
        <input
          type="file"
          accept="video/*,.mkv,.mov"
          disabled={busy}
          className="sr-only"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            if (file) send(file);
          }}
        />
      </label>

      {phase.step !== "idle" && (
        <div role="status" className="mt-3 text-sm">
          {phase.step === "uploading" && (
            <>
              <p className="flex justify-between gap-3 text-muted">
                <span className="truncate">Enviando {phase.name}…</span>
                <span className="tabular-nums">{phase.percent}%</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="bg-brand h-full rounded-full transition-[width]" style={{ width: `${phase.percent}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted">Não feche esta página até terminar.</p>
            </>
          )}
          {phase.step === "processing" && (
            <p className="flex items-center gap-2 text-muted">
              <span aria-hidden="true" className="size-3 animate-spin rounded-full border-2 border-amber border-t-transparent" />
              Enviado. O Mux está preparando o vídeo para streaming (alguns minutos para um longa)…
            </p>
          )}
          {phase.step === "ready" && (
            <p className="flex items-center gap-2 text-emerald-300">
              <Icon name="check" size={16} />
              {phase.name} pronto no Mux. Salve o filme para usar este vídeo.
            </p>
          )}
          {phase.step === "error" && (
            <p className="flex items-center gap-2 text-ember">
              <Icon name="alert" size={16} />
              {phase.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
