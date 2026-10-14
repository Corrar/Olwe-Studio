import { LoadingNote, PAGE_TOP, RowSkeleton } from "@/components/catalog-page";
import { Icon, type IconName } from "@/components/icons";

// O cabeçalho e o esqueleto do "Em breve" ficam aqui e a página os reaproveita: o carregamento tem
// exatamente o mesmo layout.

type Shortcut = { href: string; label: string; icon: IconName };

const SHORTCUTS: Shortcut[] = [
  { href: "#em-breve", label: "Em breve", icon: "calendar" },
  { href: "#top-filmes", label: "Top 10 filmes", icon: "trophy" },
  { href: "#top-series", label: "Top 10 séries", icon: "trophy" },
  { href: "#nos-cinemas", label: "Nos cinemas", icon: "film" },
];

export function UpcomingSkeleton() {
  return (
    <div aria-hidden="true" className="gutter">
      <div className="mb-4 flex h-6 items-center sm:h-7">
        <div className="skeleton h-4 w-36 rounded-md sm:h-5" />
      </div>
      <div className="grid gap-x-10 gap-y-10 lg:grid-cols-2 xl:grid-cols-3 4xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex gap-3 sm:gap-5">
            <div className="w-11 shrink-0 space-y-1.5 pt-0.5 sm:w-14">
              <div className="skeleton mx-auto h-3 w-8 rounded" />
              <div className="skeleton mx-auto h-8 w-10 rounded-md" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="skeleton aspect-video rounded-xl" />
              <div className="skeleton mt-3 h-7 w-2/3 rounded-md" />
              <div className="skeleton mt-1 h-5 w-44 rounded" />
              <div className="skeleton mt-1 h-4 w-28 rounded" />
              <div className="skeleton mt-2 h-[3.75rem] w-full rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NewsHeader({ kids }: { kids?: boolean }) {
  const shortcuts = kids ? SHORTCUTS.slice(0, 3) : SHORTCUTS;
  return (
    <div className="gutter">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Novidades</h1>
      <nav aria-label="Seções de Novidades" className="-mx-[var(--gutter)] mt-4">
        <ul className="no-scrollbar flex gap-2 overflow-x-auto px-[var(--gutter)] py-1">
          {shortcuts.map((s) => (
            <li key={s.href}>
              <a
                href={s.href}
                className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 bg-surface/60 px-3.5 text-sm font-medium transition hover:border-white/60 hover:bg-white/10"
              >
                <Icon name={s.icon} size={16} className="text-amber" />
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export default function NewLoading() {
  return (
    <div className={`pb-12 ${PAGE_TOP}`}>
      <LoadingNote />
      <NewsHeader />
      <div className="mt-8 space-y-12 sm:mt-10 3xl:space-y-14">
        <UpcomingSkeleton />
        <RowSkeleton top10 />
      </div>
    </div>
  );
}
