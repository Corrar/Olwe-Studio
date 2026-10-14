import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { PAGE_TOP } from "@/components/catalog-page";
import { db } from "@/db";
import { licensedTitles } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { DeleteTitleButton, TitleForm } from "../title-form";
import { GENRE_OPTIONS, valuesOf } from "../values";

export const metadata: Metadata = { title: "Editar filme licenciado" };

export default async function EditLicensedTitlePage({ params }: PageProps<"/admin/titles/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const row = await db.query.licensedTitles.findFirst({ where: eq(licensedTitles.id, id) });
  if (!row) notFound();
  return (
    <div className={`gutter mx-auto max-w-3xl pb-12 ${PAGE_TOP}`}>
      <Link href="/admin/titles" className="inline-flex min-h-9 items-center text-sm text-muted transition hover:text-amber">
        ← Catálogo licenciado
      </Link>
      <div className="mb-6 mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight">{row.title}</h1>
        <Link href={`/title/licensed/${row.id}`} className="text-sm font-semibold text-amber underline-offset-4 hover:underline">
          Ver no app
        </Link>
      </div>
      <TitleForm values={valuesOf(row)} genres={GENRE_OPTIONS} />
      <div className="mt-10 border-t border-line pt-6">
        <DeleteTitleButton id={row.id} title={row.title} />
      </div>
    </div>
  );
}
