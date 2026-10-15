"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  type SyntheticEvent,
} from "react";
import type { RatingInfo } from "@/lib/classification";
import { HLS_MIME, type MediaType } from "@/lib/types";
import { AdBreak } from "./ad-break";
import { Icon, type IconName } from "./icons";
import { RatingBadge } from "./rating-badge";
import { sendStats, useWatchStats } from "./watch-stats";

/** Arquivo de vídeo, do melhor para o pior; height vira o rótulo do menu de qualidade ("1080p"). */
export type PlayerFile = { src: string; type: string; height: number | null };
type Source = { kind: "youtube"; key: string } | { kind: "files"; files: readonly PlayerFile[] };

type Info = {
  /** Nome do título, na barra de cima. */
  title: string;
  rating: RatingInfo;
  /** Página do título (botão de voltar). */
  backHref: string;
  /** Aviso curto abaixo do nome, como "Trailer · ...". */
  note?: string;
};

type PlayerProps = Info & {
  source: Source;
  mediaType: MediaType;
  itemId: string;
  startAt: number;
  trackProgress?: boolean;
  /** Imagem mostrada antes do primeiro quadro. */
  poster?: string | null;
  /** Tag VAST do intervalo antes do filme (Olwe Grátis); null ou ausente = sem anúncio. */
  adTag?: string | null;
};

