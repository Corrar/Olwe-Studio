import type { Metadata } from "next";
import Link from "next/link";
import { Artwork } from "@/components/artwork";
import { PAGE_TOP, SectionTitle, Streamed, StreamedRow } from "@/components/catalog-page";
import { RatingBadge } from "@/components/rating-badge";
import { requireProfile } from "@/lib/dal";
import { genreName } from "@/lib/genres";
import { forViewer, viewerOf } from "@/lib/ratings";
import { getByGenre, getList, getTopTrending, getUpcoming } from "@/lib/tmdb";
import { todayInBrazil, type Title } from "@/lib/types";
import { NewsHeader, UpcomingSkeleton } from "./loading";

export const metadata: Metadata = { title: "Novidades" };

const UPCOMING_LIMIT = 12;
// Infantil: só estreias de animação ou para a família (e ainda passam por forViewer).
const KIDS_GENRES = [16, 10751];

/** Partes da data de estreia ("AAAA-MM-DD"), lidas sem fuso para não virar o dia anterior. */
function releaseParts(date: string) {
  const day = new Date(`${date}T12:00:00Z`);
  const format = (options: Intl.DateTimeFormatOptions) => day.toLocaleDateString("pt-BR", { timeZone: "UTC", ...options });
  const sameYear = date.slice(0, 4) === todayInBrazil().slice(0, 4);
  return {
    day: format({ day: "2-digit" }),
    month: format({ month: "short" }).replace(".", "").toUpperCase(),
    long: format({ day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }) }),
  };
}

function UpcomingItem({ title: t }: { title: Title }) {
  if (!t.releaseDate) return null;
  const date = releaseParts(t.releaseDate);
  const href = `/title/${t.type}/${encodeURIComponent(t.id)}`;
  const genres = t.genreIds.map((id) => genreName(t.type, id)).filter(Boolean).slice(0, 3);
  return (
    <li className="reveal flex gap-3 sm:gap-5">
      {/* Coluna da data, como no "Em breve" dos apps de streaming; a data completa vem no texto. */}
      <div aria-hidden="true" className="w-11 shrink-0 pt-0.5 text-center sm:w-14">
        <span className="block text-xs font-semibold tracking-widest text-muted">{date.month}</span>
        <span className="block font-display text-3xl font-bold leading-none sm:text-4xl">{date.day}</span>
      </div>
      <article className="min-w-0 flex-1">
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden="true"
          className="group relative block aspect-video overflow-hidden rounded-xl bg-surface-2 ring-1 ring-white/5 transition duration-300 hover:ring-amber/60"
        >
          <span className="absolute inset-0 transition duration-500 ease-out-expo group-hover:scale-[1.03]">
            <Artwork title={t} variant="backdrop" sizes="(min-width: 160rem) 22vw, (min-width: 80rem) 30vw, (min-width: 64rem) 45vw, 85vw" />
          </span>
          <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
        </Link>
        <div className="mt-3 flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-display text-lg font-semibold leading-snug sm:text-xl">
            <Link href={href} className="rounded transition hover:text-amber">
              {t.title}
            </Link>
          </h3>
          <RatingBadge rating={t.ageRating} />
        </div>
        <p className="mt-1 text-sm font-semibold text-amber">
          <time dateTime={t.releaseDate}>Chega em {date.long}</time>
        </p>
        {genres.length > 0 && <p className="mt-1 text-xs text-muted">{genres.join(" • ")}</p>}
        <p className="mt-2 line-clamp-3 text-pretty text-sm text-text/80">{t.overview}</p>
      </article>
    </li>
  );
}

async function Upcoming({ load }: { load: () => Promise<Title[]> }) {
  const items = await load();
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="em-breve-titulo" className="gutter">
      <SectionTitle id="em-breve-titulo" icon="calendar">
        Em breve
      </SectionTitle>
      <ol className="grid gap-x-10 gap-y-10 lg:grid-cols-2 xl:grid-cols-3 4xl:grid-cols-4">
        {items.map((t) => (
          <UpcomingItem key={t.id} title={t} />
        ))}
      </ol>
    </section>
  );
}

export default async function NewPage() {
  const profile = await requireProfile();
  const viewer = viewerOf(profile);
  // Toda lista passa pelas regras de classificação do perfil.
  const allowed = (items: Promise<Title[]>) => items.then((list) => forViewer(list, viewer));
  const kids = profile.isKids;

  const upcoming = () =>
    allowed(
      getUpcoming().then((list) => (kids ? list.filter((t) => t.genreIds.some((g) => KIDS_GENRES.includes(g))) : list)),
    ).then((list) => list.slice(0, UPCOMING_LIMIT));

  return (
    <div className={`pb-12 ${PAGE_TOP}`}>
      <NewsHeader kids={kids} />
      <div className="mt-8 space-y-12 sm:mt-10 3xl:space-y-14">
        <div id="em-breve">
          <Streamed fallback={<UpcomingSkeleton />}>
            <Upcoming load={upcoming} />
          </Streamed>
        </div>
        {kids ? (
          <>
            <div id="top-filmes">
              <StreamedRow top10 title="Top 10 filmes para crianças" load={() => allowed(getByGenre("movie", [16, 10751]))} />
            </div>
            <div id="top-series">
              <StreamedRow top10 title="Top 10 séries para crianças" load={() => allowed(getByGenre("tv", [10762, 16]))} />
            </div>
          </>
        ) : (
          <>
            <div id="top-filmes">
              <StreamedRow top10 title="Top 10 filmes hoje" load={() => allowed(getTopTrending("movie"))} />
            </div>
            <div id="top-series">
              <StreamedRow top10 title="Top 10 séries hoje" load={() => allowed(getTopTrending("tv"))} />
            </div>
            <div id="nos-cinemas">
              <StreamedRow title="Lançamentos nos cinemas" load={() => allowed(getList("movie", "now_playing"))} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
