import { Icon } from "@/components/icons";
import { formatCents } from "@/lib/money";

// Formatos do painel, usados no servidor e no gráfico.

/** count = quantidade; hours = horas (com uma casa); brl = reais. */
export type MetricKind = "count" | "hours" | "brl";

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

export const formatCount = (n: number) => Math.round(n).toLocaleString("pt-BR");

/** "15 de out." ou "15 de out. de 2026" (dia "AAAA-MM-DD", sem fuso). */
export const dayLabel = (day: string, year = false) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: year ? "numeric" : undefined, timeZone: "UTC" });

/** Segundos assistidos em horas: "12,5 h". */
export const formatHours = (seconds: number) => `${(seconds / 3600).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;

/** Valor de uma métrica; short = rótulo do eixo ("1,2 mil", "R$ 1,2 mil"). */
export function formatMetric(kind: MetricKind, value: number, short = false) {
  if (kind === "brl") return short ? `R$ ${compact.format(value)}` : formatCents(Math.round(value * 100));
  if (kind === "hours") return short ? compact.format(value) : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
  return short ? compact.format(value) : formatCount(value);
}

/**
 * Variação contra o período anterior: ↑ 12% (verde) ou ↓ 5% (vermelho), sempre com seta e texto (nunca
 * só a cor). upIsGood = false para custos (subir é ruim).
 */
export function Delta({ current, previous, upIsGood = true, className = "" }: { current: number; previous: number; upIsGood?: boolean; className?: string }) {
  if (previous === 0) {
    return <span className={`block text-xs text-muted ${className}`}>{current === 0 ? "Sem dados ainda" : "Novo no período"}</span>;
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(change) < 0.5) return <span className={`block text-xs text-muted ${className}`}>Igual ao período anterior</span>;
  const up = change > 0;
  const good = up === upIsGood;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${good ? "text-emerald-300" : "text-ember"} ${className}`}>
      <Icon name={up ? "chevron-up" : "chevron-down"} size={14} />
      {Math.abs(change).toLocaleString("pt-BR", { maximumFractionDigits: Math.abs(change) < 10 ? 1 : 0 })}%
      <span className="sr-only">{up ? "a mais" : "a menos"} que no período anterior</span>
    </span>
  );
}
