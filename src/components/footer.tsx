import { LogoMark } from "./logo";

export function Footer({ demo }: { demo?: boolean }) {
  return (
    <footer className="mt-16 border-t border-line px-4 py-10 text-sm text-muted sm:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <LogoMark size={20} />
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
