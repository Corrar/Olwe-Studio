import type { Metadata } from "next";
import { CatalogPage } from "@/components/catalog-page";

export const metadata: Metadata = { title: "Séries" };

export default function SeriesPage() {
  return (
    <CatalogPage
      type="tv"
      genres={[
        [80, "Crime"],
        [18, "Drama"],
        [35, "Comédia"],
        [10765, "Ficção científica e fantasia"],
        [10759, "Ação e aventura"],
        [99, "Documentais"],
      ]}
    />
  );
}
