import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fallbackGradient } from "@/components/artwork";
import { Player } from "@/components/player";
import { getTitle } from "@/lib/catalog";
import { requireProfile } from "@/lib/dal";
import { getProgress } from "@/lib/library";
import { isFullMovie, isMediaType } from "@/lib/types";

export const metadata: Metadata = { title: "Assistindo" };

export default async function WatchPage({ params }: PageProps<"/watch/[type]/[id]">) {
  const profile = await requireProfile();
  const { type, id } = await params;
  if (!isMediaType(type)) notFound();
  const title = await getTitle(type, decodeURIComponent(id));
  if (!title) notFound();

  const full = isFullMovie(title);
  const progress = full ? await getProgress(profile.id, title.type, title.id) : null;
  const startAt = progress && progress.duration && progress.position < progress.duration * 0.95 ? progress.position : 0;
  const detailsHref = `/title/${title.type}/${encodeURIComponent(title.id)}`;

  // Filme completo (Commons / Internet Archive) > vídeo próprio (DEMO_VIDEO_URL) > trailer do TMDB.
  const demoUrl = process.env.DEMO_VIDEO_URL;
  const source = full
    ? title.videoSources.length
      ? ({ kind: "files", files: title.videoSources.map(({ src, type }) => ({ src, type })) } as const)
      : null
    : demoUrl
      ? ({ kind: "files", files: [{ src: demoUrl, type: "video/mp4" }] } as const)
      : title.trailerKey
        ? ({ kind: "youtube", key: title.trailerKey } as const)
        : null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="absolute left-4 right-4 top-4 z-10 flex flex-wrap items-center gap-2">
        <Link href={detailsHref} className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm backdrop-blur hover:bg-black/80">
          ← <span className="max-w-[50vw] truncate">{title.title}</span>
        </Link>
        {!full && source && (
          <span className="rounded-full bg-black/60 px-3 py-2 text-xs text-text/80 backdrop-blur">
            Trailer · o filme completo não está disponível no Olwe
          </span>
        )}
      </div>
      {source ? (
        // Só os filmes completos registram progresso ("Continuar assistindo").
        <Player source={source} mediaType={title.type} itemId={title.id} startAt={startAt} trackProgress={full} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: fallbackGradient(title.id) }}>
          <div className="absolute inset-0 bg-black/60" />
          <p className="relative font-display text-3xl font-semibold">{title.title}</p>
          <p className="relative max-w-md text-text/80">
            {full ? "O arquivo de vídeo deste filme não está disponível no momento." : "Este título não tem trailer disponível."}
          </p>
          <Link href={detailsHref} className="relative rounded-full bg-white/10 px-6 py-3 font-semibold hover:bg-white/20">
            Voltar
          </Link>
        </div>
      )}
    </div>
  );
}
