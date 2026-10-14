import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Artwork } from "@/components/artwork";
import { AvailabilityBadge, NewBadge } from "@/components/badges";
import { TitleRow } from "@/components/title-row";
import { WatchlistButton } from "@/components/watchlist-button";
import { getTitle } from "@/lib/catalog";
import { requireProfile } from "@/lib/dal";
import { getProgress, isInWatchlist } from "@/lib/library";
import { isFullMovie, isMediaType, type WatchProvider, type WatchProviders } from "@/lib/types";

type Props = PageProps<"/title/[type]/[id]">;

async function load(params: Props["params"]) {
  const { type, id } = await params;
  if (!isMediaType(type)) notFound();
  const title = await getTitle(type, decodeURIComponent(id));
  if (!title) notFound();
  return title;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const title = await load(params);
  return { title: title.title, description: title.overview.slice(0, 200) };
}

function formatRuntime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

export default async function TitlePage({ params }: Props) {
  const profile = await requireProfile();
  const title = await load(params);
  const full = isFullMovie(title);
  const [saved, progress] = await Promise.all([
    isInWatchlist(profile.id, title.type, title.id),
    getProgress(profile.id, title.type, title.id),
  ]);
  const resuming = progress && progress.position > 0 && (!progress.duration || progress.position < progress.duration * 0.95);
  const canPlay = full ? title.videoSources.length > 0 : !!title.trailerKey;
  const watchHref = `/watch/${title.type}/${encodeURIComponent(title.id)}`;

  return (
    <article>
      <section className="relative min-h-[75vh] w-full overflow-hidden">
        <Artwork title={title} variant="backdrop" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/10" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink to-transparent" />

        <div className="relative flex min-h-[75vh] max-w-3xl flex-col justify-end gap-5 px-4 pb-14 pt-28 sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber">
            {title.type === "tv" ? "Série" : full ? "Filme clássico" : "Filme"}
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-6xl">{title.title}</h1>
          {title.tagline && <p className="text-lg italic text-text/80">{title.tagline}</p>}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            <NewBadge title={title} />
            <AvailabilityBadge title={title} />
            {title.rating > 0 && <span className="font-semibold text-amber">★ {title.rating.toFixed(1)}</span>}
            {title.year && <span>{title.year}</span>}
            {title.runtime && <span>{formatRuntime(title.runtime)}</span>}
            {title.type === "tv" && title.seasons.length > 0 && (
              <span>
                {title.seasons.length} {title.seasons.length === 1 ? "temporada" : "temporadas"}
              </span>
            )}
            {title.certification && <span className="rounded border border-line px-1.5 py-0.5 text-xs">{title.certification}</span>}
          </div>

          <p className="max-w-2xl whitespace-pre-line text-text/90">
            {title.overview ? (full ? title.overview.slice(0, 900) : title.overview) : "Sinopse indisponível."}
          </p>

          {title.genres.length > 0 && <p className="text-sm text-muted">{title.genres.map((g) => g.name).join(" · ")}</p>}

          {!full && (
            <p className="max-w-2xl rounded-xl border border-line bg-black/40 px-4 py-3 text-sm text-text/80 backdrop-blur">
              O Olwe mostra a sinopse e o trailer deste título. O filme completo não está disponível aqui
              {title.providers ? "; veja abaixo onde assistir legalmente." : "."}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {canPlay && (
              <Link
                href={watchHref}
                className="bg-brand rounded-full px-6 py-3 font-semibold text-ink shadow-lg shadow-ember/20 transition hover:brightness-110"
              >
                ▶ {full ? (resuming ? "Continuar filme" : "Assistir filme completo") : "Ver trailer"}
              </Link>
            )}
            {title.providers && (
              <a href="#onde-assistir" className="rounded-full bg-white/10 px-6 py-3 font-semibold backdrop-blur transition hover:bg-white/20">
                Onde assistir
              </a>
            )}
            <WatchlistButton mediaType={title.type} itemId={title.id} initial={saved} />
          </div>
        </div>
      </section>

      <div className="space-y-12">
        {title.providers && <ProvidersSection providers={title.providers} />}

        {full && (
          <section className="px-4 text-sm text-muted sm:px-10">
            <p>
              {title.credit && <>Autoria: {title.credit} · </>}
              {title.licenseName &&
                (title.license ? (
                  <a href={title.license} target="_blank" rel="noreferrer" className="hover:underline">
                    {title.licenseName}
                  </a>
                ) : (
                  title.licenseName
                ))}
              {title.sourceName && (
                <>
                  {" "}
                  · Fonte:{" "}
                  {title.sourceUrl ? (
                    <a href={title.sourceUrl} target="_blank" rel="noreferrer" className="text-amber hover:underline">
                      {title.sourceName}
                    </a>
                  ) : (
                    title.sourceName
                  )}
                </>
              )}
            </p>
          </section>
        )}

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
              {title.cast.map((c) => (
                <li key={c.id} className="w-28 shrink-0 text-center">
                  <div className="relative mx-auto mb-2 h-28 w-28 overflow-hidden rounded-full bg-surface-2">
                    {c.photo ? (
                      <Image src={c.photo} alt="" fill sizes="112px" className="object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center font-display text-2xl text-muted">{c.name.slice(0, 1)}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium leading-tight">{c.name}</p>
                  <p className="text-xs text-muted">{c.character}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <TitleRow title="Quem assistiu também gostou" items={title.recommendations} />
      </div>
    </article>
  );
}

function ProvidersSection({ providers }: { providers: WatchProviders }) {
  const groups: [string, WatchProvider[]][] = [
    ["Grátis", providers.free],
    ["Incluso na assinatura", providers.subscription],
    ["Alugar", providers.rent],
    ["Comprar", providers.buy],
  ];
  return (
    <section id="onde-assistir" className="scroll-mt-20 px-4 sm:px-10">
      <h2 className="mb-1 font-display text-xl font-semibold">Onde assistir no Brasil</h2>
      <p className="mb-4 text-xs text-muted">Dados de disponibilidade: JustWatch, via TMDB.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {groups
          .filter(([, list]) => list.length > 0)
          .map(([label, list]) => (
            <div key={label} className="rounded-xl border border-line bg-surface p-4">
              <p className="mb-3 text-sm font-semibold">{label}</p>
              <ul className="flex flex-wrap gap-2">
                {list.map((p) => (
                  <li key={p.id} title={p.name}>
                    <a href={providers.link ?? "#"} target="_blank" rel="noreferrer" className="block">
                      {p.logo ? (
                        <Image src={p.logo} alt={p.name} width={44} height={44} className="rounded-lg" />
                      ) : (
                        <span className="rounded-lg bg-surface-2 px-2 py-1 text-xs">{p.name}</span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>
      {providers.link && (
        <a href={providers.link} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-amber hover:underline">
          Ver links para cada serviço →
        </a>
      )}
    </section>
  );
}
