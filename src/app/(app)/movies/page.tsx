import type { Metadata } from "next";
import { CatalogPage } from "@/components/catalog-page";

export const metadata: Metadata = { title: "Filmes" };

export default async function MoviesPage({ searchParams }: PageProps<"/movies">) {
  const { genre } = await searchParams;
  return <CatalogPage type="movie" genre={genre} />;
}
