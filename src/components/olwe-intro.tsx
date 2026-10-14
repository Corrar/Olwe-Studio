"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import "@fontsource/outfit/latin-700.css";
import { INTRO_NEXT_KEY, INTRO_PLAYED_KEY } from "@/lib/intro";
import "./olwe-intro.css";

const LETTERS = ["o", "l", "w", "e"];
// Tempo total da vinheta (e com menos movimento), em milissegundos.
const DURATION = 3600;
const REDUCED_DURATION = 900;

/** "Ta-dum" sintetizado. Só toca depois de um clique na página (o navegador bloqueia áudio automático). */
function taDum(delay: number) {
  try {
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Context();
    const t = ctx.currentTime + delay;
    const tone = (freq: number, t0: number, dur: number, gain: number, type: OscillatorType) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    };
    tone(98, t, 0.35, 0.5, "triangle"); // "ta"
    tone(196, t, 0.25, 0.12, "sine");
    tone(73.4, t + 0.24, 1.6, 0.6, "triangle"); // "dum"
    tone(146.8, t + 0.24, 1.2, 0.15, "sine");
    tone(220, t + 0.24, 0.9, 0.06, "sine");
    setTimeout(() => void ctx.close(), (delay + 2.2) * 1000);
  } catch {
    // Sem áudio: a vinheta segue muda.
  }
}

/**
 * Vinheta de abertura, como nos apps de streaming: toca uma vez por sessão ao abrir o catálogo e de
 * novo, com som, logo depois de escolher um perfil. Um clique ou uma tecla pula.
 */
export function OlweIntro() {
  const [state, setState] = useState<"playing" | "exiting" | "done">("playing");
  const overlay = useRef<HTMLDivElement>(null);

  // Antes da pintura: decide se toca (e com som) ou some sem aparecer.
  useLayoutEffect(() => {
    let played = false;
    let next: string | null = null;
    try {
      played = sessionStorage.getItem(INTRO_PLAYED_KEY) !== null;
      next = sessionStorage.getItem(INTRO_NEXT_KEY);
      sessionStorage.setItem(INTRO_PLAYED_KEY, "1");
      sessionStorage.removeItem(INTRO_NEXT_KEY);
    } catch {
      // Sem sessionStorage (modo privado restrito): toca normalmente.
    }
    if (played && !next) {
      // Some antes da pintura e sai da árvore em seguida.
      if (overlay.current) overlay.current.style.display = "none";
      const timer = setTimeout(() => setState("done"), 0);
      return () => clearTimeout(timer);
    }
    // Perfil escolhido depois da primeira abertura: o <html> pode estar marcado como "já tocou".
    document.documentElement.removeAttribute("data-intro-played");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (next === "sound" && !reduced) taDum(0.7);
    const timer = setTimeout(() => setState("done"), reduced ? REDUCED_DURATION : DURATION);
    return () => clearTimeout(timer);
  }, []);

  const skip = useCallback(() => {
    setState((s) => (s === "playing" ? "exiting" : s));
    setTimeout(() => setState("done"), 300);
  }, []);

  useEffect(() => {
    if (state !== "playing") return;
    const onKey = () => skip();
    window.addEventListener("keydown", onKey, { once: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [state, skip]);

  if (state === "done") return null;

  return (
    <div
      ref={overlay}
      data-olwe-intro=""
      style={{ viewTransitionName: "olwe-intro" }}
      className={`olwe-intro-overlay ${state === "exiting" ? "olwe-intro-exiting" : ""}`}
      onPointerDown={skip}
      aria-hidden="true"
    >
      <div className="olwe-intro-lockup">
        <div className="olwe-intro-icon-wrap">
          <div className="olwe-intro-glow" />
          <svg className="olwe-intro-icon" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="olwe-intro-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f15a3b" />
                <stop offset="1" stopColor="#f9a94b" />
              </linearGradient>
            </defs>
            <circle
              className="olwe-intro-ring"
              cx="60"
              cy="60"
              r="47"
              fill="none"
              stroke="url(#olwe-intro-g)"
              strokeWidth="14"
              strokeLinecap="round"
              pathLength={1}
              transform="rotate(-90 60 60)"
            />
            <path
              className="olwe-intro-play"
              d="M50 41 L82 60 L50 79 Z"
              fill="url(#olwe-intro-g)"
              stroke="url(#olwe-intro-g)"
              strokeWidth="7"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="olwe-intro-word">
          {LETTERS.map((ch, i) => (
            <span key={i} className="olwe-intro-letter" style={{ "--i": i } as React.CSSProperties}>
              {ch}
            </span>
          ))}
        </div>
      </div>
      <button type="button" className="olwe-intro-skip" tabIndex={-1} onPointerDown={skip}>
        Pular
      </button>
    </div>
  );
}

/**
 * Marca a vinheta para tocar com som ao entrar no catálogo depois de enviar um formulário com o
 * atributo data-intro-next (escolha de perfil). O clique libera o áudio na página.
 */
export function IntroTrigger() {
  useEffect(() => {
    const onSubmit = (e: SubmitEvent) => {
      if ((e.target as Element | null)?.closest?.("[data-intro-next]")) {
        try {
          sessionStorage.setItem(INTRO_NEXT_KEY, "sound");
        } catch {
          // Sem sessionStorage: a vinheta não toca de novo.
        }
      }
    };
    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, []);
  return null;
}
