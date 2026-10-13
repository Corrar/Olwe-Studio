import Link from "next/link";
import { logout } from "@/app/actions/auth";
import type { Profile } from "@/db/schema";
import { Avatar } from "./avatar";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { SearchBox } from "./search-box";

export function Header({ profile }: { profile: Profile }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-ink via-ink/80 to-transparent">
      <div className="flex h-16 items-center gap-6 px-4 sm:px-10">
        <Logo href="/browse" />
        <NavLinks />
        <div className="ml-auto flex items-center gap-3">
          <SearchBox />
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl p-1 hover:bg-white/10" aria-label="Menu do perfil">
              <Avatar avatar={profile.avatar} name={profile.name} size={34} />
            </summary>
            <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
              <p className="border-b border-line px-4 py-3 text-sm font-semibold">{profile.name}</p>
              <Link href="/profiles" className="block px-4 py-2.5 text-sm hover:bg-surface-2">
                Trocar perfil
              </Link>
              <Link href="/account" className="block px-4 py-2.5 text-sm hover:bg-surface-2">
                Conta
              </Link>
              <form action={logout}>
                <button className="w-full px-4 py-2.5 text-left text-sm text-muted hover:bg-surface-2 hover:text-text">Sair</button>
              </form>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
