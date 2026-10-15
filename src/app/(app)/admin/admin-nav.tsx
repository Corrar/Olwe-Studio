import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";

const TABS: { key: "dashboard" | "titles"; href: string; label: string; icon: IconName }[] = [
  { key: "dashboard", href: "/admin", label: "Painel", icon: "gauge" },
  { key: "titles", href: "/admin/titles", label: "Catálogo licenciado", icon: "film" },
];

/** Abas da administração. */
export function AdminNav({ current }: { current: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="Administração" className="no-scrollbar mb-6 flex max-w-full gap-1 overflow-x-auto">
      {TABS.map((tab) => {
        const active = tab.key === current;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
              active ? "bg-text text-ink" : "bg-white/[0.06] text-text/80 hover:bg-white/10 hover:text-text"
            }`}
          >
            <Icon name={tab.icon} size={16} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
