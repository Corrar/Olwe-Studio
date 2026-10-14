import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Artwork } from "@/components/artwork";
import { Footer } from "@/components/footer";
import { Icon, type IconName } from "@/components/icons";
import { Logo } from "@/components/logo";
import { MAX_PROFILES } from "@/lib/avatars";
import { forViewer, type Viewer } from "@/lib/ratings";
import { getSessionUserId } from "@/lib/session";
import { getTopTrending, isDemoCatalog } from "@/lib/tmdb";
import type { Title } from "@/lib/types";

export const metadata: Metadata = { title: { absolute: "Olwe · Filmes grátis, ou sem anúncios no Premium" } };

// Visitante sem conta: vê só o que um perfil adulto padrão veria (até 16 anos; 18+ nunca aparece).
const VISITOR: Viewer = { maxRating: 16, isKids: false, name: "" };

/** Em alta hoje, já filtrado para o visitante: filmes para o Top 10 e filmes e séries alternados no mural. */
async function trending() {
  const [movies, shows] = await Promise.all([getTopTrending("movie"), getTopTrending("tv")]);
  const [allowedMovies, allowedShows] = await Promise.all([forViewer(movies, VISITOR), forViewer(shows, VISITOR)]);
  const mixed = Array.from({ length: Math.max(allowedMovies.length, allowedShows.length) }, (_, i) => [allowedMovies[i], allowedShows[i]]);
  return { top: allowedMovies.slice(0, 10), wall: mixed.flat().filter((t): t is Title => !!t) };
}

const PROMPT = "Pronto para assistir? Informe seu e-mail para criar sua conta.";

const FEATURES: { icon: IconName; title: string; text: string; tags?: { icon: IconName; label: string }[]; span: string }[] = [
  {
    icon: "sparkles",
    title: "Grátis, ou sem anúncios",
    text: "No Olwe Grátis, só um anúncio curto antes do filme e nenhum no meio da história. No Premium, nenhum anúncio. Perfil infantil sempre sem anúncios.",
    span: "lg:col-span-3",
  },
  {
    icon: "film",
    title: "Filmes completos grátis em HD",
    text: "Clássicos restaurados de acervos com licença aberta, como o Internet Archive e o Wikimedia Commons. Tudo de fontes legais, do começo ao fim.",
    tags: [
      { icon: "check", label: "Domínio público" },
      { icon: "check", label: "Licenças abertas" },
    ],
    span: "lg:col-span-3",
  },
  {
    icon: "users",
    title: "Perfis para toda a família",
    text: `Até ${MAX_PROFILES} perfis, cada um com sua lista. Controle parental pela classificação indicativa e espaço infantil.`,
    tags: [{ icon: "lock", label: "Bloqueio com PIN" }],
    span: "lg:col-span-2",
  },
  {
    icon: "clock",
    title: "Continue de onde parou",
    text: "O Olwe guarda o ponto em que você parou em cada filme. Volte quando quiser e siga do mesmo minuto.",
    span: "lg:col-span-2",
  },
  {
    icon: "monitor",
    title: "Assista em qualquer tela",
    text: "O Olwe se ajusta à tela, ao toque e ao controle remoto.",
    tags: [
      { icon: "smartphone", label: "Celular" },
      { icon: "smartphone", label: "Tablet" },
      { icon: "monitor", label: "Computador" },
      { icon: "tv", label: "TV" },
    ],
    span: "sm:col-span-2 lg:col-span-2",
  },
];

const FAQ = [
  {
    q: "O que é o Olwe?",
    a: "O Olwe é um serviço de streaming. Você assiste a filmes completos e grátis de acervos com licença aberta e descobre o que está em alta no cinema e na TV, com sinopse, elenco e trailer.",
  },
  {
    q: "Quanto custa o Olwe?",
    a: "Criar a conta e assistir é grátis: o Olwe Grátis se mantém com um anúncio curto antes dos filmes. Quem preferir sem anúncio nenhum assina o Olwe Premium, mensal no cartão ou 30 dias no Pix, e cancela quando quiser. Perfis infantis nunca veem anúncios.",
  },
  {
    q: "Onde posso assistir?",
    a: "Em qualquer navegador atual: no celular, no tablet, no computador e na TV. Entre com a sua conta e continue de onde parou. No celular e no tablet, dá para adicionar o Olwe à tela inicial e abrir como um app.",
  },
  {
    q: "O Olwe é seguro para crianças?",
    a: "Sim. Cada perfil tem um limite de classificação indicativa, e os perfis infantis só mostram títulos adequados para crianças. Conteúdo adulto nunca aparece. Você pode bloquear perfis com um PIN de 4 dígitos, e mudar limites ou excluir perfis pede a senha da conta.",
  },
  {
    q: "O que significa “Só sinopse e trailer”?",
    a: "Os títulos em alta no cinema e na TV pertencem a outros serviços, e o Olwe não os exibe na íntegra. Neles você encontra a sinopse, o elenco, o trailer e onde assistir. Os títulos marcados como filme completo vêm de fontes legais e abertas e passam inteiros, de graça.",
  },
];

