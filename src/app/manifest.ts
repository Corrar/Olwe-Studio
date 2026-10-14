import type { MetadataRoute } from "next";

// Permite instalar o Olwe como app no celular, tablet, computador e TV.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Olwe",
    short_name: "Olwe",
    description: "Filmes e séries grátis, ou sem anúncios no Premium.",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#08090d",
    theme_color: "#08090d",
    categories: ["entertainment"],
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
