import type { Metadata } from "next";
import { HeroSection } from "@/components/hero-section";
import { Row } from "@/components/row";
import { TitleCard } from "@/components/title-card";
import { TitleRow } from "@/components/title-row";
import { getTitlesByRef } from "@/lib/catalog";
import { requireProfile } from "@/lib/dal";
import { FREE_SHELVES, getFreeShelf, KIDS_SHELVES } from "@/lib/free";
import { getContinueWatching, getWatchlist } from "@/lib/library";
import { forViewer, viewerOf } from "@/lib/ratings";
import { getByGenre, getList, getTrending } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Início" };

export default async function BrowsePage() {
  const profile = await requireProfile();
  const viewer = viewerOf(profile);
  // Toda fileira passa pelas regras de classificação do perfil (sem 18+, sem títulos acima do limite).
  const allowed = <T extends Parameters<typeof forViewer>[0][number]>(items: Promise<T[]> | T[]) =>
    Promise.resolve(items).then((list) => forViewer(list, viewer));

  if (profile.isKids) {
    const [animMovies, familyMovies, kidsTv, cartoons] = await Promise.all([
      allowed(getByGenre("movie", [16])),
      allowed(getByGenre("movie", [10751])),
      allowed(getByGenre("tv", [10762, 16])),
      allowed(Promise.all(KIDS_SHELVES.map((s) => getFreeShelf(s.key, 16))).then((r) => r.flat())),
    ]);
    return (
      <>
        <HeroSection items={animMovies} />
        <div className="-mt-10 relative space-y-10">
          <TitleRow title="Desenhos completos e grátis" items={cartoons} href="/free" />
          <TitleRow title="Animações" items={animMovies} />
          <TitleRow title="Séries para crianças" items={kidsTv} />
          <TitleRow title="Para ver em família" items={familyMovies} />
        </div>
      </>
    );
  }

  const [continueRefs, listRefs] = await Promise.all([getContinueWatching(profile.id), getWatchlist(profile.id)]);
  const [freeMovies, trending, popularMovies, popularTv, topMovies, topTv, nowPlaying, continueTitles, myList] = await Promise.all([
    allowed(getFreeShelf(FREE_SHELVES[0].key, 16)),
    allowed(getTrending()),
    allowed(getList("movie", "popular")),
    allowed(getList("tv", "popular")),
    allowed(getList("movie", "top_rated")),
    allowed(getList("tv", "top_rated")),
    allowed(getList("movie", "now_playing")),
    allowed(getTitlesByRef(continueRefs)),
    allowed(getTitlesByRef(listRefs.slice(0, 20))),
  ]);

  return (
    <>
      <HeroSection items={trending} />
      <div className="-mt-10 relative space-y-10">
        {continueTitles.length > 0 && (
          <Row title={`Continuar assistindo como ${profile.name}`}>
            {continueTitles.map((t) => {
              const p = continueRefs.find((r) => r.itemId === t.id && r.mediaType === t.type);
              return <TitleCard key={`${t.type}-${t.id}`} title={t} progress={p && p.duration ? p.position / p.duration : 0} />;
            })}
          </Row>
        )}
        <TitleRow title="Minha Lista" items={myList} href="/my-list" />
        <TitleRow title="Filmes completos e grátis em HD" items={freeMovies} href="/free" />
        <TitleRow title="Em alta na semana" items={trending} />
        <TitleRow title="Filmes populares" items={popularMovies} href="/movies" />
        <TitleRow title="Séries populares" items={popularTv} href="/series" />
        <TitleRow title="Novidades nos cinemas" items={nowPlaying} />
        <TitleRow title="Filmes mais bem avaliados" items={topMovies} />
        <TitleRow title="Séries mais bem avaliadas" items={topTv} />
      </div>
    </>
  );
}
