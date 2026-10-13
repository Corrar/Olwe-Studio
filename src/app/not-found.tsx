import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <LogoMark size={56} />
      <h1 className="font-display text-3xl font-semibold">Página não encontrada</h1>
      <p className="text-muted">O título ou a página que você procurou não existe.</p>
      <Link href="/browse" className="bg-brand rounded-full px-6 py-3 font-semibold text-ink">
        Voltar ao início
      </Link>
    </div>
  );
}
