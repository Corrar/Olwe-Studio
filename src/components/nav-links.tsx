"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition } from "react";
import { Icon, type IconName } from "./icons";
import { useDropdown } from "./profile-menu";

type NavItem = { href: string; label: string; icon: IconName };

const LINKS: NavItem[] = [
  { href: "/browse", label: "Início", icon: "home" },
  { href: "/new", label: "Novidades", icon: "sparkles" },
  { href: "/movies", label: "Filmes", icon: "film" },
  { href: "/series", label: "Séries", icon: "tv" },
  { href: "/free", label: "Filmes completos", icon: "monitor" },
  { href: "/my-list", label: "Minha Lista", icon: "list" },
];

// Barra de abas do celular: a busca entra no lugar de Filmes e Séries (que ficam a um toque, no Início).
const TABS: NavItem[] = [
  { href: "/browse", label: "Início", icon: "home" },
  { href: "/new", label: "Novidades", icon: "sparkles" },
  { href: "/search", label: "Buscar", icon: "search" },
  { href: "/free", label: "Grátis", icon: "film" },
  { href: "/my-list", label: "Minha Lista", icon: "list" },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/**
 * Indicador da seção atual. Ao navegar, o mesmo nome nas duas páginas faz o navegador deslizá-lo
 * do link antigo para o novo (View Transitions); sem suporte, ele só troca de lugar.
 */
function Indicator({ name, className }: { name: string; className: string }) {
  return (
    <ViewTransition name={name} share="auto" default="none">
      <span aria-hidden="true" className={className} />
    </ViewTransition>
  );
}

/** Links do cabeçalho em telas largas (lg em diante). */
export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="hidden lg:block">
      <ul className="flex items-center xl:gap-1">
        {LINKS.map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`relative block whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-200 xl:px-3 ${
                  active ? "text-text" : "text-text/70 hover:text-text"
                }`}
              >
                {l.label}
                {active && <Indicator name="olwe-nav-indicator" className="bg-brand absolute inset-x-2.5 bottom-0.5 h-0.5 rounded-full xl:inset-x-3" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Tablets e notebooks pequenos (md até lg): as seções num menu "Navegar". */
export function NavMenu() {
  const pathname = usePathname();
  const menu = useDropdown();
  return (
    <nav aria-label="Principal" className="hidden md:block lg:hidden">
      <div className="relative" {...menu.rootProps}>
        <button
          {...menu.buttonProps}
          className="flex items-center gap-1 rounded-md px-2 py-2 text-sm font-semibold text-text/90 transition-colors hover:text-text"
        >
          Navegar
          <Icon name="chevron-down" size={16} className={`transition-transform duration-300 ease-out-expo ${menu.open ? "rotate-180" : ""}`} />
        </button>
        {menu.open && (
          <div
            {...menu.panelProps}
            className="absolute left-0 top-full mt-2 w-60 origin-top-left animate-scale-in overflow-hidden rounded-xl border border-line bg-surface py-1.5 shadow-2xl shadow-black/60"
          >
            <ul>
              {LINKS.map((l) => {
                const active = isActive(pathname, l.href);
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      aria-current={active ? "page" : undefined}
                      onClick={menu.close}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm outline-none transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.08] ${
                        active ? "font-semibold text-text" : "text-text/80"
                      }`}
                    >
                      <Icon name={l.icon} size={18} className={active ? "text-amber" : "text-muted"} />
                      {l.label}
                      {active && <span aria-hidden="true" className="bg-brand ml-auto size-1.5 rounded-full" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}

/** Barra de abas fixa no rodapé do celular (abaixo de md), acima da área de gestos. */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink/90 pb-safe pl-safe pr-safe backdrop-blur-lg md:hidden"
      // Fica parada durante as transições de página (só o conteúdo troca).
      style={{ viewTransitionName: "olwe-tab-bar" }}
    >
      <ul className="flex h-[var(--tab-bar-h)]">
        {TABS.map((t) => {
          const active = isActive(pathname, t.href);
          return (
            <li key={t.href} className="min-w-0 flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`group flex h-full flex-col items-center justify-center gap-1 rounded-lg text-[0.6875rem] font-medium leading-none transition-colors duration-200 ${
                  active ? "text-text" : "text-muted"
                }`}
              >
                <span className="relative flex h-7 w-12 items-center justify-center">
                  {active && <Indicator name="olwe-tab-indicator" className="absolute inset-0 rounded-full bg-white/[0.12]" />}
                  <Icon
                    name={t.icon}
                    size={22}
                    className={`relative transition-transform duration-300 ease-out-expo group-active:scale-90 ${active ? "text-amber" : ""}`}
                  />
                </span>
                <span className="max-w-full truncate px-0.5">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
