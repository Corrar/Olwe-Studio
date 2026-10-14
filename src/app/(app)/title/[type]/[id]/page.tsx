import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Artwork } from "@/components/artwork";
import { AvailabilityBadge, NewBadge } from "@/components/badges";
import { Avatar } from "@/components/avatar";
import { GridSkeleton, Streamed, TitleGrid } from "@/components/catalog-page";
import { EpisodeList, EpisodeListSkeleton } from "@/components/episode-list";
import { Icon } from "@/components/icons";
import { RatingBadge } from "@/components/rating-badge";
import { ShareButton } from "@/components/share-button";
import { SeasonPicker, TitleTabs, type TitleTab } from "@/components/title-tabs";
import { WatchlistButton } from "@/components/watchlist-button";
import { getTitle } from "@/lib/catalog";
import { requireProfile } from "@/lib/dal";
import { limitLabel, type RatingInfo } from "@/lib/classification";
import { getProgress, isInWatchlist } from "@/lib/library";
import { accessFor, forViewer, viewerOf, type Viewer } from "@/lib/ratings";
import { isFullMovie, isMediaType, type CastMember, type Title, type TitleDetails, type WatchProvider, type WatchProviders } from "@/lib/types";

type Props = PageProps<"/title/[type]/[id]">;

// Sem loading.tsx de propósito: ele envolveria a página num Suspense e os notFound() abaixo (título
// inexistente ou 18+) passariam a responder 200 em vez de 404. O que demora chega por streaming
// dentro das abas, depois das checagens de acesso.

async function load(params: Props["params"]) {
  const { type, id } = await params;
  if (!isMediaType(type)) notFound();
  const title = await getTitle(type, decodeURIComponent(id));
  if (!title) notFound();
  return title;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const title = await load(params);
  const access = await accessFor(title, viewerOf(await requireProfile()));
  if (access.status === "removed") notFound();
  if (access.status === "blocked-for-profile") return { title: "Indisponível para este perfil" };
  if (access.status === "unavailable") return { title: "Indisponível no momento" };
  return { title: title.title, description: title.overview.slice(0, 200) };
}

function RatingDetails({ rating, badge }: { rating: RatingInfo; badge?: boolean }) {
  const what = rating.value === 0 ? "Livre para todos os públicos" : `Não recomendado para menores de ${rating.value} anos`;
  const source =
    rating.source === "oficial"
      ? "classificação indicativa oficial"
      : rating.source === "equivalente"
        ? "equivalente à classificação americana"
        : "estimada pelo Olwe";
  return (
    <p className="flex items-center gap-3 text-sm text-text/80 3xl:text-base">
      {badge && <RatingBadge rating={rating} size="lg" />}
      <span>
        {what}
        {rating.descriptors.length > 0 && ` · ${rating.descriptors.join(", ")}`}
        <span className="text-muted"> ({source})</span>
      </span>
    </p>
  );
}

function formatRuntime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

