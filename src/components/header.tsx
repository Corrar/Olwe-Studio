"use client";

import { Suspense, useSyncExternalStore } from "react";
import { Logo } from "./logo";
import { NavLinks, NavMenu } from "./nav-links";
import { ProfileMenu, type ProfileSummary } from "./profile-menu";
import { SearchBox, SearchBoxFallback } from "./search-box";

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}
const isScrolled = () => window.scrollY > 8;

// Com a busca aberta no celular, o nome do logo e o selo "Infantil" saem para o campo caber.
const HIDE_WHEN_SEARCHING = "max-sm:group-has-[[data-search-open]]/header:hidden";

/**
 * Cabeçalho fixo: transparente sobre o destaque no topo e sólido (com sombra) depois de rolar. Links
 * no desktop, menu "Navegar" em tablets e só logo, busca e avatar no celular (as abas ficam embaixo).
 */
export function Header({ profile, profiles }: { profile: Omit<ProfileSummary, "locked">; profiles: ProfileSummary[] }) {
  const scrolled = useSyncExternalStore(subscribe, isScrolled, () => false);

  return (
    <header
      className={`group/header pt-safe fixed inset-x-0 top-0 z-40 transition-[backdrop-filter] duration-500 ${scrolled ? "backdrop-blur-md" : ""}`}
      // Fica parado durante as transições de página (só o conteúdo troca).
      style={{ viewTransitionName: "olwe-header" }}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-linear-to-b from-ink/85 via-ink/45 to-transparent transition-opacity duration-500 ${scrolled ? "opacity-0" : ""}`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-ink/90 shadow-lg shadow-black/40 transition-opacity duration-500 ${scrolled ? "" : "opacity-0"}`}
      />

      <div className="gutter relative flex h-16 items-center gap-2 sm:gap-5 lg:gap-6 xl:gap-8">
        <div className="flex shrink-0 items-center gap-2">
          <Logo href="/browse" wordmarkClassName={HIDE_WHEN_SEARCHING} />
          {profile.isKids && (
            <span className={`rounded-full bg-amber/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber ring-1 ring-inset ring-amber/30 ${HIDE_WHEN_SEARCHING}`}>
              Infantil
            </span>
          )}
        </div>
        <NavMenu />
        <NavLinks />
        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3 max-sm:group-has-[[data-search-open]]/header:flex-1">
          <Suspense fallback={<SearchBoxFallback />}>
            <SearchBox />
          </Suspense>
          <ProfileMenu profile={profile} others={profiles.filter((p) => p.id !== profile.id)} />
        </div>
      </div>
    </header>
  );
}
