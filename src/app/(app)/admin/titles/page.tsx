import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { PAGE_TOP } from "@/components/catalog-page";
import { Icon } from "@/components/icons";
import { db } from "@/db";
import { licensedTitles, type LicensedTitle } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { dateLabel } from "@/lib/billing";
import { ratingLabel, isAgeRating } from "@/lib/classification";

export const metadata: Metadata = { title: "Catálogo licenciado" };

const DAY = 24 * 60 * 60 * 1000;

/** Situação do filme agora: no ar, rascunho, agendado ou com a licença vencida. */
function statusOf(row: LicensedTitle, now: number) {
  if (!row.published) return { label: "Rascunho", tone: "bg-white/10 text-muted" };
  if (row.licenseStart && row.licenseStart.getTime() > now) return { label: `Entra em ${dateLabel(row.licenseStart)}`, tone: "bg-sky-400/15 text-sky-300" };
  if (row.licenseEnd && row.licenseEnd.getTime() <= now) return { label: "Licença vencida", tone: "bg-ember/15 text-ember" };
  return { label: "No ar", tone: "bg-emerald-400/15 text-emerald-300" };
}

/** Momento da consulta e licenças no ar que vencem nos próximos 30 dias. */
function licenseSnapshot(rows: LicensedTitle[]) {
  const now = Date.now();
  const expiring = rows.filter((r) => r.published && r.licenseEnd && r.licenseEnd.getTime() > now && r.licenseEnd.getTime() - now < 30 * DAY);
  return { now, expiring };
}

export default async function LicensedTitlesPage({ searchParams }: PageProps<"/admin/titles">) {
  await requireAdmin();
  const { saved, deleted } = await searchParams;
  const rows = await db.query.licensedTitles.findMany({ orderBy: desc(licensedTitles.updatedAt) });
  const { now, expiring } = licenseSnapshot(rows);

  return (
    <div className={`gutter mx-auto max-w-5xl pb-12 ${PAGE_TOP}`}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Catálogo licenciado</h1>
          <p className="mt-1 text-muted">Filmes com licença própria do Olwe: contratos, autorizações de autores e licenças abertas.</p>
        </div>
        <Link href="/admin/titles/new" className="bg-brand inline-flex min-h-11 items-center gap-2 rounded-full px-5 font-semibold text-ink transition hover:brightness-110">
          <Icon name="plus" size={18} />
          Novo filme
        </Link>
      </div>

      {(saved || deleted) && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-amber/10 px-4 py-3 text-sm text-amber">
          <Icon name="check" size={16} />
          {saved ? "Filme salvo." : "Filme excluído."}
        </p>
      )}
      {expiring.length > 0 && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-xl bg-ember/10 px-4 py-3 text-sm text-ember">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
          {expiring.length === 1 ? "1 licença vence" : `${expiring.length} licenças vencem`} nos próximos 30 dias:{" "}
          {expiring.map((r) => r.title).join(", ")}.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center">
          <Icon name="film" size={36} className="mx-auto text-muted" />
          <p className="mt-3 font-semibold">Nenhum filme cadastrado ainda</p>
          <p className="mt-1 text-sm text-muted">Cadastre o primeiro filme licenciado e ele aparece no Início e em Filmes completos.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {rows.map((r) => {
            const status = statusOf(r, now);
            return (
              <li key={r.id}>
                <Link href={`/admin/titles/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 transition hover:bg-white/[0.04] sm:px-5">
                  <div className="min-w-0 flex-1 basis-60">
                    <p className="truncate font-semibold">
                      {r.title} {r.year && <span className="font-normal text-muted">({r.year})</span>}
                    </p>
                    <p className="truncate text-sm text-muted">
                      {r.licensor} · {r.licenseName}
                      {r.licenseEnd ? ` · até ${dateLabel(new Date(r.licenseEnd.getTime() - DAY))}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs">{r.videoKind === "youtube" ? "YouTube" : "Arquivo"}</span>
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs">{r.tier === "premium" ? "Só Premium" : "Grátis + Premium"}</span>
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs">{isAgeRating(r.ageRating) ? ratingLabel(r.ageRating) : "?"}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.tone}`}>{status.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
