"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";

type Tone = "success" | "error" | "info";
type ToastOptions = { tone?: Tone; action?: { label: string; href: string } };
type Toast = ToastOptions & { id: number; message: string; leaving: boolean };

const MAX_TOASTS = 3;
const DURATION_MS = 3500;
// Com ação ("Ver lista"), dá mais tempo para alcançar o botão.
const ACTION_DURATION_MS = 5000;
const EXIT_MS = 200;

const TONES: Record<Tone, { icon: IconName; badge: string }> = {
  success: { icon: "check", badge: "bg-brand text-ink" },
  error: { icon: "alert", badge: "bg-ember/15 text-ember" },
  info: { icon: "info", badge: "bg-white/10 text-text" },
};

// Fora do provedor, show não faz nada (componentes reutilizados em telas sem avisos não quebram).
const ToastContext = createContext<{ show(message: string, opts?: ToastOptions): void }>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

/** Avisos curtos ("Adicionado à Minha Lista") no rodapé, acima da barra de abas do celular. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), EXIT_MS);
  }, []);

  const show = useCallback((message: string, opts: ToastOptions = {}) => {
    const id = ++nextId.current;
    // A mesma mensagem repetida (clique duplo) substitui a anterior em vez de empilhar.
    setToasts((list) => [...list.filter((t) => t.message !== message), { ...opts, id, message, leaving: false }].slice(-MAX_TOASTS));
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="gutter pointer-events-none fixed inset-x-0 z-[100] flex flex-col items-center gap-2"
        style={{ bottom: "calc(var(--tab-bar-h) + env(safe-area-inset-bottom) + 1rem)" }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  // Pausa enquanto o mouse ou o foco estão no aviso, para dar tempo de ler e de usar a ação.
  const [paused, setPaused] = useState(false);
  const duration = toast.action ? ACTION_DURATION_MS : DURATION_MS;

  useEffect(() => {
    if (paused || toast.leaving) return;
    const timer = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(timer);
  }, [paused, toast.leaving, toast.id, duration, onDismiss]);

  const tone = TONES[toast.tone ?? "info"];
  return (
    <div
      className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-surface-2/95 py-2 pl-3 pr-2 text-sm shadow-2xl shadow-black/60 backdrop-blur-md transition duration-200 ease-out-expo ${
        toast.leaving ? "translate-y-2 scale-95 opacity-0" : "animate-slide-up"
      }`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onDismiss(toast.id);
      }}
    >
      <span className={`grid size-7 shrink-0 place-items-center rounded-full ${tone.badge}`}>
        <Icon name={tone.icon} size={16} />
      </span>
      <p className="min-w-0 flex-1 py-1.5 font-medium leading-snug">{toast.message}</p>
      {toast.action && (
        <Link
          href={toast.action.href}
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 rounded-lg px-2.5 py-1.5 font-semibold text-amber transition hover:bg-white/10"
        >
          {toast.action.label}
        </Link>
      )}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fechar aviso"
        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-white/10 hover:text-text"
      >
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
