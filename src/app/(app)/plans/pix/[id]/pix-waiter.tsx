"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";

const POLL_MS = 5000;
const DONE = ["approved", "rejected", "cancelled", "refunded", "charged_back"];

/** QR Code e "copia e cola" do Pix; confere o pagamento a cada 5 segundos até ele cair. */
export function PixWaiter({ id, initialStatus, qrCode, qrCodeBase64 }: { id: string; initialStatus: string; qrCode: string; qrCodeBase64: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (DONE.includes(status)) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/billing/pix/${id}`, { cache: "no-store" });
        const data = (await res.json()) as { status?: string };
        if (data.status) setStatus(data.status);
      } catch {
        // Sem conexão: tenta de novo na próxima volta.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [id, status]);

  if (status === "approved") {
    return (
      <div role="status" className="mt-8 animate-fade-up rounded-2xl border border-amber/40 bg-surface p-6">
        <Icon name="check" size={40} className="mx-auto text-amber" />
        <p className="mt-3 font-display text-xl font-semibold">Pagamento confirmado!</p>
        <p className="mt-1 text-sm text-muted">Seu Olwe Premium já está ativo. Bom filme, sem anúncios.</p>
        <Link href="/browse" className="bg-brand mt-5 inline-flex min-h-11 items-center gap-2 rounded-full px-6 font-semibold text-ink">
          <Icon name="play" size={18} />
          Começar a assistir
        </Link>
      </div>
    );
  }

  if (DONE.includes(status)) {
    return (
      <div role="alert" className="mt-8 rounded-2xl border border-line bg-surface p-6">
        <Icon name="alert" size={36} className="mx-auto text-ember" />
        <p className="mt-3 font-semibold">Este Pix não foi concluído.</p>
        <p className="mt-1 text-sm text-muted">Ele expirou ou foi cancelado. Volte aos planos para gerar outro.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
      {qrCodeBase64 && (
        // eslint-disable-next-line @next/next/no-img-element -- QR Code em data URI, sem otimização.
        <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code do Pix" width={240} height={240} className="mx-auto rounded-lg bg-white p-2" />
      )}
      <p className="mt-4 text-sm text-muted">Abra o app do seu banco, escolha Pix e leia o QR Code, ou use o código abaixo.</p>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(qrCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          } catch {
            setCopied(false);
          }
        }}
        className="bg-brand mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-6 font-semibold text-ink"
      >
        <Icon name={copied ? "check" : "layers"} size={18} />
        {copied ? "Código copiado" : "Copiar código Pix"}
      </button>
      <p className="mt-3 break-all rounded-lg bg-surface-2/70 p-3 text-left font-mono text-[0.6875rem] text-muted">{qrCode}</p>
      <p role="status" className="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
        <span aria-hidden="true" className="size-3 animate-spin rounded-full border-2 border-amber border-t-transparent" />
        Aguardando o pagamento…
      </p>
    </div>
  );
}