/** Posição do vídeo como no player: "12:34" ou "1:02:03". */
function clock(seconds: number) {
  const s = Math.floor(seconds);
  const mm = String(Math.floor((s % 3600) / 60));
  const ss = String(s % 60).padStart(2, "0");
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mm.padStart(2, "0")}:${ss}` : `${mm}:${ss}`;
}

const longDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const BUTTON =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 py-3 font-semibold transition duration-200 ease-out-expo active:scale-[0.97]";

export default async function TitlePage({ params, searchParams }: Props) {
  const profile = await requireProfile();
  const viewer = viewerOf(profile);
  const title = await load(params);
  const access = await accessFor(title, viewer);
  // Conteúdo 18+ não existe no Olwe; títulos acima do limite do perfil ficam bloqueados, como na Netflix.
  if (access.status === "removed") notFound();
  if (access.status === "blocked-for-profile") {
    return (
      <div className="gutter mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-5 pt-24 text-center">
        <Avatar avatar={profile.avatar} name={profile.name} size={64} />
        <h1 className="font-display text-2xl font-semibold">Indisponível para este perfil</h1>
        <p className="text-muted">
          Este título tem classificação{" "}
          <span className="inline-block align-middle">
            <RatingBadge rating={access.rating} size="sm" />
          </span>{" "}
          e o perfil {profile.name} está configurado
          para {limitLabel(viewer.maxRating).toLowerCase()}
          {viewer.isKids && access.rating.source === "estimada" ? ", e perfis infantis só exibem títulos com classificação oficial" : ""}.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/profiles" className={`bg-brand ${BUTTON} text-ink`}>
            Trocar de perfil
          </Link>
          <Link href="/browse" className={`${BUTTON} bg-white/10 hover:bg-white/20`}>
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }
  if (access.status === "unavailable") {
    return (
      <div className="gutter mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-5 pt-24 text-center">
        <Icon name="clock" size={40} className="text-muted" />
        <h1 className="font-display text-2xl font-semibold">Indisponível no momento</h1>
        <p className="text-muted">
          Não conseguimos confirmar a classificação indicativa deste título agora. Por segurança, ele só é exibido depois
          dessa confirmação. Tente de novo em instantes.
        </p>
        <Link href="/browse" className={`${BUTTON} bg-white/10 hover:bg-white/20`}>
          Voltar ao início
        </Link>
      </div>
    );
  }
  const rating = access.rating;
  const full = isFullMovie(title);
  const [saved, progress, query] = await Promise.all([
    isInWatchlist(profile.id, title.type, title.id),
    getProgress(profile.id, title.type, title.id),
    searchParams,
  ]);
  const resuming = progress && progress.position > 0 && (!progress.duration || progress.position < progress.duration * 0.95);
  // Sem trailer, o vídeo próprio de demonstração (DEMO_VIDEO_URL) faz as vezes dele no player.
  const canPlay = full ? title.videoSources.length > 0 : !!(title.trailerKey || process.env.DEMO_VIDEO_URL);
  const titleHref = `/title/${title.type}/${encodeURIComponent(title.id)}`;
  const watchHref = `/watch/${title.type}/${encodeURIComponent(title.id)}`;

  // Abas: Episódios (séries), Relacionados (quando o TMDB sugere algo) e Detalhes. A primeira é a padrão.
  const tabs: TitleTab[] = [];
  if (title.type === "tv" && title.seasons.length > 0) {
    const requested = Number(Array.isArray(query.season) ? query.season[0] : query.season);
    const season = title.seasons.find((s) => s.number === requested) ?? title.seasons[0];
    tabs.push({
      id: "episodios",
      label: "Episódios",
      content: (
        <SeasonPicker
          seasons={title.seasons}
          current={season.number}
          note={
            <span className="inline-flex items-center gap-1.5">
              <Icon name="info" size={16} />
              Episódios disponíveis só como sinopse
            </span>
          }
        >
          <Streamed key={season.number} fallback={<EpisodeListSkeleton count={Math.min(season.episodeCount, 6) || 6} />}>
            <EpisodeList tvId={title.id} season={season.number} />
          </Streamed>
        </SeasonPicker>
      ),
    });
  }
  if (title.recommendations.length > 0) {
    tabs.push({
      id: "relacionados",
      label: "Relacionados",
      content: (
        <Streamed fallback={<GridSkeleton count={Math.min(title.recommendations.length, 12)} />}>
          <Related items={title.recommendations} viewer={viewer} />
        </Streamed>
      ),
    });
  }
  tabs.push({ id: "detalhes", label: "Detalhes", content: <Details title={title} rating={rating} /> });

  return (
    <article>
      <section aria-labelledby="titulo" className="relative isolate overflow-hidden sm:flex sm:min-h-[min(86svh,64rem)] sm:items-end">
        {/* Fundo: 16:9 no topo do celular; do sm em diante ocupa o destaque inteiro, com zoom lento. */}
        <div aria-hidden="true" className="relative aspect-video w-full overflow-hidden sm:absolute sm:inset-0 sm:-z-10 sm:aspect-auto">
          <div className="absolute inset-0 animate-ken-burns">
            <Artwork title={title} variant="backdrop" priority sizes="100vw" />
          </div>
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/80 to-transparent" />
          <div className="absolute inset-0 hidden bg-gradient-to-r from-ink via-ink/75 to-ink/5 sm:block" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink via-ink/50 to-transparent sm:h-2/5" />
        </div>

        <div className="gutter relative -mt-12 flex animate-fade-up flex-col gap-4 pb-10 sm:mt-0 sm:max-w-[min(50rem,72%)] sm:gap-5 sm:pb-16 sm:pt-28 xl:max-w-[52rem] 3xl:max-w-[60rem]">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber 3xl:text-sm">
            <Icon name={title.type === "tv" ? "tv" : "film"} size={16} />
            {title.type === "tv" ? "Série" : full ? "Filme clássico" : "Filme"}
          </p>
          <h1
            id="titulo"
            className="text-balance font-display text-3xl font-bold leading-[1.1] tracking-tight drop-shadow-[0_2px_12px_rgb(0_0_0/0.5)] sm:text-5xl xl:text-6xl 3xl:text-7xl"
          >
            {title.title}
          </h1>
          {title.tagline && <p className="text-lg italic text-text/80 3xl:text-xl">{title.tagline}</p>}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-text/80 sm:text-base">
            <NewBadge title={title} />
            <AvailabilityBadge title={title} />
            {title.rating > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-amber">
                <Icon name="star" size={15} className="fill-current" />
                <span className="sr-only">Nota</span>
                {title.rating.toFixed(1)}
              </span>
            )}
            {title.year && <span>{title.year}</span>}
            {title.runtime && title.type !== "tv" && <span>{formatRuntime(title.runtime)}</span>}
            {title.type === "tv" && title.seasons.length > 0 && (
              <span>
                {title.seasons.length} {title.seasons.length === 1 ? "temporada" : "temporadas"}
              </span>
            )}
            <RatingBadge rating={rating} />
          </div>
          <RatingDetails rating={rating} />

          <p className="max-w-2xl whitespace-pre-line text-pretty text-text/90 sm:text-lg 3xl:max-w-3xl 3xl:text-xl">
            {title.overview ? (full ? title.overview.slice(0, 900) : title.overview) : "Sinopse indisponível."}
          </p>

          {!full && (
            <p className="max-w-2xl rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-text/80 backdrop-blur 3xl:text-base">
              O Olwe mostra a sinopse e o trailer deste título. O filme completo não está disponível aqui
              {title.providers ? (
                <>
                  ;{" "}
                  <Link href={`${titleHref}?tab=detalhes#onde-assistir`} className="font-semibold text-amber underline-offset-4 hover:underline">
                    veja onde assistir legalmente
                  </Link>
                  .
                </>
              ) : (
                "."
              )}
            </p>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-3">
            {canPlay ? (
              <Link href={watchHref} className={`bg-brand ${BUTTON} w-full text-ink shadow-lg shadow-ember/25 hover:brightness-110 sm:w-auto`}>
                <Icon name="play" size={20} />
                {full ? (resuming ? `Continuar de ${clock(progress.position)}` : "Assistir filme") : "Ver trailer"}
              </Link>
            ) : (
              <p className={`${BUTTON} w-full cursor-default bg-white/5 text-muted ring-1 ring-inset ring-white/10 sm:w-auto`}>
                <Icon name="alert" size={18} />
                {full ? "Vídeo indisponível no momento" : "Trailer indisponível"}
              </p>
            )}
            <WatchlistButton mediaType={title.type} itemId={title.id} initial={saved} />
            <ShareButton title={title.title} path={titleHref} />
          </div>

          {full && resuming && progress.duration > 0 && (
            <div className="flex max-w-sm items-center gap-3 text-sm text-text/80">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                <div className="bg-brand h-full rounded-full" style={{ width: `${Math.min(100, (progress.position / progress.duration) * 100)}%` }} />
              </div>
              Faltam {formatRuntime(Math.max(1, Math.round((progress.duration - progress.position) / 60)))}
            </div>
          )}
        </div>
      </section>

      <TitleTabs tabs={tabs} defaultTab={tabs[0].id} />
    </article>
  );
}

