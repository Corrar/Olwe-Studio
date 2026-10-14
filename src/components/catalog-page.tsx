import Link from "next/link";
import { Suspense, ViewTransition, type ReactNode } from "react";
import { requireProfile } from "@/lib/dal";
import { forViewer, viewerOf } from "@/lib/ratings";
import { getByGenre, getList, getTopTrending } from "@/lib/tmdb";
import type { Title } from "@/lib/types";
import { HeroSkeleton } from "./hero";
import { HeroSection } from "./hero-section";
import { Icon, type IconName } from "./icons";
import { TitleCard } from "./title-card";
import { TitleRow } from "./title-row";
import { Top10Row } from "./top10-row";

// Peças das páginas de catálogo (Início, Filmes, Séries, Filmes completos, Minha Lista, Novidades):
// cada fileira chega por streaming com um esqueleto do mesmo tamanho, para a página pintar rápido.

type Load = () => Promise<Title[]>;

/** Espaço do cabeçalho fixo nas páginas sem destaque. */
export const PAGE_TOP = "pt-[calc(6rem+env(safe-area-inset-top))]";

/** Aviso para leitores de tela nos loading.tsx (os esqueletos são decorativos). */
export function LoadingNote() {
  return (
    <p role="status" className="sr-only">
      Carregando…
    </p>
  );
}

/** Carrega uma vez e reaproveita: o destaque e uma fileira podem usar a mesma lista. */
export function once<T>(load: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | undefined;
  return () => (promise ??= load());
}

/** Trecho que chega por streaming: esqueleto enquanto carrega e entrada suave quando chega. */
export function Streamed({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <ViewTransition exit="vt-slide-down" default="none">
          {fallback}
        </ViewTransition>
      }
    >
      <ViewTransition enter="vt-slide-up" default="none">
        {children}
      </ViewTransition>
    </Suspense>
  );
}

async function AsyncHero({ load, heading, compactTop }: { load: Load; heading?: "h1" | "h2"; compactTop?: boolean }) {
  return <HeroSection items={await load()} heading={heading} compactTop={compactTop} />;
}

/** Destaque (5 primeiros da lista) que chega por streaming. */
export function StreamedHero({ load, heading, compactTop }: { load: Load; heading?: "h1" | "h2"; compactTop?: boolean }) {
  return (
    <Streamed fallback={<HeroSkeleton compactTop={compactTop} />}>
      <AsyncHero load={load} heading={heading} compactTop={compactTop} />
    </Streamed>
  );
}

async function AsyncRow({ title, href, load, top10 }: { title: string; href?: string; load: Load; top10?: boolean }) {
  const items = await load();
  return top10 ? <Top10Row title={title} items={items.slice(0, 10)} /> : <TitleRow title={title} items={items} href={href} />;
}

/** Fileira que chega por streaming; lista vazia não aparece. top10 vira a fileira numerada (10 primeiros). */
export function StreamedRow({ title, href, load, top10 }: { title: string; href?: string; load: Load; top10?: boolean }) {
  return (
    <Streamed fallback={<RowSkeleton top10={top10} />}>
      <AsyncRow title={title} href={href} load={load} top10={top10} />
    </Streamed>
  );
}

/** Fileiras logo abaixo do destaque, subindo um pouco sobre o degradê dele. */
export function RowStack({ children }: { children: ReactNode }) {
  return <div className="relative -mt-10 space-y-8 pb-12 sm:space-y-10 3xl:space-y-12">{children}</div>;
}

/** Esqueleto de fileira com as medidas de Row; com label (prateleiras que sempre existem), o nome já aparece. */
export function RowSkeleton({ label, top10 }: { label?: string; top10?: boolean }) {
  return (
    <div aria-hidden="true">
      <div className="gutter mb-1 flex h-6 items-center sm:mb-1.5 sm:h-7">
        {label ? (
          <p className="truncate font-display text-base font-semibold tracking-tight text-muted sm:text-lg lg:text-xl">{label}</p>
        ) : (
          <div className="skeleton h-4 w-44 rounded-md sm:h-5" />
        )}
      </div>
      <div className="gutter flex gap-2 overflow-hidden py-2 sm:gap-3 xl:gap-4">
        {Array.from({ length: 10 }, (_, i) =>
          top10 ? (
            <div key={i} className="flex shrink-0 pl-[calc(var(--card-w)*0.86)]">
              <div className="card-w skeleton aspect-[2/3] rounded-md sm:rounded-lg" />
            </div>
          ) : (
            <div key={i} className="card-w skeleton aspect-[2/3] rounded-md sm:rounded-lg" />
          ),
        )}
      </div>
    </div>
  );
}

