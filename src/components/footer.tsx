import Link from "next/link";
import { LogoMark } from "./logo";

const columns = (kids?: boolean) => [
  {
    title: "Navegar",
    links: [
      { href: "/browse", label: "Início" },
      { href: "/new", label: "Novidades" },
      { href: "/movies", label: "Filmes" },
      { href: "/series", label: "Séries" },
      { href: "/free", label: "Filmes completos" },
      { href: "/my-list", label: "Minha Lista" },
    ],
  },
  {
    title: "Ajuda",
    links: [
      { href: "/account", label: "Conta e plano" },
      // Perfis infantis não gerenciam perfis.
      ...(kids ? [] : [{ href: "/profiles/manage", label: "Perfis e controle parental" }]),
      { href: "/profiles", label: "Trocar de perfil" },
      { href: "/search", label: "Buscar títulos" },
    ],
  },
];

/**
 * Rodapé. Dentro do app (app) traz a navegação e a ajuda e deixa espaço para a barra de abas do
 * celular, que fica por cima do fim da página.
 */
export function Footer({ demo, app, kids }: { demo?: boolean; app?: boolean; kids?: boolean }) {
  return (
    <footer
      className={`gutter mt-16 border-t border-line pt-10 text-sm text-muted ${
        app ? "pb-[calc(2.5rem+var(--tab-bar-h)+env(safe-area-inset-bottom))]" : "pb-[calc(2.5rem+env(safe-area-inset-bottom))]"
      }`}
    >
      {app && (
        <div className="mb-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          <div className="col-span-2 max-w-xs sm:col-span-1 lg:col-span-2">
            <Link href="/browse" className="inline-flex items-center gap-2 rounded-lg text-text">
              <LogoMark size={24} />
              <span className="font-display text-lg font-semibold lowercase tracking-tight">olwe</span>
            </Link>
            <p className="mt-3 text-pretty">
              Filmes e séries sem anúncios. Filmes completos só de acervos com licença aberta; nos outros títulos, sinopse e trailer.
            </p>
          </div>
          {columns(kids).map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-widest text-text/80">{col.title}</h2>
              <ul className="space-y-1">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="inline-block rounded py-1 transition-colors hover:text-text">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      )}
      <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${app ? "border-t border-line/60 pt-6" : ""}`}>
        <div className="flex items-center gap-2">
          {!app && <LogoMark size={20} />}
          <span>© {new Date().getFullYear()} Olwe Studio · Sem anúncios, sempre.</span>
        </div>
        <p className="max-w-md text-xs">
          {demo
            ? "Catálogo de demonstração com títulos fictícios. Defina TMDB_API_KEY para usar dados reais."
            : "Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB."}
        </p>
      </div>
    </footer>
  );
}
