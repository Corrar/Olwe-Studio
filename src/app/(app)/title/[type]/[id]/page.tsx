import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Artwork } from "@/components/artwork";
import { TitleRow } from "@/components/title-row";
import { WatchlistButton } from "@/components/watchlist-button";
import { requireProfile } from "@/lib/dal";
import { getProgress, isInWatchlist } from "@/lib/library";
import { getTitle, imageUrl } from "@/lib/tmdb";
import type { MediaType } from "@/lib/types";

type Props = PageProps<"/title/[type]/[id]">;

async function load(params: Props["params"]) {
  const { type, id } = await params;
  const tmdbId = Number(id);
  if ((type !== "movie" && type !== "tv") || !Number.isInteger(tmdbId)) notFound();
  const title = await getTitle(type as MediaType, tmdbId);
  if (!title) notFound();
  return title;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const title = await load(params);
  return { title: title.title, description: title.overview };
}

function formatRuntime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

export default async function TitlePage({ params }: Props) {
  const profile = await requireProfile();
  const title = await load(params);
  const [saved, progress] = await Promise.all([
    isInWatchlist(profile.id, title.type, title.id),
    getProgress(profile.id, title.type, title.id),
  ]);
  const resuming = progress && progress.position > 0 && (!progress.duration || progress.position < progress.duration * 0.95);

  return (
    <article>
      <section className="relative min-h-[75vh] w-full overflow-hidden">
        <Artwork title={title} variant="backdrop" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/10" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink to-transparent" />

        <div className="relative flex min-h-[75vh] max-w-3xl flex-col justify-end gap-5 px-4 pb-14 pt-28 sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber">{title.type === "movie" ? "Filme" : "Série"}</p>
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-6xl">{title.title}</h1>
          {title.tagline && <p className="text-lg italic text-text/80">{title.tagline}</p>}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            {title.rating > 0 && <span className="font-semibold text-amber">★ {title.rating.toFixed(1)}</span>}
            {title.year && <span>{title.year}</span>}
            {title.runtime && <span>{formatRuntime(title.runtime)}</span>}
            {title.type === "tv" && title.seasons.length > 0 && (
              <span>
                {title.seasons.length} {title.seasons.length === 1 ? "temporada" : "temporadas"}
              </span>
            )}
            {title.certification && <span className="rounded border border-line px-1.5 py-0.5 text-xs">{title.certification}</span>}
            <span className="rounded border border-amber/50 px-1.5 py-0.5 text-xs text-amber">Sem anúncios</span>
          </div>

          <p className="max-w-2xl text-text/90">{title.overview || "Sinopse indisponível."}</p>

          {title.genres.length > 0 && <p className="text-sm text-muted">{title.genres.map((g) => g.name).join(" · ")}</p>}

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/watch/${title.type}/${title.id}`}
              className="bg-brand rounded-full px-6 py-3 font-semibold text-ink shadow-lg shadow-ember/20 transition hover:brightness-110"
            >
              ▶ {resuming ? "Continuar" : "Assistir"}
            </Link>
            <WatchlistButton mediaType={title.type} tmdbId={title.id} initial={saved} />
          </div>
        </div>
      </section>

      <div className="space-y-12">
        {title.type === "tv" && title.seasons.length > 0 && (
          <section className="px-4 sm:px-10">
            <h2 className="mb-4 font-display text-xl font-semibold">Temporadas</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {title.seasons.map((s) => (
                <li key={s.number} className="rounded-xl border border-line bg-surface p-4">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-muted">
                    {s.episodeCount} episódios{s.year ? ` · ${s.year}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {title.cast.length > 0 && (
          <section className="px-4 sm:px-10">
            <h2 className="mb-4 font-display text-xl font-semibold">Elenco</h2>
            <ul className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
              {title.cast.map((c) => {
                const photo = imageUrl(c.profilePath, "w185");
                return (
                  <li key={c.id} className="w-28 shrink-0 text-center">
                    <div className="relative mx-auto mb-2 h-28 w-28 overflow-hidden rounded-full bg-surface-2">
                      {photo ? (
                        <Image src={photo} alt="" fill sizes="112px" className="object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center font-display text-2xl text-muted">{c.name.slice(0, 1)}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium leading-tight">{c.name}</p>
                    <p className="text-xs text-muted">{c.character}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <TitleRow title="Quem assistiu também gostou" items={title.recommendations} />
      </div>
    </article>
  );
}