// Grade responsiva: colunas da largura dos cartões (pelo menos 3 no celular), esticando para preencher.
const GRID =
  "grid grid-cols-[repeat(auto-fill,minmax(min(var(--card-w),calc((100%_-_1rem)/3)),1fr))] gap-x-2 gap-y-4 sm:gap-x-3 sm:gap-y-6 3xl:gap-x-4";

/** Grade de títulos ("Ver tudo", gêneros, Minha Lista): cada cartão ocupa a coluna inteira. */
export function TitleGrid({ items }: { items: Title[] }) {
  return (
    <ul className={GRID}>
      {items.map((t, i) => (
        <li key={`${t.type}-${t.id}`}>
          <TitleCard title={t} priority={i < 6} fluid />
        </li>
      ))}
    </ul>
  );
}

export function GridSkeleton({ count = 18 }: { count?: number }) {
  return (
    <ul aria-hidden="true" className={GRID}>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="skeleton aspect-[2/3] rounded-md sm:rounded-lg" />
      ))}
    </ul>
  );
}

/** Título de seção com ícone, no mesmo tamanho dos títulos das fileiras. */
export function SectionTitle({ id, icon, children }: { id: string; icon: IconName; children: ReactNode }) {
  return (
    <h2 id={id} className="mb-4 flex items-center gap-2 font-display text-base font-semibold tracking-tight sm:text-lg lg:text-xl">
      <Icon name={icon} size={20} className="text-amber" />
      {children}
    </h2>
  );
}

/** Apresentação de Filmes completos (na página e no loading.tsx dela, com o mesmo tamanho). */
export function FreeIntro() {
  return (
    <p className="gutter flex max-w-4xl gap-2.5 text-sm text-muted">
      <Icon name="sparkles" size={18} className="mt-0.5 shrink-0 text-amber" />
      <span>
        Filmes inteiros, grátis e sem anúncios, só de fontes com licença aberta (domínio público ou Creative Commons): vídeos
        em HD do Wikimedia Commons e clássicos do Internet Archive. Cada card mostra a qualidade do vídeo.
      </span>
    </p>
  );
}

// Gêneros do seletor e das fileiras de Filmes e Séries (ids do TMDB).
const GENRES: Record<"movie" | "tv", [id: number, name: string][]> = {
  movie: [
    [28, "Ação"],
    [35, "Comédia"],
    [18, "Drama"],
    [878, "Ficção científica"],
    [27, "Terror"],
    [16, "Animação"],
    [99, "Documentários"],
  ],
  tv: [
    [80, "Crime"],
    [18, "Drama"],
    [35, "Comédia"],
    [10765, "Ficção científica e fantasia"],
    [10759, "Ação e aventura"],
    [99, "Documentais"],
  ],
};

const PAGES = {
  movie: { title: "Filmes", href: "/movies", top10: "Top 10 filmes hoje" },
  tv: { title: "Séries", href: "/series", top10: "Top 10 séries hoje" },
} as const;

// Telas baixas (celular deitado): o cabeçalho fica acima do destaque em vez de sobre ele.
const CATALOG_HEADER =
  "gutter relative z-10 flex flex-col gap-3 pt-[calc(4.5rem+env(safe-area-inset-top))] sm:absolute sm:inset-x-0 sm:top-0 sm:flex-row sm:items-center sm:gap-6 sm:pt-[calc(5rem+env(safe-area-inset-top))] [@media(max-height:30rem)]:static";

