import Image from "next/image";
import { getSeason } from "@/lib/tmdb";
import { todayInBrazil } from "@/lib/types";
import { fallbackGradient } from "./artwork";
import { Icon } from "./icons";

// Imagem 16:9 à esquerda; no celular a sinopse desce para a largura toda, do sm em diante fica ao lado.
const ROW =
  "grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 py-4 [grid-template-areas:'still_info''text_text'] sm:gap-x-6 sm:py-5 sm:[grid-template-areas:'still_info''still_text'] sm:grid-rows-[auto_1fr]";
const STILL = "relative aspect-video w-36 overflow-hidden rounded-md bg-surface-2 [grid-area:still] sm:w-56 sm:rounded-lg lg:w-64 3xl:w-80";
const STILL_SIZES = "(min-width: 2560px) 400px, (min-width: 1920px) 360px, (min-width: 1024px) 256px, (min-width: 640px) 224px, 144px";

const airDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/**
 * Episódios de uma temporada, vindos do TMDB (ou do catálogo de demonstração). Séries do TMDB só têm
 * sinopse e trailer no Olwe: os episódios são informativos, sem link para assistir.
 * Quem chama já conferiu o acesso à série (accessFor).
 */
export async function EpisodeList({ tvId, season }: { tvId: string; season: number }) {
  const episodes = await getSeason(tvId, season);
  if (!episodes) return <Notice>Não conseguimos carregar os episódios desta temporada agora. Tente de novo em instantes.</Notice>;
  if (episodes.length === 0) return <Notice>Os episódios desta temporada ainda não foram divulgados.</Notice>;

  const today = todayInBrazil();
  return (
    <ol className="divide-y divide-line/70">
      {episodes.map((e) => {
        const upcoming = !!e.airDate && e.airDate > today;
        const meta = [e.runtime ? `${e.runtime} min` : null, e.airDate ? airDate.format(new Date(e.airDate)) : null].filter(Boolean);
        return (
          <li key={e.number} className={ROW}>
            <div className={STILL}>
              {e.still ? (
                <Image src={e.still} alt="" fill sizes={STILL_SIZES} className="object-cover" />
              ) : (
                <div aria-hidden="true" className="absolute inset-0 grid place-items-center" style={{ background: fallbackGradient(`${tvId}-${season}-${e.number}`) }}>
                  <span className="font-display text-3xl font-bold text-white/85 drop-shadow sm:text-4xl">{e.number}</span>
                </div>
              )}
            </div>
            <div className="min-w-0 self-center [grid-area:info] sm:self-end">
              <h3 className="font-display font-semibold leading-snug sm:text-lg 3xl:text-xl">
                <span aria-hidden="true">E{e.number} · </span>
                <span className="sr-only">Episódio {e.number}: </span>
                {e.name}
              </h3>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                {upcoming && (
                  <span className="rounded-[0.3125rem] bg-amber/15 px-1.5 py-0.5 text-xs font-semibold text-amber">Em breve</span>
                )}
                {meta.join(" · ")}
              </p>
            </div>
            {e.overview && <p className="line-clamp-2 text-sm text-text/80 [grid-area:text] sm:mt-2 sm:text-[0.9375rem] 3xl:text-base">{e.overview}</p>}
          </li>
        );
      })}
    </ol>
  );
}

export function EpisodeListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ol aria-hidden="true" className="divide-y divide-line/70">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className={ROW}>
          <div className={`${STILL} skeleton`} />
          <div className="space-y-2 self-center [grid-area:info] sm:self-end">
            <div className="skeleton h-4 w-3/5 rounded sm:h-5" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
          <div className="space-y-2 [grid-area:text] sm:mt-2">
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-4/5 rounded" />
          </div>
        </li>
      ))}
    </ol>
  );
}

function Notice({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-4 text-sm text-text/80">
      <Icon name="info" size={18} className="mt-0.5 shrink-0 text-muted" />
      {children}
    </p>
  );
}
