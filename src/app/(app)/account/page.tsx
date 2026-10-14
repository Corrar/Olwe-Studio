import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { eq } from "drizzle-orm";
import { logout } from "@/app/actions/auth";
import { Avatar } from "@/components/avatar";
import { PAGE_TOP } from "@/components/catalog-page";
import { Icon, type IconName } from "@/components/icons";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { MAX_PROFILES } from "@/lib/avatars";
import { clampLimit, limitLabel } from "@/lib/classification";
import { requireProfile, requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Conta" };

type SectionProps = { id: string; icon: IconName; title: string; order: number; action?: ReactNode; children: ReactNode };

/** Bloco da conta; entra subindo, um depois do outro (order). */
function Section({ id, icon, title, order, action, children }: SectionProps) {
  return (
    <section
      aria-labelledby={id}
      className="animate-fade-up rounded-2xl border border-line bg-surface p-5 sm:p-6"
      style={{ animationDelay: `${order * 70}ms` }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="flex items-center gap-3 font-display text-lg font-semibold">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/[0.06] text-amber">
            <Icon name={icon} size={18} />
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const PILL_LINK =
  "inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold transition-colors hover:bg-white/20";

export default async function AccountPage() {
  const user = await requireUser();
  const current = await requireProfile();
  const list = await db.query.profiles.findMany({
    where: eq(profiles.userId, user.id),
    orderBy: profiles.createdAt,
    columns: { id: true, name: true, avatar: true, isKids: true, maxRating: true, pinHash: true },
  });

  return (
    <div className={`gutter mx-auto max-w-3xl pb-12 ${PAGE_TOP}`}>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Conta</h1>
      <p className="mt-1 mb-8 text-muted">Seu plano, seu acesso e os perfis da casa.</p>

      <div className="space-y-4 sm:space-y-5">
        <Section id="plano" icon="sparkles" title="Plano" order={0}>
          <p className="text-lg font-semibold">
            Olwe completo · <span className="text-gradient">sem anúncios</span>
          </p>
          <ul className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
            {[`Até ${MAX_PROFILES} perfis na mesma conta`, "Nenhum anúncio, nunca", "Filmes completos em HD sem custo", "Continue de onde parou"].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Icon name="check" size={16} className="shrink-0 text-amber" />
                {f}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="acesso" icon="mail" title="E-mail" order={1}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted">E-mail</dt>
              <dd className="mt-0.5 flex flex-wrap items-center gap-2 break-all">
                {user.email}
                {user.emailVerifiedAt && (
                  <span className="rounded-full bg-amber/15 px-2 py-0.5 text-xs font-semibold text-amber">✓ Confirmado</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Nome</dt>
              <dd className="mt-0.5">{user.name}</dd>
            </div>
          </dl>
        </Section>

        <Section
          id="perfis"
          icon="users"
          title="Perfis e controle parental"
          order={2}
          action={
            // Perfis infantis não gerenciam perfis.
            !current.isKids && (
              <Link href="/profiles/manage" className={PILL_LINK}>
                <Icon name="pencil" size={16} />
                Gerenciar perfis
              </Link>
            )
          }
        >
          <ul className="divide-y divide-line">
            {list.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 sm:gap-4">
                <Avatar avatar={p.avatar} name={p.name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 font-semibold">
                    <span className="truncate">{p.name}</span>
                    {p.id === current.id && <span className="text-xs font-normal text-muted">(perfil atual)</span>}
                    {p.isKids && <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[0.6875rem] text-amber">Infantil</span>}
                  </p>
                  <p className="text-sm text-muted">{limitLabel(clampLimit(p.maxRating, p.isKids))}</p>
                </div>
                <span className={`flex shrink-0 items-center gap-1.5 text-xs ${p.pinHash ? "text-text" : "text-muted"}`}>
                  <Icon name={p.pinHash ? "lock" : "unlock"} size={16} className={p.pinHash ? "text-amber" : ""} />
                  <span className="max-sm:sr-only">{p.pinHash ? "Bloqueado com PIN" : "Sem bloqueio"}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/60 p-5 sm:p-6">
          <p className="text-sm text-muted">Sair desconecta a conta deste aparelho.</p>
          <form action={logout}>
            <button className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-5 text-sm font-semibold transition-colors hover:border-text">
              <Icon name="logout" size={16} />
              Sair da conta
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
