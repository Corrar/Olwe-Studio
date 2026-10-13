"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/browse", label: "Início" },
  { href: "/free", label: "Filmes completos" },
  { href: "/movies", label: "Filmes" },
  { href: "/series", label: "Séries" },
  { href: "/my-list", label: "Minha Lista" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="hidden gap-1 md:flex" aria-label="Principal">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-sm transition ${active ? "bg-white/10 font-semibold text-text" : "text-muted hover:text-text"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-ink/95 backdrop-blur md:hidden" aria-label="Principal">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`flex-1 py-3 text-center text-xs ${pathname === l.href ? "font-semibold text-amber" : "text-muted"}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
