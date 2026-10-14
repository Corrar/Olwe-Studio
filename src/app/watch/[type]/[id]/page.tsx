import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { fallbackGradient } from "@/components/artwork";
import { Icon } from "@/components/icons";
import { Player } from "@/components/player";
import { RatingBadge } from "@/components/rating-badge";
import { getTitle } from "@/lib/catalog";
import { adTagFor } from "@/lib/ads";
import { isPremium } from "@/lib/billing";
import { requireProfile, requireUser } from "@/lib/dal";
import { getProgress } from "@/lib/library";
import { accessFor, viewerOf } from "@/lib/ratings";
import { isFullMovie, isMediaType } from "@/lib/types";

export const metadata: Metadata = { title: "Assistindo" };

export default async function WatchPage({ params }: PageProps<"/watch/[type]/[id]">) {
  const user = await requireUser();
  const profile = await requireProfile();
  const { type, id } = await params;
  if (!isMediaType(type)) notFound();
  const title = await getTitle(type, decodeURIComponent(id));
  if (!title) notFound();

  const access = await accessFor(title, viewerOf(profile));
  if (access.status === "removed") notFound();
  if (access.status !== "allowed") redirect(`/title/${title.type}/${encodeURIComponent(title.id)}`);
  // Exclusivo do Premium: sem assinatura, volta para a página do título (que convida a assinar).
  if (title.premiumOnly && !isPremium(user)) redirect(`/title/${title.type}/${encodeURIComponent(title.id)}`);

  const full = isFullMovie(title);
  const progress = full ? await getProgress(profile.id, title.type, title.id) : null;
  const startAt = progress && progress.duration && progress.position < progress.duration * 0.95 ? progress.position : 0;
  const detailsHref = `/title/${title.type}/${encodeURIComponent(title.id)}`;

  // Filme completo (Commons / Internet Archive) > vídeo próprio (DEMO_VIDEO_URL) > trailer do TMDB.
  const demoUrl = process.env.DEMO_VIDEO_URL;
  // Filme licenciado publicado no YouTube pelo dono dos direitos: toca no player do YouTube.
  const source = full
    ? title.videoSources.length
      ? ({ kind: "files", files: title.videoSources.map(({ src, type, height }) => ({ src, type, height })) } as const)
      : title.youtubeKey
        ? ({ kind: "youtube", key: title.youtubeKey } as const)
        : null
    : demoUrl
      ? ({ kind: "files", files: [{ src: demoUrl, type: "video/mp4", height: null }] } as const)
      : title.trailerKey
        ? ({ kind: "youtube", key: title.trailerKey } as const)
        : null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {source ? (
        // Só os filmes completos registram progresso ("Continuar assistindo").
        <Player
          source={source}
          mediaType={title.type}
          itemId={title.id}
          startAt={startAt}
          trackProgress={full}
          title={title.title}
          rating={access.rating}
          backHref={detailsHref}
          note={full ? undefined : "Trailer · o filme completo não está disponível no Olwe"}
          poster={title.backdrop}
          // Intervalo comercial só nos filmes completos, no Olwe Grátis e fora do perfil infantil.
          adTag={full ? adTagFor(user, profile) : null}
        />
      ) : (
        <div
          className="relative flex h-full flex-col items-center justify-center gap-4 px-6 text-center"
          style={{ background: fallbackGradient(title.id) }}
        >
          <div className="absolute inset-0 bg-black/65" />
          <Link
            href={detailsHref}
            aria-label={`Voltar para ${title.title}`}
            className="gutter absolute left-0 top-0 z-10 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-5"
          >
            <span className="grid size-11 place-items-center rounded-full transition hover:bg-white/15">
              <Icon name="arrow-left" size={26} />
            </span>
          </Link>
          <Icon name={full ? "film" : "alert"} size={44} className="relative animate-fade-in text-amber" />
          <h1 className="relative animate-fade-up font-display text-3xl font-semibold sm:text-4xl">{title.title}</h1>
          <p className="relative flex items-center gap-2 text-sm text-text/80">
            <RatingBadge rating={access.rating} size="sm" />
            {access.rating.descriptors.length > 0 ? access.rating.descriptors.join(", ") : "Classificação indicativa"}
          </p>
          <p className="relative max-w-md text-text/80">
            {full ? "O arquivo de vídeo deste filme não está disponível no momento." : "Este título não tem trailer disponível."}
          </p>
          <Link
            href={detailsHref}
            className="relative mt-2 inline-flex min-h-12 items-center gap-2 rounded-full bg-white/10 px-6 font-semibold ring-1 ring-inset ring-white/15 transition hover:bg-white/20"
          >
            <Icon name="arrow-left" size={18} />
            Voltar
          </Link>
        </div>
      )}
    </div>
  );
}
