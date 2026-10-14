import type { Metadata } from "next";
import Link from "next/link";
import { PAGE_TOP } from "@/components/catalog-page";
import { requireAdmin } from "@/lib/admin";
import { TitleForm } from "../title-form";
import { EMPTY_VALUES, GENRE_OPTIONS } from "../values";

export const metadata: Metadata = { title: "Novo filme licenciado" };

export default async function NewLicensedTitlePage() {
  await requireAdmin();
  return (
    <div className={`gutter mx-auto max-w-3xl pb-12 ${PAGE_TOP}`}>
      <Link href="/admin/titles" className="inline-flex min-h-9 items-center text-sm text-muted transition hover:text-amber">
        ← Catálogo licenciado
      </Link>
      <h1 className="mb-6 mt-1 font-display text-3xl font-bold tracking-tight">Novo filme</h1>
      <TitleForm values={EMPTY_VALUES} genres={GENRE_OPTIONS} />
    </div>
  );
}
