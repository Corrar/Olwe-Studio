import type { Metadata } from "next";
import { RowSkeleton, RowStack, Streamed, StreamedHero, StreamedRow, once } from "@/components/catalog-page";
import { Row } from "@/components/row";
import { TitleCard } from "@/components/title-card";
import { getTitlesByRef } from "@/lib/catalog";
import { requireProfile } from "@/lib/dal";
import { FREE_SHELVES, getFreeShelf, KIDS_SHELVES } from "@/lib/free";
import { getLicensedShelf } from "@/lib/licensed";
import { getContinueWatching, getWatchlist } from "@/lib/library";
import { forViewer, viewerOf } from "@/lib/ratings";
import { getByGenre, getFreeElsewhere, getList, getTopTrending, getTrending } from "@/lib/tmdb";
import type { Title } from "@/lib/types";

export const metadata: Metadata = { title: "Início" };

type ProgressRef = Awaited<ReturnType<typeof getContinueWatching>>[number];

/** "Faltam 42 min" a partir da posição e da duração salvas (em segundos). */
function remainingLabel({ position, duration }: ProgressRef) {
  if (!duration || position >= duration) return undefined;
  const minutes = Math.max(1, Math.ceil((duration - position) / 60));
  if (minutes < 60) return `Faltam ${minutes} min`;
  const rest = minutes % 60;
  return `Faltam ${Math.floor(minutes / 60)} h${rest ? ` ${rest} min` : ""}`;
}

async function ContinueWatching({ title, refs, load }: { title: string; refs: ProgressRef[]; load: () => Promise<Title[]> }) {
  const titles = await load();
  if (titles.length === 0) return null;
  return (
    <Row title={title}>
      {titles.map((t) => {
        const p = refs.find((r) => r.itemId === t.id && r.mediaType === t.type);
        return (
          <TitleCard
            key={`${t.type}-${t.id}`}
            title={t}
            progress={p && p.duration ? p.position / p.duration : 0}
            remainingLabel={p && remainingLabel(p)}
          />
        );
      })}
    </Row>
  );
}

export default async function BrowsePage() {
  const profile = await requireProfile();
  const viewer = viewerOf(profile);
  // Toda fileira passa pelas regras de classificação do perfil (sem 18+, sem títulos acima do limite).
  const allowed = <T extends Parameters<typeof forViewer>[0][number]>(items: Promise<T[]> | T[]) =>
    Promise.resolve(items).then((list) => forViewer(list, viewer));

  if (profile.isKids) {
    const animMovies = once(() => allowed(getByGenre("movie", [16])));
    return (
      <>
        <StreamedHero load={animMovies} />
        <RowStack>
          <StreamedRow title="Filmes no Olwe" href="/free" load={() => allowed(getLicensedShelf())} />
          <StreamedRow
            title="Desenhos completos e grátis"
            href="/free"
            load={() => allowed(Promise.all(KIDS_SHELVES.map((s) => getFreeShelf(s.key, 16))).then((r) => r.flat()))}
          />
          <StreamedRow title="Animações" load={animMovies} />
          <StreamedRow title="Séries para crianças" load={() => allowed(getByGenre("tv", [10762, 16]))} />
          <StreamedRow title="Para ver em família" load={() => allowed(getByGenre("movie", [10751]))} />
        </RowStack>
      </>
    );
  }

  // Progresso e Minha Lista vêm do banco (rápido): sem nada salvo, essas fileiras nem reservam espaço.
  const [continueRefs, listRefs] = await Promise.all([getContinueWatching(profile.id), getWatchlist(profile.id)]);
  const trending = once(() => allowed(getTrending()));

  return (
    <>
      <StreamedHero load={trending} />
      <RowStack>
        {continueRefs.length > 0 && (
          <Streamed fallback={<RowSkeleton />}>
            <ContinueWatching
              title={`Continuar assistindo como ${profile.name}`}
              refs={continueRefs}
              load={() => allowed(getTitlesByRef(continueRefs))}
            />
          </Streamed>
        )}
        <StreamedRow top10 title="Top 10 filmes no Olwe hoje" load={() => allowed(getTopTrending("movie"))} />
        {listRefs.length > 0 && (
          <StreamedRow title="Minha Lista" href="/my-list" load={() => allowed(getTitlesByRef(listRefs.slice(0, 20)))} />
        )}
        <StreamedRow title="Filmes licenciados no Olwe" href="/free" load={() => allowed(getLicensedShelf({ tier: "free" }))} />
        <StreamedRow title="Exclusivos Premium" href="/plans" load={() => allowed(getLicensedShelf({ tier: "premium" }))} />
        <StreamedRow title="Filmes completos e grátis em HD" href="/free" load={() => allowed(getFreeShelf(FREE_SHELVES[0].key, 16))} />
        <StreamedRow title="Em alta na semana" load={trending} />
        <StreamedRow title="Filmes grátis em outros apps" load={() => allowed(getFreeElsewhere("movie"))} />
        <StreamedRow top10 title="Top 10 séries hoje" load={() => allowed(getTopTrending("tv"))} />
        <StreamedRow title="Filmes populares" href="/movies" load={() => allowed(getList("movie", "popular"))} />
        <StreamedRow title="Séries populares" href="/series" load={() => allowed(getList("tv", "popular"))} />
        <StreamedRow title="Séries grátis em outros apps" load={() => allowed(getFreeElsewhere("tv"))} />
        <StreamedRow title="Novidades nos cinemas" load={() => allowed(getList("movie", "now_playing"))} />
        <StreamedRow title="Filmes mais bem avaliados" load={() => allowed(getList("movie", "top_rated"))} />
        <StreamedRow title="Séries mais bem avaliadas" load={() => allowed(getList("tv", "top_rated"))} />
      </RowStack>
    </>
  );
}
