"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: { ima?: any };
  }
}

const IMA_SDK = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";
/** Sem resposta da rede de anúncios nesse tempo, o filme começa sem anúncio. */
const LOAD_TIMEOUT_MS = 8000;

let imaPromise: Promise<any> | null = null;
function loadIma(): Promise<any> {
  if (window.google?.ima) return Promise.resolve(window.google.ima);
  imaPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = IMA_SDK;
    s.async = true;
    s.onload = () => (window.google?.ima ? resolve(window.google.ima) : reject(new Error("IMA indisponível")));
    // Bloqueador de anúncios ou sem rede: segue sem anúncio.
    s.onerror = () => {
      imaPromise = null;
      reject(new Error("IMA bloqueado"));
    };
    document.head.appendChild(s);
  });
  return imaPromise;
}

type Phase = "ready" | "loading" | "playing";

/**
 * Intervalo comercial do Olwe Grátis antes do filme (Google IMA, tag VAST). Começa num toque, porque
 * o celular só toca anúncio com som depois de um gesto. Qualquer erro, bloqueio ou demora leva direto
 * ao filme: o anúncio nunca impede de assistir.
 */
export function AdBreak({
  adTag,
  poster,
  backHref,
  title,
  onStarted,
  onDone,
}: {
  adTag: string;
  poster?: string | null;
  backHref: string;
  title: string;
  /** Cada anúncio que começa a passar (impressão, para o painel). */
  onStarted?: () => void;
  onDone: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cleanup = useRef<() => void>(() => {});
  const [phase, setPhase] = useState<Phase>("ready");

  useEffect(() => () => cleanup.current(), []);

  async function start() {
    setPhase("loading");
    let finished = false;
    // Preenchidos depois que o SDK carrega; a limpeza destrói o que já existir.
    const ads: { manager?: any; loader?: any } = {};
    const finish = () => {
      if (finished) return;
      finished = true;
      cleanup.current();
      onDone();
    };
    const timer = setTimeout(finish, LOAD_TIMEOUT_MS);
    const onResize = () => ads.manager?.resize(window.innerWidth, window.innerHeight, window.google?.ima?.ViewMode.NORMAL);
    cleanup.current = () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      try {
        ads.manager?.destroy();
        ads.loader?.destroy();
      } catch {
        // Já destruído.
      }
    };

    let ima: any;
    try {
      ima = await loadIma();
    } catch {
      return finish();
    }
    if (finished || !containerRef.current || !videoRef.current) return;

    const display = new ima.AdDisplayContainer(containerRef.current, videoRef.current);
    display.initialize();
    const loader = new ima.AdsLoader(display);
    ads.loader = loader;
    loader.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, finish);
    loader.addEventListener(ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, (e: any) => {
      if (finished) return;
      const manager = e.getAdsManager(videoRef.current);
      ads.manager = manager;
      manager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, finish);
      manager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, finish);
      manager.addEventListener(ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, finish);
      // O prazo só para quando o anúncio de fato começa: mídia travada também leva ao filme.
      manager.addEventListener(ima.AdEvent.Type.STARTED, () => {
        clearTimeout(timer);
        setPhase("playing");
        onStarted?.();
      });
      try {
        manager.init(window.innerWidth, window.innerHeight, ima.ViewMode.NORMAL);
        manager.start();
        window.addEventListener("resize", onResize);
      } catch {
        finish();
      }
    });

    const request = new ima.AdsRequest();
    request.adTagUrl = adTag;
    request.linearAdSlotWidth = window.innerWidth;
    request.linearAdSlotHeight = window.innerHeight;
    loader.requestAds(request);
  }

  return (
    <div className="relative h-full w-full bg-black">
      <video ref={videoRef} playsInline className="absolute inset-0 size-full object-contain" />
      <div ref={containerRef} className="absolute inset-0" />

      {phase !== "playing" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element -- fundo decorativo atrás do botão.
            <img src={poster} alt="" className="absolute inset-0 size-full object-cover opacity-40" />
          )}
          <div className="absolute inset-0 bg-black/55" />
          <Link
            href={backHref}
            aria-label={`Voltar para ${title}`}
            className="gutter absolute left-0 top-0 z-10 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-5"
          >
            <span className="grid size-11 place-items-center rounded-full transition hover:bg-white/15">
              <Icon name="arrow-left" size={26} />
            </span>
          </Link>
          <h1 className="relative font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
          <button
            type="button"
            onClick={start}
            disabled={phase === "loading"}
            aria-label="Assistir"
            className="bg-brand relative grid size-20 place-items-center rounded-full text-ink shadow-xl shadow-ember/30 transition hover:brightness-110 active:scale-95 disabled:opacity-80"
          >
            {phase === "loading" ? (
              <span aria-hidden="true" className="size-7 animate-spin rounded-full border-[3px] border-current border-t-transparent" />
            ) : (
              <Icon name="play" size={34} />
            )}
          </button>
          <p className="relative max-w-sm text-sm text-text/80">
            Um anúncio curto antes do filme mantém o Olwe Grátis.{" "}
            <Link href="/plans" className="font-semibold text-amber underline-offset-2 hover:underline">
              Assine o Premium
            </Link>{" "}
            e assista sem anúncios.
          </p>
        </div>
      )}
    </div>
  );
}
