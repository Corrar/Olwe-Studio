import Link from "next/link";
import { redirect } from "next/navigation";
import { fallbackGradient } from "@/components/artwork";
import { Footer } from "@/components/footer";
import { Logo } from "@/components/logo";
import { getSessionUserId } from "@/lib/session";
import { isDemoCatalog } from "@/lib/tmdb";

const FEATURES = [
  { title: "Zero anúncios", text: "Nada de intervalos, banners ou pré-roll. Você aperta play e assiste." },
  { title: "Até 5 perfis", text: "Cada pessoa da casa com sua lista, seu histórico e suas recomendações." },
  { title: "Continue de onde parou", text: "O Olwe lembra em que ponto você estava, em qualquer dispositivo." },
  { title: "Espaço infantil", text: "Perfis para crianças com catálogo separado e seguro." },
];

export default async function LandingPage() {
  if (await getSessionUserId()) redirect("/profiles");

  return (
    <div className="flex min-h-screen flex-col">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-6 gap-2 opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden>
          {Array.from({ length: 18 }, (_, i) => (
            <div key={i} className="aspect-[2/3] rounded-lg" style={{ background: fallbackGradient(i * 7 + 3) }} />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/80 to-ink" />

        <header className="relative flex items-center justify-between px-4 py-6 sm:px-10">
          <Logo />
          <Link href="/login" className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold backdrop-blur hover:bg-white/20">
            Entrar
          </Link>
        </header>

        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 pb-28 pt-20 text-center sm:pt-32">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-6xl">
            Histórias sem <span className="text-gradient">interrupção</span>.
          </h1>
          <p className="max-w-xl text-lg text-text/80">
            Filmes e séries para toda a família, sem nenhum anúncio. Crie sua conta e comece agora.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="bg-brand rounded-full px-8 py-3.5 font-semibold text-ink shadow-lg shadow-ember/25 hover:brightness-110">
              Criar conta
            </Link>
            <Link href="/login" className="rounded-full border border-line px-8 py-3.5 font-semibold hover:border-text">
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 sm:grid-cols-2 sm:px-10">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="mb-2 font-display text-lg font-semibold">{f.title}</h2>
            <p className="text-muted">{f.text}</p>
          </div>
        ))}
      </section>

      <div className="flex-1" />
      <Footer demo={isDemoCatalog} />
    </div>
  );
}
