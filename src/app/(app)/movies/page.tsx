import type { Metadata } from "next";
import { CatalogPage } from "@/components/catalog-page";

export const metadata: Metadata = { title: "Filmes" };

export default function MoviesPage() {
  return (
    <CatalogPage
      type="movie"
      genres={[
        [28, "Ação"],
        [35, "Comédia"],
        [18, "Drama"],
        [878, "Ficção científica"],
        [27, "Terror"],
        [16, "Animação"],
        [99, "Documentários"],
      ]}
    />
  );
}