// Mural do topo: 8 colunas (4 no celular, 6 no tablet) de 5 pôsteres; telas largas deitadas dispensam a 5ª fileira.
const WALL_COLUMNS = ["", "", "", "", "max-sm:hidden", "max-sm:hidden", "max-lg:hidden", "max-lg:hidden"];
const WALL_ROWS = 5;

function PosterWall({ titles }: { titles: Title[] }) {
  // Sem títulos (falha na consulta), o mural fica só com os degradês.
  const tiles = titles.length > 0 ? titles : Array.from({ length: 12 }, (_, i) => ({ id: String(i), title: "", poster: null, backdrop: null }));
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-1/2 w-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-12 sm:w-[135%]">
        <div className="flex animate-ken-burns gap-2 opacity-60 sm:gap-4">
          {WALL_COLUMNS.map((visibility, col) => (
            <div key={col} className={`flex min-w-0 flex-1 flex-col gap-2 sm:gap-4 ${col % 2 ? "-translate-y-[9%]" : ""} ${visibility}`}>
              {Array.from({ length: WALL_ROWS }, (_, row) => {
                const t = tiles[(col * WALL_ROWS + row) % tiles.length];
                return (
                  <div
                    key={row}
                    className={`relative aspect-[2/3] overflow-hidden rounded-md bg-surface ring-1 ring-white/5 sm:rounded-lg ${row === WALL_ROWS - 1 ? "lg:landscape:hidden" : ""}`}
                  >
                    <Artwork title={t} variant="poster" sizes="(min-width: 1024px) 14vw, (min-width: 640px) 20vw, 34vw" />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {/* Escurece o mural: mais forte no alto (cabeçalho) e embaixo (passagem para a página). */}
      <div className="absolute inset-0 bg-ink/45" />
      <div className="absolute inset-0 bg-linear-to-b from-ink/90 via-ink/30 to-ink" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--ink)_100%)]" />
    </div>
  );
}

/** Campo de e-mail que leva ao cadastro já preenchido (/signup?email=…). */
function EmailCapture({ id }: { id: string }) {
  return (
    <Form action="/signup" className="mx-auto flex w-full max-w-xl flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <input
          id={id}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          placeholder=" "
          className="peer h-14 w-full rounded-xl border border-white/25 bg-ink/60 px-4 pt-4 text-base text-text outline-none backdrop-blur-sm transition-[border-color,box-shadow] duration-200 hover:border-white/45 focus:border-amber focus:ring-3 focus:ring-amber/25"
        />
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-4 top-2 text-xs text-text/70 transition-all duration-200 ease-out-expo peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs"
        >
          E-mail
        </label>
      </div>
      <button
        type="submit"
        className="bg-brand group inline-flex h-14 shrink-0 items-center justify-center gap-1.5 rounded-xl px-7 text-lg font-semibold text-ink shadow-lg shadow-ember/30 transition hover:brightness-110 active:scale-[0.98]"
      >
        Vamos lá
        <Icon name="chevron-right" size={22} className="transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5" />
      </button>
    </Form>
  );
}

export default async function LandingPage() {
  if (await getSessionUserId()) redirect("/profiles");
  const { top, wall } = await trending();

  return (
    <div className="flex min-h-svh flex-col">
      <section className="relative isolate flex min-h-svh flex-col overflow-hidden">
        <PosterWall titles={wall} />

        <header className="pt-safe relative z-10">
          <div className="gutter mx-auto flex h-16 max-w-7xl items-center justify-between sm:h-20">
            <Logo size={32} />
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-full bg-white/10 px-5 text-sm font-semibold ring-1 ring-inset ring-white/15 backdrop-blur-md transition-colors hover:bg-white/20"
            >
              Entrar
            </Link>
          </div>
        </header>

        <div className="gutter relative z-10 flex flex-1 flex-col items-center justify-center pb-24 pt-10 text-center sm:pb-32">
          <p className="inline-flex animate-fade-up items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset ring-white/15 backdrop-blur-md">
            <Icon name="sparkles" size={16} className="text-amber" />
            Grátis, ou sem anúncios no Premium
          </p>
          <h1
            className="mt-6 max-w-4xl animate-fade-up text-balance font-display text-4xl font-bold leading-[1.05] tracking-tight [animation-delay:80ms] sm:text-6xl lg:text-7xl"
          >
            Histórias sem <span className="text-gradient">interrupção</span>.
          </h1>
          <p className="mt-5 max-w-2xl animate-fade-up text-pretty text-lg text-text/85 [animation-delay:160ms] sm:text-xl">
            Filmes completos grátis em HD, o que está em alta no cinema e na TV e perfis para toda a família.
          </p>
          <div className="mt-9 w-full animate-fade-up [animation-delay:240ms]">
            <p className="mb-4 text-pretty text-base text-text/90 sm:text-lg">{PROMPT}</p>
            <EmailCapture id="email-topo" />
          </div>
        </div>
      </section>

      {top.length > 0 && (
        <section aria-labelledby="em-alta" className="reveal relative z-10 -mt-12 sm:-mt-16">
          <div className="gutter mx-auto max-w-7xl">
            <h2 id="em-alta" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Em alta hoje
            </h2>
            <p className="mt-1 text-muted">Os filmes mais vistos do dia. Entre para ver o trailer e a sinopse de cada um.</p>
          </div>
          <ol
            aria-labelledby="em-alta"
            className="no-scrollbar gutter mx-auto mt-5 flex max-w-7xl snap-x snap-mandatory scroll-px-[var(--gutter)] gap-3 overflow-x-auto pb-4 lg:grid lg:grid-cols-5 lg:gap-x-4 lg:gap-y-8 lg:overflow-visible"
          >
            {top.map((t, i) => (
              // O número fica fora da largura do pôster (pl-*) e avança sobre o canto: todos os pôsteres do mesmo tamanho.
              <li key={t.id} className="group relative flex shrink-0 snap-start pl-9 sm:pl-11 lg:pl-12">
                <Link
                  href="/signup"
                  aria-label={`${t.title}: crie sua conta para assistir`}
                  className="card-w relative aspect-[2/3] overflow-hidden rounded-lg bg-surface shadow-xl shadow-black/50 ring-1 ring-white/10 transition-transform duration-500 ease-out-expo pointer-fine:group-hover:-translate-y-1 lg:w-full lg:shrink"
                >
                  <Artwork title={t} variant="poster" sizes="(min-width: 1024px) 15vw, (min-width: 640px) 9.5rem, 7.25rem" />
                </Link>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-3 left-0 select-none font-display text-[5.5rem] font-extrabold leading-none tracking-tighter text-ink drop-shadow-[0_0.25rem_0.75rem_rgb(0_0_0/0.6)] [-webkit-text-stroke:2px_var(--muted)] transition-[-webkit-text-stroke-color] duration-300 group-focus-within:[-webkit-text-stroke-color:var(--amber)] group-hover:[-webkit-text-stroke-color:var(--amber)] sm:text-[6.5rem] lg:text-[7rem]"
                >
                  {i + 1}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="motivos" className="gutter mx-auto w-full max-w-7xl pt-16 sm:pt-24">
        <h2 id="motivos" className="reveal font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Mais motivos para assistir no Olwe
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {FEATURES.map((f) => (
            <li
              key={f.title}
              className={`reveal group relative overflow-hidden rounded-3xl border border-line bg-linear-to-br from-surface-2 via-surface to-ink p-6 transition-colors duration-500 hover:border-ember/40 sm:p-8 ${f.span}`}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-ember/15 opacity-50 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
              />
              <span className="bg-brand relative flex size-12 items-center justify-center rounded-2xl text-ink shadow-lg shadow-ember/25 transition-transform duration-500 ease-out-expo pointer-fine:group-hover:-rotate-6 pointer-fine:group-hover:scale-110">
                <Icon name={f.icon} size={24} />
              </span>
              <h3 className="relative mt-5 font-display text-xl font-semibold">{f.title}</h3>
              <p className="relative mt-2 text-pretty text-muted">{f.text}</p>
              {f.tags && (
                <ul className="relative mt-5 flex flex-wrap gap-2">
                  {f.tags.map((tag) => (
                    <li key={tag.label} className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-sm ring-1 ring-inset ring-white/10">
                      <Icon name={tag.icon} size={16} className="text-amber" />
                      {tag.label}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="perguntas" className="gutter mx-auto w-full max-w-4xl pt-16 sm:pt-24">
        <h2 id="perguntas" className="reveal text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Perguntas frequentes
        </h2>
        <div className="mt-8 space-y-2">
          {FAQ.map(({ q, a }) => (
            // Abre e fecha com a altura animada onde o navegador sabe animar ::details-content; um aberto por vez.
            <details
              key={q}
              name="perguntas"
              className="reveal group rounded-2xl bg-surface ring-1 ring-inset ring-line transition-colors duration-300 [interpolate-size:allow-keywords] open:bg-surface-2 open:ring-amber/30 details-content:h-0 details-content:overflow-clip details-content:transition-[height,content-visibility] details-content:duration-300 details-content:ease-out-expo details-content:[transition-behavior:allow-discrete] open:details-content:h-auto"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-5 text-left font-display text-lg font-semibold transition-colors hover:text-amber sm:px-7 sm:text-xl [&::-webkit-details-marker]:hidden">
                {q}
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] transition-transform duration-300 ease-out-expo group-open:rotate-180">
                  <Icon name="chevron-down" size={20} />
                </span>
              </summary>
              <p className="px-5 pb-6 text-pretty leading-relaxed text-muted sm:px-7">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-label="Criar conta" className="reveal gutter mx-auto w-full max-w-3xl pt-16 text-center sm:pt-24">
        <p className="mb-4 text-pretty text-base text-text/90 sm:text-lg">{PROMPT}</p>
        <EmailCapture id="email-fim" />
      </section>

      <div className="flex-1" />
      <Footer demo={isDemoCatalog} />
    </div>
  );
}
