import type { Metadata } from "next";
import { CatalogPage } from "@/components/catalog-page";

export const metadata: Metadata = { title: "Séries" };

export default async function SeriesPage({ searchParams }: PageProps<"/series">) {
  const { genre } = await searchParams;
  return <CatalogPage type="tv" genre={genre} />;
}
