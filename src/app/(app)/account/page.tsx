import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Conta" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-2xl px-4 pt-24">
      <h1 className="mb-6 font-display text-2xl font-semibold">Conta</h1>
      <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
        <div className="p-5">
          <p className="text-sm text-muted">Nome</p>
          <p>{user.name}</p>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted">E-mail</p>
          <p className="flex flex-wrap items-center gap-2">
            {user.email}
            {user.emailVerifiedAt && <span className="rounded-full bg-amber/15 px-2 py-0.5 text-xs text-amber">✓ Confirmado</span>}
          </p>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted">Plano</p>
          <p>
            Olwe completo · <span className="text-amber">sem anúncios</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3 p-5">
          <Link href="/profiles/manage" className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold hover:bg-white/20">
            Gerenciar perfis
          </Link>
          <form action={logout}>
            <button className="rounded-full px-5 py-2 text-sm text-muted hover:text-text">Sair da conta</button>
          </form>
        </div>
      </div>
    </div>
  );
}
