import type { Metadata } from "next";
import { HeroSection } from "@/components/hero-section";
import { Row } from "@/components/row";
import { TitleCard } from "@/components/title-card";
import { TitleRow } from "@/components/title-row";
import { requireProfile } from "@/lib/dal";
import { getContinueWatching, getWatchlist } from "@/lib/library";
import { ARCHIVE_SHELVES, getArchiveShelf, KIDS_SHELF } from "@/lib/archive";
import { getTitlesByRef } from "@/lib/catalog";
import { getByGenre, getList, getTrending } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Início" };

export default async function BrowsePage() {
  const profile = await requireProfile();

  if (profile.isKids) {
    const [animMovies, familyMovies, kidsTv, cartoons] = await Promise.all([
      getByGenre("movie", [16]),
      getByGenre("movie", [10751]),
      getByGenre("tv", [10762, 16]),
      getArchiveShelf(KIDS_SHELF),
    ]);
    return (
      <>
        <HeroSection items={animMovies} />
        <div className="-mt-10 relative space-y-10">
          <TitleRow title="Desenhos completos e grátis" items={cartoons.items} href="/free" />
          <TitleRow title="Animações" items={animMovies} />
          <TitleRow title="Séries para crianças" items={kidsTv} />
          <TitleRow title="Para ver em família" items={familyMovies} />
        </div>
      </>
    );
  }

  const [freeMovies, trending, popularMovies, popularTv, topMovies, topTv, nowPlaying, continueRefs, listRefs] = await Promise.all([
    getArchiveShelf(ARCHIVE_SHELVES[0]),
    getTrending(),
    getList("movie", "popular"),
    getList("tv", "popular"),
    getList("movie", "top_rated"),
    getList("tv", "top_rated"),
    getList("movie", "now_playing"),
    getContinueWatching(profile.id),
    getWatchlist(profile.id),
  ]);
  const [continueTitles, myList] = await Promise.all([getTitlesByRef(continueRefs), getTitlesByRef(listRefs.slice(0, 20))]);

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
        <TitleRow title="Filmes completos e grátis" items={freeMovies.items} href="/free" />
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
