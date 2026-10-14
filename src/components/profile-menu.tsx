"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { logout } from "@/app/actions/auth";
import { leaveProfile, selectProfile } from "@/app/actions/profiles";
import { Avatar } from "./avatar";
import { Icon, type IconName } from "./icons";

/** Perfil da conta como o cabeçalho recebe (nunca com o hash do PIN). */
export type ProfileSummary = { id: string; name: string; avatar: string; isKids: boolean; locked: boolean };

const itemsIn = (panel: HTMLElement | null) => [...(panel?.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)") ?? [])];

/**
 * Menu suspenso acessível (perfil e "Navegar"): setas, Home/End, Esc devolve o foco ao botão, clique fora
 * ou foco saindo (Tab) fecha, e fecha sozinho ao trocar de página.
 */
export function useDropdown() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusFirst = useRef(true);
  const id = useId();

  const pathname = usePathname();
  const [seenPath, setSeenPath] = useState(pathname);
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const list = itemsIn(panelRef.current);
    (focusFirst.current ? list[0] : list.at(-1))?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    if (!open) {
      if (e.target !== buttonRef.current || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
      e.preventDefault();
      focusFirst.current = e.key === "ArrowDown";
      setOpen(true);
      return;
    }
    const list = itemsIn(panelRef.current);
    const current = list.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : (current + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length;
    e.preventDefault();
    list[next]?.focus();
  }

  return {
    open,
    close: () => setOpen(false),
    rootProps: {
      ref: rootRef,
      onKeyDown,
      // Tab para fora do menu: fecha depois que o foco já mudou de lugar.
      onBlur: (e: FocusEvent) => {
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      },
    },
    buttonProps: {
      ref: buttonRef,
      type: "button" as const,
      "aria-expanded": open,
      "aria-controls": open ? id : undefined,
      onClick: () => {
        focusFirst.current = true;
        setOpen((v) => !v);
      },
    },
    panelProps: { ref: panelRef, id },
  };
}

const ITEM =
  "flex w-full items-center gap-3 px-4 py-3 text-left sm:py-2.5 text-sm text-text/90 outline-none transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.08] focus-visible:text-text";

function MenuLink({ href, icon, children, onSelect }: { href: string; icon: IconName; children: string; onSelect: () => void }) {
  return (
    <Link href={href} role="menuitem" className={ITEM} onClick={onSelect}>
      <Icon name={icon} size={18} className="text-muted" />
      {children}
    </Link>
  );
}

/** Avatar do perfil no cabeçalho: troca de perfil, gerenciamento, conta e saída, como na Netflix. */
export function ProfileMenu({ profile, others }: { profile: Omit<ProfileSummary, "locked">; others: ProfileSummary[] }) {
  const menu = useDropdown();

  // Entrou em outro perfil pelo menu: o cabeçalho continua montado, então o menu fecha aqui.
  const [seenProfile, setSeenProfile] = useState(profile.id);
  if (profile.id !== seenProfile) {
    setSeenProfile(profile.id);
    menu.close();
  }

  return (
    <div className="relative" {...menu.rootProps}>
      <button
        {...menu.buttonProps}
        aria-label="Menu do perfil"
        aria-haspopup="menu"
        className="group flex items-center gap-1.5 rounded-lg p-1 transition-colors hover:bg-white/10"
      >
        <span className="rounded-md ring-2 ring-transparent transition group-hover:ring-white/40">
          <Avatar avatar={profile.avatar} name={profile.name} size={32} />
        </span>
        <Icon
          name="chevron-down"
          size={16}
          className={`hidden text-text/80 transition-transform duration-300 ease-out-expo sm:block ${menu.open ? "rotate-180" : ""}`}
        />
      </button>

      {menu.open && (
        <div className="absolute right-0 top-full mt-2 max-h-[calc(100dvh-4.5rem-env(safe-area-inset-top))] w-64 origin-top-right animate-scale-in overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface shadow-2xl shadow-black/60">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <Avatar avatar={profile.avatar} name={profile.name} size={36} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{profile.name}</p>
              <p className="text-xs text-muted">{profile.isKids ? "Perfil infantil" : "Perfil atual"}</p>
            </div>
          </div>

          <div {...menu.panelProps} role="menu" aria-label="Opções do perfil" className="py-1.5">
            {others.length > 0 && (
              <div role="group" aria-label="Trocar para" className="border-b border-line pb-1.5">
                {others.map((p) => (
                  <form key={p.id} role="none" action={selectProfile.bind(null, p.id)} data-intro-next>
                    <button role="menuitem" className={ITEM}>
                      <Avatar avatar={p.avatar} name={p.name} size={26} />
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      {p.locked && <Icon name="lock" size={15} className="text-muted" title="Perfil bloqueado" />}
                      {p.isKids && <span className="text-[0.6875rem] font-semibold text-amber">Infantil</span>}
                    </button>
                  </form>
                ))}
              </div>
            )}
            <div role="none" className="pt-1.5">
              {!profile.isKids && (
                <MenuLink href="/profiles/manage" icon="pencil" onSelect={menu.close}>
                  Gerenciar perfis
                </MenuLink>
              )}
              <MenuLink href="/account" icon="user" onSelect={menu.close}>
                Conta
              </MenuLink>
              <form role="none" action={leaveProfile}>
                <button role="menuitem" className={ITEM}>
                  <Icon name="users" size={18} className="text-muted" />
                  Trocar perfil
                </button>
              </form>
            </div>
            <div role="separator" className="my-1.5 h-px bg-line" />
            <form role="none" action={logout}>
              <button role="menuitem" className={`${ITEM} text-muted`}>
                <Icon name="logout" size={18} />
                Sair
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
