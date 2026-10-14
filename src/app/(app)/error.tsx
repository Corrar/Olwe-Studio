"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";

/** Falha inesperada numa página do app: o cabeçalho e as abas continuam, só o conteúdo dá lugar ao aviso. */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="gutter flex min-h-[75svh] flex-col items-center justify-center pb-12 pt-[calc(6rem+env(safe-area-inset-top))] text-center">
      <span className="mb-6 flex size-16 animate-scale-in items-center justify-center rounded-2xl bg-ember/15 text-ember">
        <Icon name="alert" size={32} />
      </span>
      <h1 className="animate-fade-up font-display text-2xl font-bold tracking-tight sm:text-3xl">Algo deu errado por aqui</h1>
      <p className="mt-2 max-w-md animate-fade-up text-pretty text-muted [animation-delay:80ms]">
        Não conseguimos carregar esta parte do Olwe agora. Costuma ser passageiro: tente de novo em instantes.
      </p>
      {error.digest && <p className="mt-2 text-xs text-muted/70">Código do erro: {error.digest}</p>}
      <div className="mt-8 flex animate-fade-up flex-wrap justify-center gap-3 [animation-delay:160ms]">
        <button
          type="button"
          onClick={() => retry()}
          className="bg-brand inline-flex min-h-11 items-center gap-2 rounded-full px-6 font-semibold text-ink shadow-lg shadow-ember/20 transition hover:brightness-110 active:scale-95"
        >
          Tentar de novo
        </button>
        <Link
          href="/browse"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-6 font-semibold transition-colors hover:border-text"
        >
          <Icon name="home" size={18} />
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
