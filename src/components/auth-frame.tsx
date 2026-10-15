"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";

// Páginas de conta com conteúdo em duas colunas (o cadastro, com os planos ao lado): cartão mais largo.
const WIDE = new Set(["signup"]);

/** Cartão de vidro das telas de conta; no celular some e o conteúdo ocupa a largura toda. */
export function AuthFrame({ children }: { children: ReactNode }) {
  const wide = WIDE.has(useSelectedLayoutSegment() ?? "");
  return (
    <div
      className={`w-full animate-fade-up sm:rounded-3xl sm:border sm:border-line/80 sm:bg-ink/70 sm:p-10 sm:shadow-2xl sm:shadow-black/60 sm:backdrop-blur-xl ${
        wide ? "max-w-md lg:max-w-4xl" : "max-w-md"
      }`}
    >
      {children}
    </div>
  );
}
