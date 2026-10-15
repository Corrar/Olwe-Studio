import { AuthFrame } from "@/components/auth-frame";
import { Logo } from "@/components/logo";

/**
 * Telas de conta: brilho da marca ao fundo e o conteúdo num cartão de vidro. No celular o cartão
 * some e o formulário ocupa a largura toda, como nos apps.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative isolate flex min-h-svh flex-col overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-48 -top-48 size-[36rem] rounded-full bg-ember/20 blur-3xl" />
        <div className="absolute -bottom-56 -right-40 size-[38rem] rounded-full bg-amber/10 blur-3xl" />
        {/* Trama de pontos bem leve, que some nas bordas. */}
        <div className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] bg-size-[1.5rem_1.5rem] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>

      <header className="pt-safe">
        <div className="gutter flex h-16 items-center sm:h-20">
          <Logo />
        </div>
      </header>

      <main className="gutter flex flex-1 justify-center pb-[calc(3rem+env(safe-area-inset-bottom))] pt-4 sm:items-center sm:pt-0">
        <AuthFrame>{children}</AuthFrame>
      </main>
    </div>
  );
}
