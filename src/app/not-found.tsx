import Link from "next/link";
import { Icon } from "@/components/icons";
import { LogoMark } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="gutter relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden py-16 text-center">
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 -z-10 size-[min(40rem,120vw)] -translate-x-1/2 -translate-y-1/2 animate-fade-in rounded-full bg-ember/10 blur-3xl" />

      {/* "4 ◯ 4": o anel do logo faz o zero. */}
      <p aria-hidden="true" className="mb-6 flex items-center gap-2 font-display text-7xl font-bold leading-none sm:gap-3 sm:text-8xl">
        <span className="text-gradient animate-fade-up">4</span>
        <span className="animate-scale-in [animation-delay:120ms]">
          <LogoMark size={64} />
        </span>
        <span className="text-gradient animate-fade-up [animation-delay:200ms]">4</span>
      </p>

      <h1 className="animate-fade-up font-display text-3xl font-semibold [animation-delay:260ms]">Página não encontrada</h1>
      <p className="mt-2 max-w-md animate-fade-up text-pretty text-muted [animation-delay:320ms]">
        O título ou a página que você procurou não existe.
      </p>

      <div className="mt-8 flex animate-fade-up flex-wrap justify-center gap-3 [animation-delay:380ms]">
        <Link
          href="/browse"
          className="bg-brand inline-flex min-h-11 items-center gap-2 rounded-full px-6 font-semibold text-ink shadow-lg shadow-ember/20 transition hover:brightness-110 active:scale-95"
        >
          <Icon name="home" size={18} />
          Voltar ao início
        </Link>
        <Link
          href="/search"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-6 font-semibold transition-colors hover:border-text"
        >
          <Icon name="search" size={18} />
          Buscar títulos
        </Link>
      </div>
    </div>
  );
}