/** Relacionados do TMDB, filtrados para o perfil (classificação e conteúdo proibido). */
async function Related({ items, viewer }: { items: Title[]; viewer: Viewer }) {
  const recommendations = await forViewer(items, viewer);
  if (recommendations.length === 0) {
    return <p className="text-muted">Nenhum título relacionado disponível para este perfil.</p>;
  }
  return <TitleGrid items={recommendations} />;
}

function Details({ title, rating }: { title: TitleDetails; rating: RatingInfo }) {
  const full = isFullMovie(title);
  const episodes = title.seasons.reduce((sum, s) => sum + s.episodeCount, 0);
  const facts: [string, ReactNode][] = [["Classificação indicativa", <RatingDetails key="r" rating={rating} badge />]];
  if (title.genres.length > 0) facts.push(["Gêneros", title.genres.map((g) => g.name).join(", ")]);
  if (title.type === "tv") {
    if (title.seasons.length > 0) {
      facts.push(["Temporadas", `${title.seasons.length} ${title.seasons.length === 1 ? "temporada" : "temporadas"} · ${episodes} episódios`]);
    }
    if (title.runtime) facts.push(["Duração dos episódios", `${title.runtime} min`]);
  } else if (title.runtime) {
    facts.push(["Duração", formatRuntime(title.runtime)]);
  }
  if (title.releaseDate) facts.push([title.type === "tv" ? "Estreia" : "Lançamento", longDate.format(new Date(title.releaseDate))]);
  else if (title.year) facts.push(["Ano", title.year]);
  if (title.originalTitle && title.originalTitle !== title.title) facts.push(["Título original", title.originalTitle]);
  if (title.quality) facts.push(["Qualidade do vídeo", title.quality]);

  return (
    <div className={`grid gap-10 ${full ? "" : "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-14"}`}>
      <div className="min-w-0 space-y-10">
        <dl className="max-w-3xl divide-y divide-line/70 border-y border-line/70">
          {facts.map(([label, value]) => (
            <div key={label} className="grid gap-1 py-3.5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6">
              <dt className="text-sm text-muted 3xl:text-base">{label}</dt>
              <dd className="text-text/90">{value}</dd>
            </div>
          ))}
        </dl>
        {full && <Credits title={title} />}
        {title.cast.length > 0 && <CastStrip cast={title.cast} />}
      </div>
      {!full && <ProvidersSection providers={title.providers} />}
    </div>
  );
}