/** Nome da página e seletor de gêneros (chips com ?genre=<id>), sobre o topo do destaque no desktop. */
function CatalogHeader({ type, selected }: { type: "movie" | "tv"; selected?: number | "all" }) {
  const page = PAGES[type];
  const chip = (current: boolean) =>
    `inline-flex min-h-9 items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-medium backdrop-blur-md transition duration-200 ${
      current ? "border-text bg-text text-ink" : "border-white/30 bg-ink/40 text-text/90 hover:border-white/70 hover:bg-white/10"
    }`;
  return (
    <div className={CATALOG_HEADER}>
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">{page.title}</h1>
      <nav aria-label="Gêneros" className="-mx-[var(--gutter)] min-w-0 sm:mx-0 sm:flex-1">
        <ul className="no-scrollbar flex gap-2 overflow-x-auto px-[var(--gutter)] py-1 sm:flex-wrap sm:overflow-visible sm:px-0">
          <li>
            <Link href={page.href} aria-current={selected === "all" ? "page" : undefined} className={chip(selected === "all")}>
              Todos os gêneros
            </Link>
          </li>
          {GENRES[type].map(([id, name]) => (
            <li key={id}>
              <Link href={`${page.href}?genre=${id}`} aria-current={selected === id ? "page" : undefined} className={chip(selected === id)}>
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

const uniqueTitles = (items: Title[]) => [...new Map(items.map((t) => [`${t.type}-${t.id}`, t])).values()];

async function GenreGrid({ load }: { load: Load }) {
  const items = await load();
  if (items.length === 0) return <p className="text-muted">Nenhum título deste gênero está disponível para este perfil agora.</p>;
  return <TitleGrid items={items} />;
}

/** Filmes ou Séries: destaque, seletor de gêneros e fileiras; com ?genre=<id>, a grade daquele gênero. */
export async function CatalogPage({ type, genre }: { type: "movie" | "tv"; genre?: string | string[] }) {
  const viewer = viewerOf(await requireProfile());
  // Toda lista passa pelas regras de classificação do perfil.
  const allowed = (items: Promise<Title[]>) => items.then((list) => forViewer(list, viewer));
  const page = PAGES[type];
  const selected = GENRES[type].find(([id]) => String(id) === genre);

  if (selected) {
    const [id, name] = selected;
    // Duas páginas do gênero, sem repetir títulos; o destaque usa os primeiros da mesma lista.
    const titles = once(() =>
      allowed(Promise.all([getByGenre(type, [id], 1), getByGenre(type, [id], 2)]).then(([a, b]) => uniqueTitles([...a, ...b]))),
    );
    return (
      <>
        <div className="relative">
          <CatalogHeader type={type} selected={id} />
          <StreamedHero load={titles} heading="h2" compactTop />
        </div>
        <section aria-labelledby="genero-selecionado" className="gutter relative -mt-10 pb-12">
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2 id="genero-selecionado" className="font-display text-xl font-semibold sm:text-2xl">
              {name}
            </h2>
            <Link
              href={page.href}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/20 px-3 text-sm text-muted transition hover:border-white/60 hover:text-text"
            >
              <Icon name="x" size={14} />
              Todos os gêneros
            </Link>
          </div>
          <Streamed fallback={<GridSkeleton />}>
            <GenreGrid load={titles} />
          </Streamed>
        </section>
      </>
    );
  }

  const popular = once(() => allowed(getList(type, "popular")));
  return (
    <>
      <div className="relative">
        <CatalogHeader type={type} selected="all" />
        <StreamedHero load={popular} heading="h2" compactTop />
      </div>
      <RowStack>
        <StreamedRow top10 title={page.top10} load={() => allowed(getTopTrending(type))} />
        <StreamedRow title="Populares agora" load={popular} />
        <StreamedRow title="Mais bem avaliados" load={() => allowed(getList(type, "top_rated"))} />
        {GENRES[type].map(([id, name]) => (
          <StreamedRow key={id} title={name} href={`${page.href}?genre=${id}`} load={() => allowed(getByGenre(type, [id]))} />
        ))}
      </RowStack>
    </>
  );
}

/** loading.tsx de Filmes e Séries: mesmo cabeçalho, destaque e fileiras em esqueleto. */
export function CatalogSkeleton({ type }: { type: "movie" | "tv" }) {
  return (
    <>
      <LoadingNote />
      <div className="relative">
        <CatalogHeader type={type} />
        <HeroSkeleton compactTop />
      </div>
      <RowStack>
        <RowSkeleton top10 />
        <RowSkeleton />
        <RowSkeleton />
      </RowStack>
    </>
  );
}
