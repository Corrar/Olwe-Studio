import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GridSkeleton, Streamed, TitleGrid } from "@/components/catalog-page";
import { Icon, type IconName } from "@/components/icons";
import { requireProfile } from "@/lib/dal";
import { searchFree } from "@/lib/free";
import { searchLicensed } from "@/lib/licensed";
import { MOVIE_GENRES, TV_GENRES } from "@/lib/genres";
import { forViewer, viewerOf, type Viewer } from "@/lib/ratings";
import { getTopTrending, searchTitles } from "@/lib/tmdb";
import type { Title } from "@/lib/types";
import { SEARCH_PAGE } from "./loading";

const queryOf = (q: string | string[] | undefined) => (typeof q === "string" ? q.trim().slice(0, 100) : "");

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const query = queryOf((await searchParams).q);
  return { title: query ? `Busca: ${query}` : "Busca" };
}

// Os mesmos gêneros do seletor de Filmes e Séries (os que essas páginas filtram com ?genre=<id>).
const EXPLORE = [
  { type: "movie", label: "Filmes", href: "/movies", names: MOVIE_GENRES, ids: [28, 35, 18, 878, 27, 16, 99] },
  { type: "tv", label: "Séries", href: "/series", names: TV_GENRES, ids: [80, 18, 35, 10765, 10759, 99] },
] as const;
// Perfis infantis não recebem atalhos para Terror e Crime (as páginas ainda filtram pela classificação).
const NOT_FOR_KIDS: number[] = [27, 80];

function GenreChips({ kids }: { kids: boolean }) {
  return (
    <div className="space-y-4">
      {EXPLORE.map((group) => (
        <div key={group.type}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
            <Icon name={group.type === "movie" ? "film" : "tv"} size={16} />
            {group.label}
          </h3>
          <ul className="flex flex-wrap gap-2">
            {group.ids
              .filter((id) => !(kids && NOT_FOR_KIDS.includes(id)))
              .map((id) => (
                <li key={id}>
                  <Link
                    href={`${group.href}?genre=${id}`}
                    className="inline-flex min-h-10 items-center rounded-full border border-white/20 bg-white/[0.04] px-4 text-sm font-medium transition duration-200 hover:border-white/60 hover:bg-white/10 active:scale-95"
                  >
                    {group.names[id]}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SectionHeading({ id, icon, children }: { id: string; icon: IconName; children: string }) {
  return (
    <h2 id={id} className="flex items-center gap-2 font-display text-lg font-semibold sm:text-xl">
      <Icon name={icon} size={20} className="text-amber" />
      {children}
    </h2>
  );
}

function Results({ id, icon, heading, note, items }: { id: string; icon: IconName; heading: string; note: string; items: Title[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} className="mb-10 sm:mb-12">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <SectionHeading id={id} icon={icon}>
          {heading}
        </SectionHeading>
        <p className="text-sm text-muted">{note}</p>
      </div>
      <TitleGrid items={items} />
    </section>
  );
}

async function FreeResults({ items }: { items: Promise<Title[]> }) {
  return <Results id="busca-completos" icon="monitor" heading="Filmes completos" note="Assista inteiro aqui no Olwe." items={await items} />;
}

async function TmdbResults({ items }: { items: Promise<Title[]> }) {
  return <Results id="busca-tmdb" icon="film" heading="Filmes e séries" note="Só sinopse e trailer." items={await items} />;
}

/** Só quando as duas fontes voltam vazias. */
async function NoResults({ query, results, kids }: { query: string; results: Promise<Title[]>[]; kids: boolean }) {
  const lists = await Promise.all(results);
  if (lists.some((items) => items.length > 0)) return null;
  return (
    <section aria-labelledby="sem-resultados" className="animate-fade-up max-w-2xl">
      <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-white/[0.06] text-muted">
        <Icon name="search" size={28} />
      </span>
      <h2 id="sem-resultados" className="font-display text-xl font-semibold sm:text-2xl">
        Nenhum resultado para “{query}”
      </h2>
      <ul className="mt-3 space-y-1.5 text-muted">
        {[
          "Confira se o nome está escrito certo.",
          "Tente o título original ou só uma parte dele.",
          "Títulos fora da classificação deste perfil não aparecem.",
        ].map((tip) => (
          <li key={tip} className="flex gap-2">
            <Icon name="check" size={16} className="mt-1 shrink-0 text-amber" />
            {tip}
          </li>
        ))}
      </ul>
      <p className="mb-3 mt-8 font-semibold">Ou explore por gênero</p>
      <GenreChips kids={kids} />
    </section>
  );
}

async function Trending({ viewer }: { viewer: Viewer }) {
  const items = (await forViewer(await getTopTrending("movie"), viewer)).slice(0, 12);
  if (items.length === 0) return <p className="text-muted">Nada em alta para este perfil agora.</p>;
  return <TitleGrid items={items} />;
}

function Searching({ label }: { label: string }) {
  return (
    <div className="mb-10 sm:mb-12">
      <p className="mb-4 flex items-center gap-2 text-sm text-muted">
        <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-amber" />
        {label}
      </p>
      <GridSkeleton count={6} />
    </div>
  );
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const query = queryOf((await searchParams).q);
  const viewer = viewerOf(await requireProfile());

  if (!query) {
    return (
      <div className={SEARCH_PAGE}>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Busque por filmes e séries</h1>
        <p className="mt-1 text-muted">Digite no campo de busca, lá no topo, ou comece por um gênero.</p>
        <section aria-labelledby="explorar" className="mt-8 animate-fade-up">
          <SectionHeading id="explorar" icon="layers">
            Explore por gênero
          </SectionHeading>
          <div className="mt-4">
            <GenreChips kids={viewer.isKids} />
          </div>
        </section>
        <section aria-labelledby="em-alta" className="mt-12">
          <div className="mb-4">
            <SectionHeading id="em-alta" icon="trophy">
              Em alta agora
            </SectionHeading>
          </div>
          <Streamed fallback={<GridSkeleton count={12} />}>
            <Trending viewer={viewer} />
          </Streamed>
        </section>
      </div>
    );
  }

  // Toda lista passa pela classificação do perfil antes de aparecer.
  // Os licenciados do Olwe vêm primeiro, antes dos acervos abertos.
  const free = Promise.all([searchLicensed(query), searchFree(query, { kids: viewer.isKids })]).then(([licensed, open]) =>
    forViewer([...licensed, ...open], viewer),
  );
  const tmdb = searchTitles(query).then((items) => forViewer(items, viewer));

  return (
    <div className={SEARCH_PAGE}>
      <h1 className="mb-8 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        Resultados para <span className="text-gradient">“{query}”</span>
      </h1>
      {/* Cada fonte aparece assim que responde: o TMDB costuma chegar antes dos filmes completos. */}
      <Streamed fallback={<Searching label="Procurando filmes completos…" />}>
        <FreeResults items={free} />
      </Streamed>
      <Streamed fallback={<Searching label="Procurando filmes e séries…" />}>
        <TmdbResults items={tmdb} />
      </Streamed>
      <Suspense>
        <NoResults query={query} results={[free, tmdb]} kids={viewer.isKids} />
      </Suspense>
    </div>
  );
}
