import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PAGE_TOP } from "@/components/catalog-page";
import { Icon, type IconName } from "@/components/icons";
import { requireAdmin } from "@/lib/admin";
import { DEFAULT_PERIOD, getDashboard, parsePeriod, PERIODS, type Period } from "@/lib/analytics";
import { dateLabel } from "@/lib/billing";
import { centsInput, formatCents } from "@/lib/money";
import { isFullMovie } from "@/lib/types";
import { AdminNav } from "./admin-nav";
import { dayLabel, Delta, formatCount, formatHours } from "./format";
import { SettingsForm } from "./settings-form";
import { StatsChart, type ChartMetric } from "./stats-chart";

export const metadata: Metadata = { title: "Painel" };

const PERIOD_LABELS: Record<Period, string> = { 7: "7 dias", 28: "28 dias", 90: "90 dias", 365: "12 meses" };
const CARD = "rounded-2xl border border-line bg-surface p-5 sm:p-6";
const TH = "px-4 py-3 font-medium whitespace-nowrap";
const TD = "px-4 py-3 whitespace-nowrap tabular-nums";

function CardTitle({ icon, children, aside }: { icon: IconName; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h2 className="flex items-center gap-2.5 font-display text-lg font-semibold">
        <span className="grid size-8 place-items-center rounded-lg bg-white/[0.06] text-amber">
          <Icon name={icon} size={17} />
        </span>
        {children}
      </h2>
      {aside}
    </div>
  );
}

/** Indicador com valor, variação e uma linha de contexto. */
function Stat({ label, value, delta, note }: { label: string; value: string; delta?: ReactNode; note?: ReactNode }) {
  return (
    <div className={`${CARD} flex min-w-0 flex-col`}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 truncate font-display text-2xl font-semibold sm:text-3xl">{value}</p>
      {delta && <div className="mt-1">{delta}</div>}
      {note && <p className="mt-auto pt-2 text-xs text-muted">{note}</p>}
    </div>
  );
}