function saveProgress(mediaType: MediaType, itemId: string, position: number, duration: number) {
  if (!Number.isFinite(position) || position <= 0) return;
  const body = JSON.stringify({ mediaType, itemId, position, duration: Number.isFinite(duration) ? duration : 0 });
  // sendBeacon sobrevive ao fechamento da aba; fetch é o fallback.
  if (!navigator.sendBeacon?.("/api/progress", new Blob([body], { type: "application/json" }))) {
    fetch("/api/progress", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  }
}

/** Arquivos próprios (Commons, Internet Archive, DEMO_VIDEO_URL) no player do Olwe; trailers no do YouTube. */
export function Player({ source, poster, adTag, ...props }: PlayerProps) {
  const [adDone, setAdDone] = useState(false);
  // O anúncio só passa antes dos arquivos próprios: no YouTube, quem decide é o dono do vídeo.
  if (source.kind === "files" && adTag && !adDone) {
    return (
      <AdBreak
        adTag={adTag}
        poster={poster}
        backHref={props.backHref}
        title={props.title}
        onStarted={() => sendStats({ kind: "ad", mediaType: props.mediaType, itemId: props.itemId })}
        onDone={() => setAdDone(true)}
      />
    );
  }
  return source.kind === "youtube" ? (
    <YouTubePlayer videoKey={source.key} {...props} />
  ) : (
    <FilePlayer files={source.files} poster={poster} {...props} />
  );
}

const HIDE_MS = 3000;
const DOUBLE_TAP_MS = 300;
const SEEK_STEP = 10;
const VOLUME_STEP = 0.05;
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const VOLUME_KEY = "olwe:volume";

/** "12:34" ou "1:02:03". */
function clock(seconds: number) {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const mm = String(Math.floor((s % 3600) / 60));
  const ss = String(s % 60).padStart(2, "0");
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mm.padStart(2, "0")}:${ss}` : `${mm}:${ss}`;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Estado do <video> lido a cada evento de mídia, para o React (useSyncExternalStore).
type Media = {
  paused: boolean;
  ended: boolean;
  waiting: boolean;
  time: number;
  duration: number;
  buffered: number;
  volume: number;
  muted: boolean;
  rate: number;
  src: string;
};

const IDLE: Media = { paused: true, ended: false, waiting: false, time: 0, duration: 0, buffered: 0, volume: 1, muted: false, rate: 1, src: "" };

const MEDIA_EVENTS = [
  "play", "pause", "playing", "waiting", "canplay", "seeking", "seeked", "timeupdate", "durationchange",
  "loadedmetadata", "progress", "volumechange", "ratechange", "ended", "emptied",
];

function readMedia(v: HTMLVideoElement): Media {
  let buffered = 0;
  for (let i = 0; i < v.buffered.length; i++) {
    if (v.buffered.start(i) <= v.currentTime + 0.5 && v.currentTime <= v.buffered.end(i)) buffered = v.buffered.end(i);
  }
  return {
    paused: v.paused,
    ended: v.ended,
    waiting: !v.paused && (v.seeking || v.readyState < HTMLMediaElement.HAVE_FUTURE_DATA),
    time: v.currentTime,
    duration: Number.isFinite(v.duration) ? v.duration : 0,
    buffered,
    volume: v.volume,
    muted: v.muted,
    rate: v.playbackRate,
    src: v.currentSrc,
  };
}

function createMediaStore() {
  let snapshot = IDLE;
  const listeners = new Set<() => void>();
  return {
    attach(video: HTMLVideoElement) {
      const update = () => {
        const next = readMedia(video);
        if ((Object.keys(next) as (keyof Media)[]).every((k) => next[k] === snapshot[k])) return;
        snapshot = next;
        listeners.forEach((l) => l());
      };
      MEDIA_EVENTS.forEach((e) => video.addEventListener(e, update));
      // O vídeo vem renderizado do servidor: pode já ter carregado (ou começado a tocar) antes daqui.
      update();
      return () => MEDIA_EVENTS.forEach((e) => video.removeEventListener(e, update));
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    get: () => snapshot,
  };
}

const subscribeNothing = () => () => {};
const subscribeFullscreen = (onChange: () => void) => {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
};

type WebkitVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };
type Quality = { src: string; label: string };

// Versões que este navegador toca, sem rótulos repetidos (uma lista por conjunto de arquivos).
const qualityCache = new WeakMap<readonly PlayerFile[], Quality[]>();
function playableQualities(files: readonly PlayerFile[]): Quality[] {
  let list = qualityCache.get(files);
  if (!list) {
    const probe = document.createElement("video");
    const seen = new Set<string>();
    list = files
      .filter((f) => probe.canPlayType(f.type) !== "")
      .map((f) => ({ src: new URL(f.src, document.baseURI).href, label: f.height ? `${f.height}p` : "Original" }))
      .filter((q) => !seen.has(q.label) && !!seen.add(q.label));
    qualityCache.set(files, list);
  }
  return list;
}
const NO_QUALITIES: Quality[] = [];

// HLS (streaming adaptativo, como o do Mux): Safari e iPhone tocam direto; os outros navegadores usam o hls.js.
const isHls = (f: PlayerFile) => f.type.toLowerCase() === HLS_MIME;
const nativeHlsSnapshot = () => document.createElement("video").canPlayType("application/vnd.apple.mpegurl") !== "";

const speedLabel = (rate: number) => (rate === 1 ? "Normal" : `${String(rate).replace(".", ",")}x`);

function FilePlayer({
  files,
  mediaType,
  itemId,
  startAt,
  trackProgress = true,
  poster,
  ...info
}: Omit<PlayerProps, "source"> & { files: readonly PlayerFile[] }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const seekRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLAnchorElement>(null);
  const stats = useWatchStats(mediaType, itemId);

  const [store] = useState(createMediaStore);
  const media = useSyncExternalStore(store.subscribe, store.get, () => IDLE);
  // No iPhone document.fullscreenElement não existe (undefined): o vídeo usa a tela cheia nativa.
  const fullscreen = useSyncExternalStore(subscribeFullscreen, () => !!document.fullscreenElement, () => false);
  const canFullscreen = useSyncExternalStore(
    subscribeNothing,
    () => document.fullscreenEnabled || "webkitEnterFullscreen" in HTMLVideoElement.prototype,
    () => false,
  );
  const canPip = useSyncExternalStore(subscribeNothing, () => document.pictureInPictureEnabled === true, () => false);
  const qualities = useSyncExternalStore(subscribeNothing, () => playableQualities(files), () => NO_QUALITIES);
  const hlsFile = files.find(isHls);
  const nativeHls = useSyncExternalStore(subscribeNothing, nativeHlsSnapshot, () => false);
  // Cada nova tentativa (botão de tentar de novo) recria o hls.js.
  const [hlsAttempt, setHlsAttempt] = useState(0);

  // Com progresso salvo, pergunta antes de tocar (como a Netflix); senão começa sozinho.
  const [prompt, setPrompt] = useState(startAt > 0);
  const [uiVisible, setUiVisible] = useState(true);
  const [overControls, setOverControls] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [menu, setMenu] = useState<"speed" | "quality" | null>(null);
  const [override, setOverride] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [ripple, setRipple] = useState<{ id: number; icon: IconName } | null>(null);
  const [seekFlash, setSeekFlash] = useState<{ id: number; side: "left" | "right"; amount: number } | null>(null);
  const [osd, setOsd] = useState<{ id: number; text: string; icon: IconName } | null>(null);
  const [ratingBug, setRatingBug] = useState(false);

  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const restore = useRef<{ time: number; play: boolean } | null>(null);
  const pointerType = useRef("mouse");
  // Clique que só fecha um menu aberto não pausa o vídeo.
  const closingMenu = useRef(false);
  const lastTap = useRef<{ time: number; side: "left" | "right"; wasVisible: boolean } | null>(null);
  const bugShown = useRef(false);

  // Controles visíveis: depois de mexer, ou sempre que pausado, com menu aberto, arrastando a linha do
  // tempo, com o mouse sobre a barra, no aviso de retomar, com erro ou no fim.
  const shown = uiVisible || media.paused || menu !== null || prompt || scrubbing || overControls || failed || media.ended;
  const controls = shown && !prompt && !failed;

  const attachVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      return el ? store.attach(el) : undefined;
    },
    [store],
  );

  // Progresso ("Continuar assistindo"): a cada 10s tocando, ao pausar, ao terminar e ao sair da página.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const save = () => trackProgress && saveProgress(mediaType, itemId, video.currentTime, video.duration);
    const interval = setInterval(() => !video.paused && save(), 10_000);
    video.addEventListener("pause", save);
    video.addEventListener("ended", save);
    window.addEventListener("pagehide", save);
    return () => {
      save();
      clearInterval(interval);
      video.removeEventListener("pause", save);
      video.removeEventListener("ended", save);
      window.removeEventListener("pagehide", save);
    };
  }, [files, mediaType, itemId, trackProgress]);

  // HLS fora do Safari: o hls.js alimenta o <video> (Media Source Extensions). Um erro fatal de mídia
  // tenta se recuperar uma vez; depois disso, mostra o erro com o botão de tentar de novo.
  const hlsSrc = hlsFile && !nativeHls ? hlsFile.src : null;
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsSrc) return;
    let hls: import("hls.js").default | null = null;
    let cancelled = false;
    let recovered = false;
    import("hls.js").then(({ default: Hls }) => {
      if (cancelled) return;
      if (!Hls.isSupported()) return setFailed(true);
      hls = new Hls({ capLevelToPlayerSize: true });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !recovered) {
          recovered = true;
          hls?.recoverMediaError();
        } else setFailed(true);
      });
      hls.loadSource(hlsSrc);
      hls.attachMedia(video);
    });
    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [hlsSrc, hlsAttempt]);

  // Volume e mudo do último vídeo (só neste navegador).
  useEffect(() => {
    const video = videoRef.current;
    try {
      const saved = JSON.parse(localStorage.getItem(VOLUME_KEY) ?? "null");
      if (video && saved && typeof saved.volume === "number") {
        video.volume = clamp(saved.volume, 0, 1);
        video.muted = saved.muted === true;
      }
    } catch {
      // Sem armazenamento (aba privada, bloqueio): fica o volume padrão.
    }
  }, []);

  // Controles somem depois de 3s sem mexer o mouse, tocar a tela ou usar o teclado.
  const poke = useCallback(() => {
    setUiVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setUiVisible(false), HIDE_MS);
  }, []);
  useEffect(() => {
    hideTimer.current = setTimeout(() => setUiVisible(false), HIDE_MS);
    const timers = flashTimers.current;
    return () => {
      clearTimeout(hideTimer.current);
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  function flash(name: "ripple" | "seek" | "osd" | "bug", clear: () => void, ms: number) {
    clearTimeout(flashTimers.current[name]);
    flashTimers.current[name] = setTimeout(clear, ms);
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video || prompt) return;
    const play = video.paused || video.ended;
    if (play) video.play().catch(() => {});
    else video.pause();
    setRipple((r) => ({ id: (r?.id ?? 0) + 1, icon: play ? "play" : "pause" }));
    flash("ripple", () => setRipple(null), 600);
    poke();
  }

  function seekTo(time: number) {
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration)) video.currentTime = clamp(time, 0, video.duration);
  }

  function seekBy(delta: number) {
    const video = videoRef.current;
    if (!video) return;
    seekTo(video.currentTime + delta);
    const side = delta < 0 ? "left" : "right";
    // Toques seguidos somam (-10 s, -20 s...), como no YouTube e na Netflix.
    setSeekFlash((f) => ({ id: (f?.id ?? 0) + 1, side, amount: f && f.side === side ? f.amount + Math.abs(delta) : Math.abs(delta) }));
    flash("seek", () => setSeekFlash(null), 700);
  }

  function setVolume(value: number) {
    const video = videoRef.current;
    if (!video) return;
    video.volume = clamp(value, 0, 1);
    video.muted = video.volume === 0;
  }

  function changeVolume(delta: number) {
    const video = videoRef.current;
    if (!video) return;
    setVolume((video.muted ? 0 : video.volume) + delta);
    const pct = Math.round(video.muted ? 0 : video.volume * 100);
    setOsd((o) => ({ id: (o?.id ?? 0) + 1, icon: pct ? "volume" : "volume-x", text: pct ? `${pct}%` : "Sem som" }));
    flash("osd", () => setOsd(null), 900);
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) video.volume = 0.5;
  }

  async function toggleFullscreen() {
    const root = rootRef.current;
    const video = videoRef.current as WebkitVideo | null;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.fullscreenEnabled && root) {
        await root.requestFullscreen({ navigationUI: "hide" });
        // No celular, tela cheia deita a tela (onde o navegador permite).
        const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        await orientation.lock?.("landscape").catch(() => {});
      } else video?.webkitEnterFullscreen?.();
    } catch {
      // O navegador recusou (ex.: sem gesto do usuário).
    }
  }

  async function togglePip() {
    const video = videoRef.current;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video?.requestPictureInPicture();
    } catch {
      // Picture-in-picture recusado pelo navegador.
    }
  }

  function chooseSpeed(rate: number) {
    const video = videoRef.current;
    if (!video) return;
    // defaultPlaybackRate mantém a velocidade quando a qualidade muda (o vídeo recarrega).
    video.defaultPlaybackRate = rate;
    video.playbackRate = rate;
  }

  function chooseQuality(src: string) {
    const video = videoRef.current;
    if (!video || src === video.currentSrc) return;
    restore.current = { time: video.currentTime, play: !video.paused };
    // O autoplay só vale para a primeira carga: a troca recarrega e o estado vem de restore.
    video.autoplay = false;
    setOverride(src);
  }

  /** Resposta ao "Continuar de mm:ss" / "Começar do início". */
  function start(from: number) {
    const video = videoRef.current;
    if (!video) return;
    setPrompt(false);
    const go = () => {
      // Perto do fim, começa do início (mesma regra de antes do aviso).
      if (from > 0 && from < video.duration - 5) video.currentTime = from;
      video.play().catch(() => {});
    };
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) go();
    else {
      video.addEventListener("loadedmetadata", go, { once: true });
      // Alguns celulares só carregam o vídeo depois de um play() vindo de um toque.
      video.play().catch(() => {});
    }
    poke();
  }

  function focusControls() {
    poke();
    [...(toolbarRef.current?.querySelectorAll<HTMLElement>("[data-tool]") ?? [])].find((el) => el.offsetParent !== null)?.focus();
  }

  // Atalhos: Espaço/K, ←/→ ou J/L (±10s), ↑/↓ (volume), M, F e as teclas de mídia dos controles remotos.
  // Enter (sem nada focado) leva o foco para os controles; Esc devolve o foco aos atalhos.
  const onDocumentKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    // Qualquer tecla (também as já tratadas pela barra, pela linha do tempo ou pelos menus) mantém os
    // controles à vista: quem navega pelo teclado ou controle remoto não perde a barra no meio do caminho.
    poke();
    if (e.defaultPrevented) return;
    if (prompt || failed) return;
    const target = e.target instanceof HTMLElement ? e.target : null;
    const inControl = !!target?.closest("button, a, input, select, [role='menu']");
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const run = (action: () => void) => {
      e.preventDefault();
      action();
    };
    switch (key) {
      case "k":
      case "MediaPlayPause":
        return run(togglePlay);
      case "MediaPlay":
      case "MediaPause":
        if ((key === "MediaPlay") === !!videoRef.current?.paused) run(togglePlay);
        return;
      case "j":
      case "MediaRewind":
        return run(() => seekBy(-SEEK_STEP));
      case "l":
      case "MediaFastForward":
        return run(() => seekBy(SEEK_STEP));
      case "m":
        return run(toggleMute);
      case "f":
        return run(toggleFullscreen);
      case "Escape":
        if (inControl) run(() => target?.blur());
        return;
    }
    if (inControl) return;
    switch (key) {
      case " ":
        return run(togglePlay);
      case "Enter":
        return run(focusControls);
      case "ArrowLeft":
        return run(() => seekBy(-SEEK_STEP));
      case "ArrowRight":
        return run(() => seekBy(SEEK_STEP));
      case "ArrowUp":
        return run(() => changeVolume(VOLUME_STEP));
      case "ArrowDown":
        return run(() => changeVolume(-VOLUME_STEP));
    }
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => onDocumentKey(e);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Barra de controles como toolbar: ←/→ passam de um botão para o outro (controle remoto), ↑ vai para a linha do tempo.
  function onToolbarKey(e: ReactKeyboardEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp"].includes(e.key) || target.tagName === "INPUT" || target.closest("[role='menu']")) return;
    e.preventDefault();
    if (e.key === "ArrowUp") return seekRef.current?.focus();
    const tools = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-tool]")].filter((el) => el.offsetParent !== null);
    const index = tools.indexOf(target.closest<HTMLElement>("[data-tool]")!);
    tools[(index + (e.key === "ArrowRight" ? 1 : -1) + tools.length) % tools.length]?.focus();
  }

  // Linha do tempo: ←/→ ±10s, PageUp/PageDown ±1 min, Home/End; ↑ e ↓ levam o foco para cima e para baixo.
  function onSeekKey(e: ReactKeyboardEvent<HTMLInputElement>) {
    const actions: Record<string, () => void> = {
      ArrowLeft: () => seekBy(-SEEK_STEP),
      ArrowRight: () => seekBy(SEEK_STEP),
      PageDown: () => seekBy(-60),
      PageUp: () => seekBy(60),
      Home: () => seekTo(0),
      End: () => seekTo(videoRef.current?.duration ?? 0),
      ArrowUp: () => backRef.current?.focus(),
      ArrowDown: focusControls,
    };
    const action = actions[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  }

  // Mouse: clique pausa/continua, duplo clique alterna a tela cheia. Toque: um toque mostra/esconde os
  // controles; dois toques seguidos na metade esquerda ou direita voltam/avançam 10s.
  function onLayerClick() {
    if (pointerType.current === "mouse" && !closingMenu.current) togglePlay();
  }
  function onLayerDoubleClick() {
    if (pointerType.current === "mouse") toggleFullscreen();
  }
  function onLayerPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" || prompt) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const side = e.clientX - rect.left < rect.width / 2 ? "left" : "right";
    const last = lastTap.current;
    if (last && e.timeStamp - last.time < DOUBLE_TAP_MS && last.side === side) {
      seekBy(side === "left" ? -SEEK_STEP : SEEK_STEP);
      // O primeiro toque já tinha alternado os controles: volta como estavam.
      if (last.wasVisible) poke();
      else setUiVisible(false);
      lastTap.current = { ...last, time: e.timeStamp };
      return;
    }
    lastTap.current = { time: e.timeStamp, side, wasVisible: shown };
    if (shown && !media.paused) setUiVisible(false);
    else poke();
  }

  function onPlaying() {
    stats.playing();
    // Classificação no canto ao começar, como nas plataformas de streaming.
    if (bugShown.current) return;
    bugShown.current = true;
    setRatingBug(true);
    flash("bug", () => setRatingBug(false), 7000);
  }

  function onLoadedMetadata(e: SyntheticEvent<HTMLVideoElement>) {
    // Troca de qualidade: volta ao mesmo ponto e ao mesmo estado (tocando ou pausado).
    const r = restore.current;
    if (!r) return;
    restore.current = null;
    const video = e.currentTarget;
    video.currentTime = r.time;
    if (r.play) video.play().catch(() => {});
  }

  function retry() {
    const video = videoRef.current;
    setFailed(false);
    if (!video) return;
    // Recarregar volta o vídeo ao 0:00: guarda o ponto da falha para não perder (nem sobrescrever) o progresso.
    if (video.currentTime > 0) restore.current = { time: video.currentTime, play: true };
    video.autoplay = false;
    if (hlsSrc) setHlsAttempt((n) => n + 1);
    else video.load();
  }

  const quality = qualities.find((q) => q.src === media.src);
  const descriptors = info.rating.descriptors.join(", ");

  return (
    <div
      ref={rootRef}
      className={`relative h-full w-full touch-manipulation select-none overflow-hidden bg-black text-text ${shown ? "" : "cursor-none"}`}
      onPointerDown={(e) => {
        pointerType.current = e.pointerType;
        closingMenu.current = menu !== null;
        // Usar um controle (no toque também) adia o sumiço da barra; a camada do vídeo cuida dos toques nela.
        if (e.target instanceof Element && e.target.closest("button, a, input")) poke();
      }}
      onPointerMove={(e) => e.pointerType === "mouse" && poke()}
      onPointerLeave={(e) => e.pointerType === "mouse" && !media.paused && setUiVisible(false)}
    >
      <video
        ref={attachVideo}
        src={override ?? undefined}
        autoPlay={startAt <= 0}
        playsInline
        preload="metadata"
        poster={poster ?? undefined}
        onLoadedMetadata={onLoadedMetadata}
        onPlaying={onPlaying}
        onPause={stats.stopped}
        onWaiting={stats.stopped}
        onEnded={stats.stopped}
        onError={() => setFailed(true)}
        onVolumeChange={(e) => {
          try {
            localStorage.setItem(VOLUME_KEY, JSON.stringify({ volume: e.currentTarget.volume, muted: e.currentTarget.muted }));
          } catch {
            // Sem armazenamento: o volume só não fica lembrado.
          }
        }}
        className="absolute inset-0 size-full bg-black object-contain"
      >
        {/* O navegador toca a primeira versão que suporta (ex.: WebM VP9 1080p; senão a de reserva). */}
        {/* HLS só vira <source> onde o navegador toca direto; nos outros, quem carrega é o hls.js. */}
        {files
          .filter((f) => !isHls(f) || nativeHls)
          .map((f, i, list) => (
            <source key={f.src} src={f.src} type={f.type} onError={i === list.length - 1 ? () => setFailed(true) : undefined} />
          ))}
      </video>

      {/* Camada de cliques e toques sobre o vídeo. */}
      <div aria-hidden="true" className="absolute inset-0" onClick={onLayerClick} onDoubleClick={onLayerDoubleClick} onPointerUp={onLayerPointerUp} />

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${shown ? "" : "opacity-0"}`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/85 via-black/40 to-transparent transition-opacity duration-300 ${controls ? "" : "opacity-0"}`}
      />

      {ratingBug && !shown && (
        <div className="pointer-events-none absolute left-0 top-[max(1.5rem,env(safe-area-inset-top))] flex max-w-[80%] animate-fade-in items-center gap-3 border-l-4 border-amber bg-black/45 py-2 pl-[max(1rem,env(safe-area-inset-left))] pr-5 backdrop-blur-sm sm:top-10 sm:pl-6">
          <RatingBadge rating={info.rating} size="lg" />
          {descriptors && <span className="text-sm text-text/90 sm:text-base">{descriptors}</span>}
        </div>
      )}

      {/* Indicadores: pausa/continua (onda no centro), ±10s (nas laterais) e volume. */}
      {ripple && (
        <div
          key={ripple.id}
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 scale-125 place-items-center rounded-full bg-black/50 opacity-0 transition duration-500 ease-out starting:scale-75 starting:opacity-100"
        >
          <Icon name={ripple.icon} size={36} />
        </div>
      )}
      {seekFlash && (
        <div
          key={seekFlash.id}
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 flex w-2/5 animate-fade-in items-center justify-center bg-white/[0.07] ${
            seekFlash.side === "left" ? "left-0 rounded-r-[50%]" : "right-0 rounded-l-[50%]"
          }`}
        >
          <span className="flex flex-col items-center gap-1 rounded-full font-semibold">
            <Icon name={seekFlash.side === "left" ? "rewind-10" : "forward-10"} size={40} />
            {seekFlash.side === "left" ? "−" : "+"}
            {seekFlash.amount} s
          </span>
        </div>
      )}
      {osd && (
        <div
          key={osd.id}
          role="status"
          className="pointer-events-none absolute left-1/2 top-[max(5rem,calc(env(safe-area-inset-top)+4rem))] flex -translate-x-1/2 animate-fade-in items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm font-semibold tabular-nums backdrop-blur"
        >
          <Icon name={osd.icon} size={18} />
          {osd.text}
        </div>
      )}

      {/* Centro: no toque (e TVs), voltar/tocar/avançar grandes; com mouse, só o play quando pausado. */}
      {controls && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-10 sm:gap-16">
          {media.ended ? (
            <button
              type="button"
              onClick={() => {
                seekTo(0);
                videoRef.current?.play().catch(() => {});
              }}
              className="pointer-events-auto flex animate-scale-in items-center gap-2 rounded-full bg-white/15 px-6 py-3 font-semibold backdrop-blur-md transition hover:bg-white/25"
            >
              <Icon name="play" size={20} />
              Assistir de novo
            </button>
          ) : (
            <>
              <CenterButton label="Voltar 10 segundos" icon="rewind-10" onClick={() => seekBy(-SEEK_STEP)} className="hidden touch:grid" />
              <div className="relative grid place-items-center">
                {media.waiting && <Spinner />}
                <CenterButton
                  label={media.paused ? "Reproduzir" : "Pausar"}
                  icon={media.paused ? "play" : "pause"}
                  onClick={togglePlay}
                  big
                  className={media.paused ? "grid" : "hidden touch:grid"}
                />
              </div>
              <CenterButton label="Avançar 10 segundos" icon="forward-10" onClick={() => seekBy(SEEK_STEP)} className="hidden touch:grid" />
            </>
          )}
        </div>
      )}
      {!controls && media.waiting && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Spinner />
        </div>
      )}

      {/* Com o aviso de retomar ou de erro aberto, o resto do player fica inerte (o foco não escapa). */}
      <div inert={prompt || failed}>
        <TopBar {...info} backRef={backRef} className={`transition duration-300 ease-out-expo ${shown ? "" : "-translate-y-2 opacity-0 [&_a]:pointer-events-none"}`} />
      </div>

      <div
        inert={prompt || failed}
        className={`gutter absolute inset-x-0 bottom-0 z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition duration-300 ease-out-expo sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] ${
          controls ? "" : "pointer-events-none translate-y-2 opacity-0"
        }`}
        onPointerEnter={(e) => e.pointerType === "mouse" && setOverControls(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setOverControls(false)}
      >
        <div className="flex items-center gap-3 text-xs tabular-nums text-text/90 sm:gap-4 sm:text-sm">
          <span className="min-w-[4ch]">{clock(media.time)}</span>
          <SeekBar
            inputRef={seekRef}
            time={media.time}
            duration={media.duration}
            buffered={media.buffered}
            onSeek={seekTo}
            onScrub={setScrubbing}
            onKeyDown={onSeekKey}
          />
          <span className="min-w-[5ch] text-right">
            <span className="sr-only">Faltam </span>−{clock(media.duration - media.time)}
          </span>
        </div>

        <div ref={toolbarRef} role="toolbar" aria-label="Controles do vídeo" onKeyDown={onToolbarKey} className="mt-1 flex items-center gap-0.5 sm:mt-2 sm:gap-2">
          <ToolButton
            label={media.paused ? "Reproduzir" : "Pausar"}
            hint="K"
            icon={media.paused ? "play" : "pause"}
            onClick={togglePlay}
            tip="start"
            className="max-sm:touch:hidden"
          />
          <ToolButton label="Voltar 10 segundos" hint="J" icon="rewind-10" onClick={() => seekBy(-SEEK_STEP)} className="max-sm:touch:hidden" />
          <ToolButton label="Avançar 10 segundos" hint="L" icon="forward-10" onClick={() => seekBy(SEEK_STEP)} className="max-sm:touch:hidden" />
          <div className="group/vol flex items-center">
            <ToolButton
              label={media.muted || media.volume === 0 ? "Ativar som" : "Sem som"}
              hint="M"
              icon={media.muted || media.volume === 0 ? "volume-x" : "volume"}
              onClick={toggleMute}
              tip="start"
            />
            {/* No toque, o volume é o do aparelho: só o botão de mudo. */}
            <VolumeSlider value={media.muted ? 0 : media.volume} onChange={setVolume} />
          </div>

          <div className="flex-1" />

          <PlayerMenu
            label="Velocidade"
            icon="gauge"
            open={menu === "speed"}
            onOpenChange={(open) => setMenu(open ? "speed" : null)}
            value={media.rate}
            options={SPEEDS.map((rate) => ({ value: rate, label: speedLabel(rate) }))}
            onSelect={chooseSpeed}
          />
          {qualities.length > 1 && (
            <PlayerMenu
              label="Qualidade"
              icon="layers"
              open={menu === "quality"}
              onOpenChange={(open) => setMenu(open ? "quality" : null)}
              value={quality?.src ?? ""}
              options={qualities.map((q) => ({ value: q.src, label: q.label }))}
              onSelect={chooseQuality}
            />
          )}
          {canPip && <ToolButton label="Picture-in-picture" icon="pip" onClick={togglePip} tip="end" />}
          {canFullscreen && (
            <ToolButton
              label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
              hint="F"
              icon={fullscreen ? "minimize" : "maximize"}
              onClick={toggleFullscreen}
              tip="end"
            />
          )}
        </div>
      </div>

      {prompt && (
        <div className="absolute inset-0 z-20 grid animate-fade-in place-items-center bg-black/60 p-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-labelledby="retomar-titulo"
            aria-describedby="retomar-texto"
            className="w-full max-w-sm animate-scale-in rounded-2xl bg-surface/95 p-6 text-center shadow-2xl ring-1 ring-white/10 3xl:max-w-md"
          >
            <p id="retomar-titulo" className="font-display text-xl font-semibold 3xl:text-2xl">
              Continuar assistindo?
            </p>
            <p id="retomar-texto" className="mt-1 text-sm text-muted">
              Você parou em {clock(startAt)}.
            </p>
            <div className="mt-6 grid gap-3">
              <button
                type="button"
                autoFocus
                onClick={() => start(startAt)}
                className="bg-brand inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 font-semibold text-ink shadow-lg shadow-ember/25 transition hover:brightness-110 active:scale-[0.97]"
              >
                <Icon name="play" size={20} />
                Continuar de {clock(startAt)}
              </button>
              <button
                type="button"
                onClick={() => start(0)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white/10 px-6 font-semibold ring-1 ring-inset ring-white/15 transition hover:bg-white/20 active:scale-[0.97]"
              >
                Começar do início
              </button>
            </div>
          </div>
        </div>
      )}

      {failed && (
        <div role="alert" className="absolute inset-0 z-20 grid place-items-center bg-black/70 p-6 text-center">
          <div className="flex max-w-sm flex-col items-center gap-4">
            <Icon name="alert" size={40} className="text-amber" />
            <p className="font-display text-xl font-semibold">Não foi possível tocar este vídeo agora.</p>
            <p className="text-sm text-muted">A fonte pode estar fora do ar ou lenta. Tente de novo em instantes.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button type="button" onClick={retry} className="bg-brand min-h-12 rounded-full px-6 font-semibold text-ink transition hover:brightness-110">
                Tentar de novo
              </button>
              <Link href={info.backHref} className="inline-flex min-h-12 items-center rounded-full bg-white/10 px-6 font-semibold transition hover:bg-white/20">
                Voltar
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Barra de cima: voltar para a página do título, nome e classificação indicativa. */
function TopBar({ title, rating, backHref, note, backRef, className = "" }: Info & { backRef?: Ref<HTMLAnchorElement>; className?: string }) {
  return (
    <div
      className={`gutter pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start gap-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-3 sm:pt-5 ${className}`}
    >
      <Link
        ref={backRef}
        href={backHref}
        aria-label={`Voltar para ${title}`}
        className="pointer-events-auto grid size-11 shrink-0 place-items-center rounded-full transition hover:bg-white/15 active:scale-90 3xl:size-12"
      >
        <Icon name="arrow-left" size={26} />
      </Link>
      <div className="min-w-0 pt-1">
        <h1 className="truncate font-display text-base font-semibold leading-tight sm:text-xl 3xl:text-2xl">{title}</h1>
        {/* Como nas plataformas de streaming, a classificação aparece ao abrir o vídeo. */}
        <p className="mt-1 flex min-w-0 items-center gap-2 text-xs text-text/80 sm:text-sm">
          <RatingBadge rating={rating} size="sm" />
          <span className="truncate">{rating.descriptors.length > 0 ? rating.descriptors.join(", ") : "Classificação indicativa"}</span>
        </p>
        {note && <p className="mt-1 text-xs text-text/70 sm:text-sm">{note}</p>}
      </div>
    </div>
  );
}

function ToolButton({
  label,
  hint,
  icon,
  tip = "center",
  className = "",
  ...props
}: { label: string; hint?: string; icon: IconName; tip?: "start" | "center" | "end" } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  const position = { start: "left-0", center: "left-1/2 -translate-x-1/2", end: "right-0" }[tip];
  return (
    <button
      type="button"
      data-tool
      aria-label={label}
      aria-keyshortcuts={hint?.toLowerCase()}
      className={`group/tool relative grid size-11 shrink-0 place-items-center rounded-full text-text/90 transition duration-200 hover:bg-white/15 hover:text-text active:scale-90 3xl:size-12 ${className}`}
      {...props}
    >
      <Icon name={icon} size={26} />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-full mb-2 whitespace-nowrap rounded-md bg-surface-2/95 px-2 py-1 text-xs font-semibold opacity-0 shadow-lg ring-1 ring-white/10 transition duration-200 group-focus-visible/tool:opacity-100 pointer-fine:group-hover/tool:opacity-100 ${position}`}
      >
        {label}
        {hint && <span className="ml-1.5 text-muted">{hint}</span>}
      </span>
    </button>
  );
}

function CenterButton({ label, icon, onClick, big, className }: { label: string; icon: IconName; onClick: () => void; big?: boolean; className: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`pointer-events-auto place-items-center rounded-full bg-black/45 backdrop-blur-sm transition duration-200 hover:bg-black/65 active:scale-90 ${
        big ? "size-16 sm:size-20 3xl:size-24" : "size-12 sm:size-14"
      } ${className}`}
    >
      <Icon name={icon} size={big ? 34 : 28} />
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-label="Carregando"
      role="status"
      className="absolute size-20 animate-spin rounded-full border-[0.1875rem] border-white/20 border-t-amber sm:size-24 3xl:size-28"
    />
  );
}

/** Linha do tempo: carregado + assistido, prévia do tempo sob o mouse e um range nativo (teclado e leitores de tela). */
function SeekBar({
  inputRef,
  time,
  duration,
  buffered,
  onSeek,
  onScrub,
  onKeyDown,
}: {
  inputRef: Ref<HTMLInputElement>;
  time: number;
  duration: number;
  buffered: number;
  onSeek: (time: number) => void;
  onScrub: (scrubbing: boolean) => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLInputElement>) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const value = Math.min(scrub ?? time, duration);
  const pct = (seconds: number) => (duration > 0 ? clamp((seconds / duration) * 100, 0, 100) : 0);
  const tip = scrub !== null ? pct(scrub) : hover;

  const dragging = useRef(false);

  function startScrub() {
    dragging.current = true;
    onScrub(true);
    // Um só AbortController remove os dois ouvintes, qualquer que seja o evento que encerre o arraste.
    const done = new AbortController();
    const end = () => {
      done.abort();
      dragging.current = false;
      setScrub(null);
      onScrub(false);
    };
    window.addEventListener("pointerup", end, { signal: done.signal });
    window.addEventListener("pointercancel", end, { signal: done.signal });
  }

  return (
    <div
      className="group/seek relative flex h-8 flex-1 touch-none items-center"
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const rect = e.currentTarget.getBoundingClientRect();
        setHover(clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100));
      }}
      onPointerLeave={() => setHover(null)}
    >
      <input
        ref={inputRef}
        type="range"
        min={0}
        max={duration}
        step="any"
        value={value}
        disabled={!duration}
        aria-label="Linha do tempo"
        aria-valuetext={`${clock(value)} de ${clock(duration)}`}
        onChange={(e) => {
          const t = Number(e.target.value);
          // Só segura a posição durante um arraste; ajustes de leitor de tela ou teclado vão direto.
          if (dragging.current) setScrub(t);
          onSeek(t);
        }}
        onPointerDown={startScrub}
        onKeyDown={onKeyDown}
        className="absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none opacity-0 disabled:cursor-default"
      />
      <div className="pointer-events-none relative h-1 w-full rounded-full bg-white/25 transition-[height] duration-200 group-hover/seek:h-1.5 group-has-[input:focus-visible]/seek:h-1.5 group-has-[input:focus-visible]/seek:outline group-has-[input:focus-visible]/seek:outline-2 group-has-[input:focus-visible]/seek:outline-offset-4 group-has-[input:focus-visible]/seek:outline-amber">
        <div className="absolute inset-y-0 left-0 rounded-full bg-white/35" style={{ width: `${pct(buffered)}%` }} />
        <div className="bg-brand absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct(value)}%` }} />
        <div
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-amber shadow-md shadow-black/50 transition-transform duration-200 group-hover/seek:scale-100 group-has-[input:focus-visible]/seek:scale-100 touch:scale-100"
          style={{ left: `${pct(value)}%` }}
        />
      </div>
      {tip !== null && duration > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded-md bg-surface-2/95 px-2 py-1 text-xs font-semibold shadow-lg ring-1 ring-white/10"
          style={{ left: `clamp(1.75rem, ${tip}%, calc(100% - 1.75rem))` }}
        >
          {clock((tip / 100) * duration)}
        </span>
      )}
    </div>
  );
}

function VolumeSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="relative flex h-8 w-0 items-center overflow-hidden opacity-0 transition-all duration-300 ease-out-expo group-focus-within/vol:ml-1 group-focus-within/vol:w-24 group-focus-within/vol:opacity-100 touch:hidden pointer-fine:group-hover/vol:ml-1 pointer-fine:group-hover/vol:w-24 pointer-fine:group-hover/vol:opacity-100">
      <input
        type="range"
        min={0}
        max={1}
        step={VOLUME_STEP}
        value={value}
        aria-label="Volume"
        aria-valuetext={`${Math.round(value * 100)}%`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none opacity-0"
      />
      <div className="pointer-events-none relative mx-1.5 h-1 w-full rounded-full bg-white/25 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-amber">
        <div className="absolute inset-y-0 left-0 rounded-full bg-text" style={{ width: `${value * 100}%` }} />
        <div className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text shadow" style={{ left: `${value * 100}%` }} />
      </div>
    </div>
  );
}

