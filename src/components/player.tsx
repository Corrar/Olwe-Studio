"use client";

import { useEffect, useRef } from "react";
import type { MediaType } from "@/lib/types";

type Source = { kind: "youtube"; key: string } | { kind: "file"; url: string };

function saveProgress(mediaType: MediaType, tmdbId: number, position: number, duration: number) {
  if (!Number.isFinite(position) || position <= 0) return;
  const body = JSON.stringify({ mediaType, tmdbId, position, duration: Number.isFinite(duration) ? duration : 0 });
  // sendBeacon sobrevive ao fechamento da aba; fetch é o fallback.
  if (!navigator.sendBeacon?.("/api/progress", new Blob([body], { type: "application/json" }))) {
    fetch("/api/progress", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYouTubeApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
}

export function Player({
  source,
  mediaType,
  tmdbId,
  startAt,
}: {
  source: Source;
  mediaType: MediaType;
  tmdbId: number;
  startAt: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytRef = useRef<HTMLDivElement>(null);

  // Vídeo próprio (HTML5)
  useEffect(() => {
    if (source.kind !== "file") return;
    const video = videoRef.current;
    if (!video) return;
    const save = () => saveProgress(mediaType, tmdbId, video.currentTime, video.duration);
    const onLoaded = () => {
      if (startAt > 0 && startAt < video.duration - 5) video.currentTime = startAt;
    };
    const interval = setInterval(() => !video.paused && save(), 10_000);
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("pause", save);
    video.addEventListener("ended", save);
    window.addEventListener("pagehide", save);
    return () => {
      save();
      clearInterval(interval);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("pause", save);
      video.removeEventListener("ended", save);
      window.removeEventListener("pagehide", save);
    };
  }, [source, mediaType, tmdbId, startAt]);

  // Trailer (YouTube IFrame API)
  useEffect(() => {
    if (source.kind !== "youtube" || !ytRef.current) return;
    let player: any;
    let interval: ReturnType<typeof setInterval>;
    let cancelled = false;
    const save = () => {
      if (player?.getCurrentTime) saveProgress(mediaType, tmdbId, player.getCurrentTime(), player.getDuration());
    };

    loadYouTubeApi().then((YT) => {
      if (cancelled || !ytRef.current) return;
      player = new YT.Player(ytRef.current, {
        host: "https://www.youtube-nocookie.com",
        videoId: source.key,
        width: "100%",
        height: "100%",
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1, start: Math.floor(startAt), hl: "pt-BR", cc_lang_pref: "pt" },
        events: {
          onStateChange: (e: any) => {
            if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) save();
          },
        },
      });
      interval = setInterval(() => player?.getPlayerState?.() === YT.PlayerState.PLAYING && save(), 10_000);
    });
    window.addEventListener("pagehide", save);

    return () => {
      cancelled = true;
      save();
      clearInterval(interval);
      window.removeEventListener("pagehide", save);
      player?.destroy?.();
    };
  }, [source, mediaType, tmdbId, startAt]);

  if (source.kind === "file") {
    return <video ref={videoRef} src={source.url} controls autoPlay playsInline className="h-full w-full bg-black" />;
  }
  return (
    <div className="h-full w-full bg-black">
      <div ref={ytRef} className="h-full w-full" />
    </div>
  );
}