/** Linha do resumo financeiro: + entradas, − saídas, = subtotais. */
function Line({ label, cents, sign, note, total }: { label: string; cents: number; sign: "+" | "−" | "="; note?: string; total?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2.5 ${total ? "font-semibold" : ""}`}>
      <dt className="min-w-0">
        <span className={total ? "" : "text-text/85"}>{label}</span>
        {note && <span className="block text-xs font-normal text-muted">{note}</span>}
      </dt>
      <dd className="shrink-0 tabular-nums">
        {sign === "=" ? "" : `${sign} `}
        {formatCents(sign === "=" ? cents : Math.abs(cents))}
      </dd>
    </div>
  );
}

export default async function AdminDashboardPage({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const period = parsePeriod((await searchParams).periodo);
  const d = await getDashboard(period);

  const days = d.points.map((p) => p.day);
  const today = d.points[d.points.length - 1];
  const f = d.finance;
  const loss = f.profitCents < 0;
  const periodLabel = `nos últimos ${PERIOD_LABELS[period]}`;
  const premiumShare = d.audience.totalUsers ? Math.round((d.audience.premiumUsers / d.audience.totalUsers) * 100) : 0;

  const metrics: ChartMetric[] = [
    { key: "views", label: "Visualizações", kind: "count", total: d.totals.views, previous: d.previous.views, values: d.points.map((p) => p.views) },
    {
      key: "watch",
      label: "Tempo de exibição",
      kind: "hours",
      total: d.totals.watchSeconds / 3600,
      previous: d.previous.watchSeconds / 3600,
      values: d.points.map((p) => p.watchSeconds / 3600),
    },
    {
      key: "active",
      label: "Usuários ativos",
      kind: "count",
      total: d.totals.activeUsers,
      previous: d.previous.activeUsers,
      values: d.points.map((p) => p.activeUsers),
    },
    { key: "signups", label: "Novos cadastros", kind: "count", total: d.totals.signups, previous: d.previous.signups, values: d.points.map((p) => p.signups) },
    {
      key: "revenue",
      label: "Receita líquida",
      kind: "brl",
      total: d.totals.netCents / 100,
      previous: d.previous.netCents / 100,
      values: d.points.map((p) => p.netCents / 100),
    },
  ];

  return (
    <div className={`gutter mx-auto max-w-6xl pb-12 ${PAGE_TOP}`}>
      <AdminNav current="dashboard" />

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Painel</h1>
          <p className="mt-1 text-muted">
            {dayLabel(d.range.from, true)} – {dayLabel(d.range.to, true)} · comparado aos {PERIOD_LABELS[period]} anteriores
          </p>
        </div>
      </div>

      {/* Filtro de período: vale para tudo abaixo. */}
      <nav aria-label="Período" className="no-scrollbar mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-white/[0.05] p-1">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={p === DEFAULT_PERIOD ? "/admin" : `/admin?periodo=${p}`}
            scroll={false}
            aria-current={p === period ? "page" : undefined}
            className={`inline-flex min-h-9 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition ${
              p === period ? "bg-text text-ink" : "text-text/75 hover:bg-white/10 hover:text-text"
            }`}
          >
            {PERIOD_LABELS[p]}
          </Link>
        ))}
      </nav>

      {(!d.billing || !d.ads) && (
        <div className="mb-6 space-y-2">
          {!d.billing && (
            <p className="flex items-start gap-2 rounded-xl bg-amber/10 px-4 py-3 text-sm text-amber">
              <Icon name="info" size={16} className="mt-0.5 shrink-0" />
              Os pagamentos do Premium estão desligados (falta MERCADOPAGO_ACCESS_TOKEN na Vercel). A receita de assinaturas aparece aqui assim que
              forem ligados.
            </p>
          )}
          {!d.ads && (
            <p className="flex items-start gap-2 rounded-xl bg-white/[0.05] px-4 py-3 text-sm text-text/80">
              <Icon name="info" size={16} className="mt-0.5 shrink-0 text-muted" />
              Os anúncios do Olwe Grátis estão desligados (falta AD_TAG_URL). Sem eles, a receita vem só do Premium.
            </p>
          )}
        </div>
      )}

      {/* Dinheiro: o lucro em destaque e, ao lado, de onde ele vem. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section aria-labelledby="lucro" className={CARD}>
          <p id="lucro" className="flex items-center gap-2 text-sm text-muted">
            {loss && <Icon name="alert" size={16} className="text-ember" />}
            {loss ? "Prejuízo" : "Lucro"} {periodLabel}
          </p>
          <p className={`mt-1 break-words font-display text-5xl font-bold tracking-tight ${loss ? "text-ember" : ""}`}>{formatCents(f.profitCents)}</p>
          <Delta current={f.profitCents} previous={d.previousFinance.profitCents} className="mt-2" />
          <dl className="mt-5 divide-y divide-line border-t border-line text-sm">
            <Line label="Assinaturas do Premium" note="Pix e cartão, pelo Mercado Pago" cents={f.grossCents} sign="+" />
            <Line label="Tarifas do Mercado Pago" cents={f.feeCents} sign="−" />
            <Line
              label="Anúncios do Olwe Grátis"
              note={
                d.settings.adCpmCents
                  ? `Estimativa: ${formatCount(d.totals.adImpressions)} anúncios × CPM de ${formatCents(d.settings.adCpmCents)}`
                  : `${formatCount(d.totals.adImpressions)} anúncios exibidos · informe o CPM abaixo para estimar`
              }
              cents={f.adCents}
              sign="+"
            />
            <Line label="Receita líquida" cents={f.netCents} sign="=" total />
            <Line label="Licenças dos filmes" note="Detalhes em “Licenças a pagar”, abaixo" cents={f.licenseCents} sign="−" />
            <Line label="Custos fixos" note={`${formatCents(d.settings.fixedCostsCents)} por mês, proporcional ao período`} cents={f.fixedCents} sign="−" />
            <Line label={loss ? "Prejuízo" : "Lucro"} cents={f.profitCents} sign="=" total />
          </dl>
        </section>

        <div className="grid grid-cols-1 gap-4 min-[30rem]:grid-cols-2">
          <Stat
            label="Receita líquida"
            value={formatCents(f.netCents)}
            delta={<Delta current={f.netCents} previous={d.previousFinance.netCents} />}
            note="Assinaturas − tarifas + anúncios"
          />
          <Stat
            label="Licenças a pagar"
            value={formatCents(f.licenseCents)}
            delta={<Delta current={f.licenseCents} previous={d.previousFinance.licenseCents} upIsGood={false} />}
            note={`${d.licenses.length} ${d.licenses.length === 1 ? "filme com custo" : "filmes com custo"}`}
          />
          <Stat
            label="Assinantes Premium"
            value={formatCount(d.audience.premiumUsers)}
            note={`${formatCents(d.audience.mrrCents)} por mês em assinaturas ativas`}
          />
          <Stat
            label="Ativos hoje"
            value={formatCount(today?.activeUsers ?? 0)}
            note={`${formatCount(today?.views ?? 0)} visualizações e ${formatHours(today?.watchSeconds ?? 0)} assistidas hoje`}
          />
        </div>
      </div>

      <div className="mt-6">
        <StatsChart days={days} metrics={metrics} periodLabel={periodLabel} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-labelledby="mais-assistidos" className={`${CARD} min-w-0`}>
          <CardTitle icon="trophy">
            <span id="mais-assistidos">Conteúdo mais assistido</span>
          </CardTitle>
          {d.topTitles.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
              Nenhuma visualização {periodLabel}. Os números aparecem conforme as pessoas assistem.
            </p>
          ) : (
            <div className="-mx-5 overflow-x-auto sm:-mx-6">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr className="border-b border-line">
                    <th scope="col" className={`${TH} pl-5 sm:pl-6`}>
                      Título
                    </th>
                    <th scope="col" className={`${TH} text-right`}>
                      Visualizações
                    </th>
                    <th scope="col" className={`${TH} text-right`}>
                      Tempo de exibição
                    </th>
                    <th scope="col" className={`${TH} pr-5 text-right sm:pr-6`}>
                      Duração média
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {d.topTitles.map((t, i) => (
                    <tr key={`${t.mediaType}-${t.itemId}`}>
                      <td className="max-w-72 py-3 pl-5 pr-4 sm:pl-6">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="w-5 shrink-0 text-right font-display text-sm font-semibold text-muted tabular-nums">{i + 1}</span>
                          <span className="min-w-0">
                            <Link
                              href={`/title/${t.mediaType}/${encodeURIComponent(t.itemId)}`}
                              className="block truncate font-semibold transition hover:text-amber"
                            >
                              {t.title}
                            </Link>
                            <span className="text-xs text-muted">{isFullMovie({ type: t.mediaType }) ? "Filme completo" : "Trailer"}</span>
                          </span>
                        </div>
                      </td>
                      <td className={`${TD} text-right`}>{formatCount(t.views)}</td>
                      <td className={`${TD} text-right`}>{formatHours(t.watchSeconds)}</td>
                      <td className={`${TD} pr-5 text-right sm:pr-6`}>{t.views ? durationLabel(t.watchSeconds / t.views) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="publico" className={`${CARD} min-w-0`}>
          <CardTitle icon="users">
            <span id="publico">Público</span>
          </CardTitle>
          <p className="font-display text-3xl font-semibold">{formatCount(d.audience.totalUsers)}</p>
          <p className="text-sm text-muted">contas no Olwe</p>
          {/* Premium e Grátis: medidor com o trilho num tom mais claro da mesma cor. */}
          <div className="mt-4" aria-hidden="true">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-amber/15">
              <div className="bg-brand rounded-full" style={{ width: `${premiumShare}%` }} />
            </div>
          </div>
          <dl className="mt-3 divide-y divide-line text-sm">
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="flex items-center gap-2">
                <span aria-hidden="true" className="bg-brand size-2.5 rounded-full" />
                Premium
              </dt>
              <dd className="tabular-nums">
                {formatCount(d.audience.premiumUsers)} <span className="text-muted">({premiumShare}%)</span>
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="flex items-center gap-2">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-amber/25" />
                Grátis
              </dt>
              <dd className="tabular-nums">{formatCount(d.audience.totalUsers - d.audience.premiumUsers)}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt>Perfis</dt>
              <dd className="tabular-nums">
                {formatCount(d.audience.profiles)} <span className="text-muted">({formatCount(d.audience.kidsProfiles)} infantis)</span>
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt>Assinaturas ativas no cartão</dt>
              <dd className="tabular-nums">{formatCount(d.audience.cardSubscriptions)}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt>Usuários ativos {periodLabel}</dt>
              <dd className="tabular-nums">{formatCount(d.totals.activeUsers)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section aria-labelledby="licencas" className={`${CARD} mt-6 min-w-0`}>
        <CardTitle
          icon="film"
          aside={
            <Link href="/admin/titles" className="text-sm text-muted transition hover:text-amber">
              Catálogo licenciado →
            </Link>
          }
        >
          <span id="licencas">Licenças a pagar {periodLabel}</span>
        </CardTitle>

        {d.expiring.length > 0 && (
          <p role="status" className="mb-4 flex items-start gap-2 rounded-xl bg-ember/10 px-4 py-3 text-sm text-ember">
            <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
            <span>
              {d.expiring.length === 1 ? "1 licença vence" : `${d.expiring.length} licenças vencem`} nos próximos 30 dias:{" "}
              {d.expiring.map((e) => `${e.title} (${dateLabel(new Date(e.licenseEnd.getTime() - 1))})`).join(", ")}.
            </span>
          </p>
        )}

        {d.licenses.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
            Nenhum filme com custo de licença. Ao editar um filme no{" "}
            <Link href="/admin/titles" className="text-amber underline-offset-4 hover:underline">
              Catálogo licenciado
            </Link>
            , informe quanto a licença custa (valor fixo, por mês, por visualização ou % da receita) e o painel calcula quanto pagar em cada período.
          </p>
        ) : (
          <div className="-mx-5 overflow-x-auto sm:-mx-6">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-line">
                  <th scope="col" className={`${TH} pl-5 sm:pl-6`}>
                    Filme
                  </th>
                  {/* No celular, só o filme (com a condição embaixo) e o valor: o que importa cabe sem rolar. */}
                  <th scope="col" className={`${TH} max-sm:hidden`}>
                    Condição
                  </th>
                  <th scope="col" className={`${TH} text-right max-sm:hidden`}>
                    Visualizações
                  </th>
                  <th scope="col" className={`${TH} text-right max-sm:hidden`}>
                    Tempo de exibição
                  </th>
                  <th scope="col" className={`${TH} pr-5 text-right sm:pr-6`}>
                    A pagar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {d.licenses.map((l) => (
                  <tr key={l.id}>
                    <td className="max-w-72 py-3 pl-5 pr-4 sm:pl-6">
                      <Link href={`/admin/titles/${l.id}`} className="block truncate font-semibold transition hover:text-amber">
                        {l.title}
                      </Link>
                      <span className="block truncate text-xs text-muted">{l.licensor}</span>
                      <span className="block text-xs text-text/80 sm:hidden">{l.terms}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-text/85 max-sm:hidden">{l.terms}</td>
                    <td className={`${TD} text-right max-sm:hidden`}>{formatCount(l.views)}</td>
                    <td className={`${TD} text-right max-sm:hidden`}>{formatHours(l.watchSeconds)}</td>
                    <td className={`${TD} pr-5 text-right font-semibold sm:pr-6`}>{formatCents(l.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line">
                  <th scope="row" className="py-3 pl-5 pr-4 text-left font-semibold sm:pl-6">
                    Total {periodLabel}
                  </th>
                  <td colSpan={3} className="max-sm:hidden" />
                  <td className={`${TD} pr-5 text-right font-semibold sm:pr-6`}>{formatCents(f.licenseCents)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="configuracoes" className={`${CARD} mt-6`}>
        <CardTitle icon="settings">
          <span id="configuracoes">Configurações do painel</span>
        </CardTitle>
        <SettingsForm
          adCpm={d.settings.adCpmCents ? centsInput(d.settings.adCpmCents) : ""}
          fixedCosts={d.settings.fixedCostsCents ? centsInput(d.settings.fixedCostsCents) : ""}
        />
      </section>

      <div className="mt-6 space-y-1.5 text-xs text-muted">
        <p>
          Visualização: pelo menos 30 segundos assistidos, como no YouTube. Usuários ativos: contas que abriram o Olwe no dia. Datas no horário de
          Brasília.
        </p>
        <p>
          Licenças: valor fixo dividido pelos dias da licença (sem data de fim, por 12 meses); por mês, proporcional aos dias do período; % da
          receita sobre a receita líquida dividida pelo tempo assistido de cada filme completo.
        </p>
        <p>As estatísticas de visualização e de uso começam a ser contadas a partir desta versão do Olwe; cadastros e assinantes valem desde o início.</p>
      </div>
    </div>
  );
}

/** Duração média por visualização: "1:42" ou "1:02:03". */
function durationLabel(seconds: number) {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}
