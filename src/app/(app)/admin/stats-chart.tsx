"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import { dayLabel, Delta, formatMetric, type MetricKind } from "./format";

export type ChartMetric = {
  key: string;
  label: string;
  kind: MetricKind;
  total: number;
  previous: number;
  /** Um valor por dia, na unidade do gráfico (horas, reais...). */
  values: number[];
};

/** Linha do gráfico: brasa um passo mais escura que a marca, validada contra o fundo escuro (contraste e luminosidade). */
const SERIES = "#ec6534";
const TICKS = 4;

/** Passo "redondo" do eixo (1, 2, 2,5 ou 5 × 10ⁿ) para TICKS divisões cobrirem o maior valor. */
function niceStep(max: number, whole: boolean) {
  if (max <= 0) return 1;
  const raw = max / TICKS;
  const exp = 10 ** Math.floor(Math.log10(raw));
  const f = raw / exp;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
  return whole ? Math.max(1, Math.ceil(step)) : step;
}

/**
 * Visão geral no estilo do YouTube Studio: abas com o total de cada métrica (e a variação contra o período
 * anterior) e, embaixo, o gráfico diário da métrica escolhida. Mouse, toque e teclado (setas) mostram o
 * valor de cada dia; a tabela com todos os dias fica logo abaixo.
 */
/** Casas decimais que o passo do eixo tem (0,05 → 2; 2,5 → 1; 20 → 0). */
function stepDecimals(step: number) {
  let digits = 0;
  while (digits < 6 && Math.abs(Math.round(step * 10 ** digits) - step * 10 ** digits) > 1e-9) digits++;
  return digits;
}