/** Créditos que as licenças abertas exigem (autoria, licença e fonte). */
function Credits({ title }: { title: TitleDetails }) {
  return (
    <section aria-labelledby="creditos" className="max-w-3xl">
      <h2 id="creditos" className="mb-2 font-display text-lg font-semibold 3xl:text-xl">
        Créditos e licença
      </h2>
      <p className="text-text/90">
        {title.credit && <>Autoria: {title.credit} · </>}
        {title.licenseName &&
          (title.license ? (
            <a href={title.license} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
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
              <a href={title.sourceUrl} target="_blank" rel="noreferrer" className="text-amber underline-offset-4 hover:underline">
                {title.sourceName}
              </a>
            ) : (
              title.sourceName
            )}
          </>
        )}
      </p>
      <p className="mt-2 text-sm text-muted">Filme livre para assistir e compartilhar, tocado a partir do arquivo original da fonte.</p>
    </section>
  );
}

/** Elenco em faixa, como o X-Ray: foto, nome e personagem. */
function CastStrip({ cast }: { cast: CastMember[] }) {
  return (
    <section aria-labelledby="elenco">
      <h2 id="elenco" className="mb-3 font-display text-lg font-semibold 3xl:text-xl">
        Elenco
      </h2>
      <ul
        tabIndex={0}
        aria-labelledby="elenco"
        className="no-scrollbar -mx-[var(--gutter)] flex snap-x scroll-px-[var(--gutter)] gap-3 overflow-x-auto scroll-smooth px-[var(--gutter)] pb-2 lg:mx-0 lg:scroll-px-0 lg:px-0"
      >
        {cast.map((c) => (
          <li key={c.id} className="flex w-60 shrink-0 snap-start items-center gap-3 rounded-xl bg-surface p-2 pr-3 ring-1 ring-inset ring-white/[0.06] 3xl:w-72">
            <div className="relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2 3xl:w-16">
              {c.photo ? (
                <Image src={c.photo} alt="" fill sizes="80px" className="object-cover" />
              ) : (
                <span aria-hidden="true" className="flex h-full items-center justify-center font-display text-xl text-muted">
                  {c.name.slice(0, 1)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-semibold leading-tight 3xl:text-base">{c.name}</p>
              {c.character && <p className="mt-0.5 line-clamp-2 text-xs text-muted 3xl:text-sm">{c.character}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProvidersSection({ providers }: { providers: WatchProviders | null }) {
  const groups: [string, WatchProvider[]][] = providers
    ? [
        ["Grátis", providers.free],
        ["Incluso na assinatura", providers.subscription],
        ["Alugar", providers.rent],
        ["Comprar", providers.buy],
      ]
    : [];
  return (
    <section id="onde-assistir" aria-labelledby="onde-assistir-titulo" className="min-w-0">
      <h2 id="onde-assistir-titulo" className="mb-1 font-display text-lg font-semibold 3xl:text-xl">
        Onde assistir no Brasil
      </h2>
      {!providers ? (
        <p className="text-sm text-muted">Não encontramos este título em serviços de streaming no Brasil agora.</p>
      ) : (
        <>
          <p className="mb-4 text-xs text-muted">Dados de disponibilidade: JustWatch, via TMDB.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {groups
              .filter(([, list]) => list.length > 0)
              .map(([label, list]) => (
                <div key={label} className="rounded-xl border border-line bg-surface p-4">
                  <p className="mb-3 text-sm font-semibold">{label}</p>
                  <ul className="flex flex-wrap gap-2">
                    {list.map((p) => (
                      <li key={p.id} title={p.name}>
                        <a href={providers.link ?? "#"} target="_blank" rel="noreferrer" className="block rounded-lg transition hover:brightness-110">
                          {p.logo ? (
                            <Image src={p.logo} alt={p.name} width={44} height={44} className="size-11 rounded-lg" />
                          ) : (
                            <span className="block rounded-lg bg-surface-2 px-2 py-1 text-xs">{p.name}</span>
                          )}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
          {providers.link && (
            <a href={providers.link} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm text-amber hover:underline">
              Ver links para cada serviço
              <Icon name="chevron-right" size={16} />
            </a>
          )}
        </>
      )}
    </section>
  );
}