/** Menu de opções (velocidade, qualidade): ↑/↓ escolhem, Enter confirma, Esc fecha e volta ao botão. */
function PlayerMenu<T extends string | number>({
  label,
  icon,
  open,
  onOpenChange,
  value,
  options,
  onSelect,
}: {
  label: string;
  icon: IconName;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: T;
  options: { value: T; label: string }[];
  onSelect: (value: T) => void;
}) {
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);
  const close = useEffectEvent(() => onOpenChange(false));

  useEffect(() => {
    if (!open) return;
    const items = wrapRef.current?.querySelectorAll<HTMLElement>("[role='menuitemradio']");
    (wrapRef.current?.querySelector<HTMLElement>("[aria-checked='true']") ?? items?.[0])?.focus();
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function focusButton() {
    wrapRef.current?.querySelector<HTMLElement>("[data-tool]")?.focus();
  }

  function onMenuKey(e: ReactKeyboardEvent<HTMLDivElement>) {
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>("[role='menuitemradio']")];
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 }[e.key];
    if (e.key === "Tab") return onOpenChange(false);
    if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
      return focusButton();
    }
    // As setas do lado não navegam a barra de controles enquanto o menu está aberto.
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") return e.preventDefault();
    if (next === undefined) return;
    e.preventDefault();
    items[(next + items.length) % items.length]?.focus();
  }

  return (
    <div ref={wrapRef} className="relative">
      <ToolButton
        label={current ? `${label}: ${current.label}` : label}
        icon={icon}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => onOpenChange(!open)}
        className={open ? "bg-white/15" : ""}
      />
      {open && (
        <div
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className="absolute bottom-full right-0 z-30 mb-3 min-w-44 origin-bottom-right animate-scale-in rounded-xl bg-surface-2/95 p-1.5 shadow-2xl shadow-black/60 ring-1 ring-white/10 backdrop-blur-md 3xl:min-w-52"
        >
          <p className="px-3 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
          {options.map((o) => {
            const checked = o.value === value;
            return (
              <button
                key={String(o.value)}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                tabIndex={-1}
                onClick={() => {
                  onSelect(o.value);
                  onOpenChange(false);
                  focusButton();
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/10 focus-visible:bg-white/10 ${
                  checked ? "font-semibold text-text" : "text-text/80"
                }`}
              >
                <Icon name="check" size={16} className={checked ? "text-amber" : "invisible"} />
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youTubeApi: Promise<any> | null = null;

/** Carrega o IFrame API do YouTube uma vez. Se o script não vier (rede, bloqueador), a próxima tentativa carrega de novo. */
function loadYouTubeApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  youTubeApi ??= new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      script.remove();
      youTubeApi = null;
      reject(new Error("YouTube IFrame API"));
    };
    document.head.appendChild(script);
  });
  return youTubeApi;
}

/** Desiste de um carregamento que não respondeu: a próxima tentativa baixa o IFrame API do zero. */
function forgetYouTubeApi() {
  if (window.YT?.Player) return;
  youTubeApi = null;
  document.querySelectorAll('script[src="https://www.youtube.com/iframe_api"]').forEach((s) => s.remove());
  // O script do YouTube só recomeça se não encontrar o YT anterior, que ficou "carregando". (Não dá para
  // apagar com delete: o script cria window.YT com var.)
  window.YT = undefined;
}

/** Tempo de vídeo tocando com o nome e a classificação na tela, na abertura. */
const INTRO_MS = 5000;
/** Sem resposta do YouTube nesse tempo, o player mostra o erro com "Tentar de novo". */
const YOUTUBE_TIMEOUT_MS = 20_000;

type YouTubeFailure = "load" | "removed" | "embed" | "playback";

const YOUTUBE_FAILURES: Record<YouTubeFailure, { title: string; text: string }> = {
  load: {
    title: "Não foi possível carregar o player do YouTube.",
    text: "Confira a conexão ou se algum bloqueador está impedindo o YouTube, e tente de novo.",
  },
  removed: { title: "Este vídeo não está mais disponível.", text: "Ele foi removido do YouTube ou ficou privado." },
  embed: { title: "Este vídeo só pode ser assistido no YouTube.", text: "Quem publicou o vídeo não permite exibi-lo em outros sites." },
  playback: { title: "Não foi possível tocar este vídeo agora.", text: "Tente de novo em instantes." },
};

/** Códigos do onError do IFrame API: 2 e 100 (vídeo inválido ou removido), 101 e 150 (incorporação proibida). */
function youTubeFailure(code: number): YouTubeFailure {
  if (code === 101 || code === 150) return "embed";
  if (code === 2 || code === 100) return "removed";
  return "playback";
}

/**
 * Trailer (YouTube IFrame API): os controles são os do YouTube. Por cima, como na Netflix, o nome, a
 * classificação e o aviso aparecem nos primeiros segundos de vídeo e somem devagar; fica só o botão de
 * voltar, discreto. No fim, em vez da grade de vídeos do YouTube, "Assistir de novo" e "Voltar".
 */
function YouTubePlayer({
  videoKey,
  mediaType,
  itemId,
  startAt,
  trackProgress = true,
  ...info
}: Omit<PlayerProps, "source" | "poster"> & { videoKey: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const stats = useWatchStats(mediaType, itemId);
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [intro, setIntro] = useState(true);
  const [failure, setFailure] = useState<YouTubeFailure | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // O IFrame API troca o elemento pelo iframe: um div novo a cada tentativa, fora da árvore do React.
    const el = host.appendChild(document.createElement("div"));
    let player: any;
    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    const save = () => {
      if (trackProgress && player?.getCurrentTime) saveProgress(mediaType, itemId, player.getCurrentTime(), player.getDuration());
    };

    // A abertura conta só o tempo tocando: carregando ou pausado, o nome continua na tela. Ao assistir
    // de novo, ela volta.
    let introLeft = INTRO_MS;
    let introFrom = 0;
    let introTimer: ReturnType<typeof setTimeout> | undefined;
    let replaying = false;
    const holdIntro = () => {
      if (introTimer === undefined) return;
      clearTimeout(introTimer);
      introTimer = undefined;
      introLeft -= performance.now() - introFrom;
      // O prazo venceu antes deste aviso chegar (ex.: app em segundo plano no celular): some agora.
      if (introLeft <= 0) {
        introLeft = 0;
        setIntro(false);
      }
    };
    const runIntro = () => {
      if (introTimer !== undefined || introLeft <= 0) return;
      introFrom = performance.now();
      introTimer = setTimeout(() => {
        introTimer = undefined;
        introLeft = 0;
        setIntro(false);
      }, introLeft);
    };

    // Sem resposta a tempo, desiste de verdade: o que chegar atrasado não cria nem toca um player escondido
    // atrás do erro, e "Tentar de novo" baixa o IFrame API do zero.
    const giveUp = setTimeout(() => {
      cancelled = true;
      clearInterval(interval);
      stats.stopped();
      player?.destroy?.();
      player = undefined;
      playerRef.current = null;
      host.replaceChildren();
      forgetYouTubeApi();
      setFailure("load");
    }, YOUTUBE_TIMEOUT_MS);

    loadYouTubeApi().then(
      (YT) => {
        if (cancelled) return;
        const { PLAYING, BUFFERING, PAUSED, ENDED } = YT.PlayerState;
        player = new YT.Player(el, {
          host: "https://www.youtube-nocookie.com",
          videoId: videoKey,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            // No iPhone, toca dentro da página (com o botão de voltar), sem abrir a tela cheia sozinho.
            playsinline: 1,
            rel: 0,
            iv_load_policy: 3,
            start: Math.floor(startAt),
            hl: "pt-BR",
            cc_lang_pref: "pt",
          },
          events: {
            onReady: () => {
              clearTimeout(giveUp);
              setReady(true);
            },
            onStateChange: (e: any) => {
              setPlaying(e.data === PLAYING || e.data === BUFFERING);
              setEnded(e.data === ENDED);
              if (e.data === PLAYING) stats.playing();
              else stats.stopped();
              if (e.data === PLAYING) {
                if (replaying) {
                  replaying = false;
                  setIntro(true);
                }
                runIntro();
              } else holdIntro();
              if (e.data === ENDED) {
                introLeft = INTRO_MS;
                replaying = true;
              }
              if (e.data === PAUSED || e.data === ENDED) save();
            },
            onError: (e: any) => {
              clearTimeout(giveUp);
              setFailure(youTubeFailure(Number(e.data)));
            },
          },
        });
        playerRef.current = player;
        interval = setInterval(() => player?.getPlayerState?.() === PLAYING && save(), 10_000);
      },
      () => {
        if (cancelled) return;
        clearTimeout(giveUp);
        setFailure("load");
      },
    );
    window.addEventListener("pagehide", save);

    return () => {
      cancelled = true;
      save();
      clearTimeout(giveUp);
      clearTimeout(introTimer);
      clearInterval(interval);
      window.removeEventListener("pagehide", save);
      stats.stopped();
      player?.destroy?.();
      playerRef.current = null;
      host.replaceChildren();
    };
  }, [videoKey, mediaType, itemId, startAt, trackProgress, attempt, stats]);

  function retry() {
    setFailure(null);
    setReady(false);
    setPlaying(false);
    setEnded(false);
    setIntro(true);
    setAttempt((n) => n + 1);
  }

  function replay() {
    setEnded(false);
    playerRef.current?.seekTo?.(0, true);
    playerRef.current?.playVideo?.();
  }

  const showInfo = intro && !ended && !failure;
  const descriptors = info.rating.descriptors.join(", ");
  const youTubeUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoKey)}`;
  const failed = failure ? YOUTUBE_FAILURES[failure] : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-black text-text">
      {/* O IFrame API põe aqui o iframe do YouTube. */}
      <div ref={hostRef} className="absolute inset-0 [&_iframe]:block [&_iframe]:size-full" />

      {!ready && !failure && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Spinner />
        </div>
      )}

      {/* Abertura: o topo escurece atrás do nome e clareia junto com ele. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 z-20 h-52 bg-gradient-to-b from-black/80 via-black/30 to-transparent transition-opacity duration-1000 ease-in-out starting:opacity-0 sm:h-72 ${
          showInfo ? "" : "opacity-0"
        }`}
      />
      <div className="gutter pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start gap-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-3 sm:pt-5">
        <Link
          href={info.backHref}
          aria-label={`Voltar para ${info.title}`}
          className={`pointer-events-auto grid size-11 shrink-0 place-items-center rounded-full bg-black/45 backdrop-blur transition duration-500 hover:bg-black/70 hover:opacity-100 focus-visible:opacity-100 active:scale-90 3xl:size-12 ${
            playing && !intro ? "opacity-60" : ""
          }`}
        >
          <Icon name="arrow-left" size={26} />
        </Link>
        <div className={`min-w-0 pt-0.5 transition-opacity duration-1000 ease-in-out starting:opacity-0 ${showInfo ? "" : "opacity-0"}`}>
          <h1 className="truncate font-display text-lg font-semibold leading-tight drop-shadow-md sm:text-2xl 3xl:text-3xl">{info.title}</h1>
          <p className="mt-2 flex min-w-0 items-center gap-2.5 border-l-[3px] border-amber pl-2.5 text-xs text-text/90 drop-shadow sm:text-sm">
            <RatingBadge rating={info.rating} size="sm" />
            <span className="truncate">{descriptors || "Classificação indicativa"}</span>
          </p>
          {info.note && <p className="mt-2 text-xs text-text/75 drop-shadow sm:text-sm">{info.note}</p>}
        </div>
      </div>

      {ended && !failure && (
        <div className="absolute inset-0 z-20 grid animate-fade-in place-items-center bg-black/80 p-6 text-center backdrop-blur-sm">
          <div className="flex max-w-md flex-col items-center gap-3">
            <p className="font-display text-2xl font-semibold sm:text-3xl">{info.title}</p>
            {info.note && <p className="text-sm text-muted">{info.note}</p>}
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                autoFocus
                onClick={replay}
                className="bg-brand inline-flex min-h-12 items-center gap-2 rounded-full px-6 font-semibold text-ink shadow-lg shadow-ember/25 transition hover:brightness-110 active:scale-[0.97]"
              >
                <Icon name="play" size={20} />
                Assistir de novo
              </button>
              <Link
                href={info.backHref}
                className="inline-flex min-h-12 items-center rounded-full bg-white/10 px-6 font-semibold ring-1 ring-inset ring-white/15 transition hover:bg-white/20"
              >
                Voltar
              </Link>
            </div>
          </div>
        </div>
      )}

      {failed && (
        <div role="alert" className="absolute inset-0 z-20 grid place-items-center bg-black p-6 text-center">
          <div className="flex max-w-sm flex-col items-center gap-4">
            <Icon name="alert" size={40} className="text-amber" />
            <p className="font-display text-xl font-semibold">{failed.title}</p>
            <p className="text-sm text-muted">{failed.text}</p>
            <div className="flex flex-wrap justify-center gap-3">
              {(failure === "load" || failure === "playback") && (
                <button type="button" onClick={retry} className="bg-brand min-h-12 rounded-full px-6 font-semibold text-ink transition hover:brightness-110">
                  Tentar de novo
                </button>
              )}
              {failure !== "removed" && (
                <a
                  href={youTubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex min-h-12 items-center rounded-full px-6 font-semibold transition ${
                    failure === "embed" ? "bg-brand text-ink hover:brightness-110" : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  Assistir no YouTube
                </a>
              )}
              <Link href={info.backHref} className="inline-flex min-h-12 items-center rounded-full bg-white/10 px-6 font-semibold transition hover:bg-white/20">
                Voltar
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