export function StatsChart({ days, metrics, periodLabel }: { days: string[]; metrics: ChartMetric[]; periodLabel: string }) {
  const [selected, setSelected] = useState(metrics[0].key);
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const metric = metrics.find((m) => m.key === selected) ?? metrics[0];
  const n = days.length;

  const step = niceStep(Math.max(0, ...metric.values), metric.kind === "count");
  const max = step * TICKS;
  const decimals = stepDecimals(step);
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 50);
  const y = (v: number) => 100 - (Math.max(0, v) / max) * 100;
  const line = metric.values.map((v, i) => `${i ? "L" : "M"}${x(i) * 10},${y(v) * 3}`).join(" ");
  const area = `${line} L${x(n - 1) * 10},300 L${x(0) * 10},300 Z`;

  const peak = metric.values.reduce((best, v, i) => (v > metric.values[best] ? i : best), 0);
  const summary = `${metric.label}: ${formatMetric(metric.kind, metric.total)} ${periodLabel}. Maior valor: ${formatMetric(metric.kind, metric.values[peak] ?? 0)} em ${dayLabel(days[peak])}.`;

  function pointAt(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHover(Math.round(ratio * (n - 1)));
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, PageUp: -7, PageDown: 7 };
    let next: number | null = null;
    if (e.key in moves) next = Math.min(n - 1, Math.max(0, (hover ?? n - 1) + moves[e.key]));
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else if (e.key === "Escape") return setHover(null);
    if (next === null) return;
    e.preventDefault();
    setHover(next);
  }

  // Abas como no WAI-ARIA: ←/→ trocam de métrica.
  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const index = metrics.findIndex((m) => m.key === metric.key);
    const next = metrics[(index + (e.key === "ArrowRight" ? 1 : -1) + metrics.length) % metrics.length];
    setSelected(next.key);
    document.getElementById(`${id}-tab-${next.key}`)?.focus();
  }

  const active = hover !== null ? hover : null;
  const tipLeft = active !== null ? x(active) : 0;

  return (
    <section aria-label="Visão geral" className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div role="tablist" aria-label="Métricas" onKeyDown={onTabKey} className="grid grid-cols-2 border-b border-line sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => {
          const on = m.key === metric.key;
          return (
            <button
              key={m.key}
              id={`${id}-tab-${m.key}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`${id}-panel`}
              tabIndex={on ? 0 : -1}
              onClick={() => setSelected(m.key)}
              className={`relative min-w-0 p-4 text-left transition sm:px-5 ${on ? "bg-white/[0.04]" : "hover:bg-white/[0.03]"}`}
            >
              <span className="block truncate text-xs text-muted sm:text-sm">{m.label}</span>
              <span className="mt-1 block truncate font-display text-xl font-semibold sm:text-2xl">{formatMetric(m.kind, m.total)}</span>
              <Delta current={m.total} previous={m.previous} className="mt-1" />
              <span aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-0.5 transition ${on ? "bg-[#ec6534]" : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>

      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${metric.key}`} className="p-4 sm:p-6">
        <div className="relative h-56 pb-6 pr-14 sm:h-72">
          {/* Linhas de grade com os valores do eixo à direita, como no YouTube Studio. */}
          <div aria-hidden="true" className="absolute inset-0 bottom-6 right-0">
            {Array.from({ length: TICKS + 1 }, (_, i) => (
              <div key={i} className="absolute inset-x-0 flex items-center" style={{ top: `${(i / TICKS) * 100}%` }}>
                <span className="h-px flex-1 bg-white/[0.07]" />
                <span className="w-14 pl-2 text-right text-xs tabular-nums text-muted">{formatMetric(metric.kind, max - i * step, true, decimals)}</span>
              </div>
            ))}
          </div>

          <div
            role="img"
            aria-label={summary}
            tabIndex={0}
            onKeyDown={onKey}
            onFocus={() => setHover((h) => h ?? n - 1)}
            onBlur={() => setHover(null)}
            onPointerMove={pointAt}
            onPointerDown={pointAt}
            onPointerLeave={() => setHover(null)}
            className="absolute inset-0 bottom-6 right-14 cursor-crosshair touch-pan-y rounded-sm outline-offset-4"
          >
            <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
              <path d={area} fill={SERIES} fillOpacity={0.1} />
              <path d={line} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>

            {active !== null && (
              <>
                <span aria-hidden="true" className="absolute inset-y-0 w-px bg-white/40" style={{ left: `${tipLeft}%` }} />
                <span
                  aria-hidden="true"
                  className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
                  style={{ left: `${tipLeft}%`, top: `${y(metric.values[active])}%`, background: SERIES }}
                />
                <div
                  className={`pointer-events-none absolute top-2 z-10 w-max max-w-48 rounded-xl bg-surface-2 px-3 py-2 shadow-xl shadow-black/50 ring-1 ring-white/10 ${
                    tipLeft > 60 ? "-translate-x-full -ml-3" : "ml-3"
                  }`}
                  style={{ left: `${tipLeft}%` }}
                >
                  <p className="font-display text-base font-semibold tabular-nums">{formatMetric(metric.kind, metric.values[active])}</p>
                  <p className="text-xs text-muted">{dayLabel(days[active], true)}</p>
                </div>
              </>
            )}
          </div>

          {/* Datas: início, meio e fim do período. */}
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 right-14 h-5 text-xs text-muted">
            <span className="absolute left-0">{dayLabel(days[0])}</span>
            {n > 2 && <span className="absolute left-1/2 -translate-x-1/2">{dayLabel(days[Math.floor((n - 1) / 2)])}</span>}
            <span className="absolute right-0">{dayLabel(days[n - 1])}</span>
          </div>
        </div>

        <p aria-live="polite" className="sr-only">
          {active !== null ? `${dayLabel(days[active], true)}: ${formatMetric(metric.kind, metric.values[active])}` : ""}
        </p>

        <details className="group mt-4 text-sm">
          <summary className="inline-flex cursor-pointer items-center gap-1 rounded-full px-1 text-muted transition hover:text-text">
            Ver os números de cada dia
          </summary>
          <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface-2 text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Dia
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    {metric.label}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {days.map((day, i) => (
                  <tr key={day}>
                    <td className="px-4 py-1.5">{dayLabel(day, true)}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums">{formatMetric(metric.kind, metric.values[i])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}
