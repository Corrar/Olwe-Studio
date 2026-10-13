import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fallbackGradient } from "@/components/artwork";
import { Player } from "@/components/player";
import { requireProfile } from "@/lib/dal";
import { getProgress } from "@/lib/library";
import { getTitle } from "@/lib/tmdb";
import type { MediaType } from "@/lib/types";

export const metadata: Metadata = { title: "Assistindo" };

export default async function WatchPage({ params }: PageProps<"/watch/[type]/[id]">) {
  const profile = await requireProfile();
  const { type, id } = await params;
  const tmdbId = Number(id);
  if ((type !== "movie" && type !== "tv") || !Number.isInteger(tmdbId)) notFound();
  const title = await getTitle(type as MediaType, tmdbId);
  if (!title) notFound();

  const progress = await getProgress(profile.id, title.type, title.id);
  const startAt = progress && progress.duration && progress.position < progress.duration * 0.95 ? progress.position : 0;

  // Prioridade: vídeo próprio (DEMO_VIDEO_URL) > trailer do TMDB.
  const demoUrl = process.env.DEMO_VIDEO_URL;
  const source = demoUrl
    ? ({ kind: "file", url: demoUrl } as const)
    : title.trailerKey
      ? ({ kind: "youtube", key: title.trailerKey } as const)
      : null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <Link
        href={`/title/${title.type}/${title.id}`}
        className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm backdrop-blur hover:bg-black/80"
      >
        ← <span className="max-w-[50vw] truncate">{title.title}</span>
      </Link>
      {source ? (
        <Player source={source} mediaType={title.type} tmdbId={title.id} startAt={startAt} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: fallbackGradient(title.id) }}>
          <div className="absolute inset-0 bg-black/60" />
          <p className="relative font-display text-3xl font-semibold">{title.title}</p>
          <p className="relative max-w-md text-text/80">
            Nenhum vídeo disponível para este título ainda. Configure <code className="text-amber">DEMO_VIDEO_URL</code> ou use
            um título com trailer no TMDB.
          </p>
        </div>
      )}
    </div>
  );
}
