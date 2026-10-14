import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { and, count, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { Logo } from "@/components/logo";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { clampLimit, limitLabel } from "@/lib/classification";
import { getCurrentProfile, requireUser } from "@/lib/dal";
import { DetailsForm } from "./details-form";
import { DeleteForm, LimitForm, LockForm } from "./settings-forms";

export const metadata: Metadata = { title: "Editar perfil" };

const CARD = "animate-fade-up rounded-2xl border border-line bg-surface/80";
// Ícone à esquerda, título e uma linha de contexto empilhados (e a seta, nos blocos que abrem).
const HEAD = "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4";

type HeadingProps = { icon: IconName; title: string; detail: ReactNode; tone?: string };

/** Partes do cabeçalho de cada bloco, dentro de um contêiner HEAD (sem invólucro: o <h2> cabe num <summary>). */
function Heading({ icon, title, detail, tone = "text-amber" }: HeadingProps) {
  return (
    <>
      <span className={`row-span-2 grid size-11 place-items-center rounded-xl bg-white/[0.06] ${tone}`}>
        <Icon name={icon} size={20} />
      </span>
      <h2 className="self-end font-display text-lg font-semibold">{title}</h2>
      <span className="col-start-2 self-start text-sm text-muted">{detail}</span>
    </>
  );
}

/** Bloco que abre e fecha (bloqueio, exclusão): a seta gira e o conteúdo entra subindo. */
function Expandable({ id, open, delay, children, ...heading }: HeadingProps & { id: string; open: boolean; delay: number; children: ReactNode }) {
  return (
    <details id={id} open={open} className={`group ${CARD}`} style={{ animationDelay: `${delay}ms` }}>
      <summary
        className={`${HEAD} cursor-pointer list-none rounded-2xl p-5 transition-colors hover:bg-white/[0.03] sm:p-6 [&::-webkit-details-marker]:hidden`}
      >
        <Heading {...heading} />
        <Icon
          name="chevron-down"
          size={20}
          className="col-start-3 row-span-2 row-start-1 text-muted transition-transform duration-300 ease-out-expo group-open:rotate-180"
        />
      </summary>
      <div className="px-5 pb-5 group-open:animate-fade-up sm:px-6 sm:pb-6">{children}</div>
    </details>
  );
}

export default async function EditProfilePage({ params, searchParams }: PageProps<"/profiles/[id]/edit">) {
  const user = await requireUser();
  // Perfis infantis não gerenciam perfis (como na Netflix).
  if ((await getCurrentProfile())?.isKids) redirect("/profiles");
  const { id } = await params;
  const profile = await db.query.profiles.findFirst({
    where: and(eq(profiles.id, id), eq(profiles.userId, user.id)),
    columns: { id: true, name: true, avatar: true, isKids: true, maxRating: true, pinHash: true },
  });
  if (!profile) notFound();
  const [{ total }] = await db.select({ total: count() }).from(profiles).where(eq(profiles.userId, user.id));
  // "Esqueceu o PIN?" na tela do PIN chega com o bloqueio já aberto.
  const openLock = (await searchParams).secao === "bloqueio";
  const limit = clampLimit(profile.maxRating, profile.isKids);
  const locked = profile.pinHash !== null;

  return (
    <div className="pb-safe relative isolate flex min-h-dvh flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgb(255_106_61/0.14),transparent_70%)]"
      />
      <header className="pt-safe">
        <div className="gutter flex h-16 items-center justify-between gap-4 sm:h-20">
          <Link
            href="/profiles/manage"
            className="-ml-2 inline-flex min-h-10 items-center gap-2 rounded-full pl-2 pr-4 text-sm text-muted transition-colors hover:bg-white/5 hover:text-text"
          >
            <Icon name="arrow-left" size={18} />
            Gerenciar perfis
          </Link>
          <Logo href="/profiles" size={26} />
        </div>
      </header>

      <main className="gutter mx-auto w-full max-w-3xl flex-1 pt-4 pb-12 sm:pt-6">
        <h1 className="animate-fade-up font-display text-3xl font-semibold tracking-tight sm:text-4xl">Editar perfil</h1>
        <p className="mt-1 mb-8 animate-fade-up text-muted [animation-delay:60ms]">Nome, avatar e controle parental de {profile.name}.</p>

        <div className="space-y-4 sm:space-y-5">
          <section aria-label="Nome e avatar" className={`${CARD} p-5 sm:p-8`} style={{ animationDelay: "90ms" }}>
            <DetailsForm profileId={profile.id} name={profile.name} avatar={profile.avatar} isKids={profile.isKids} />
          </section>

          <section aria-labelledby="classificacao" className={`${CARD} space-y-5 p-5 sm:p-6`} style={{ animationDelay: "160ms" }}>
            <div id="classificacao" className={HEAD}>
              <Heading
                icon="gauge"
                title="Classificação indicativa"
                detail={
                  <>
                    Agora: <span className="text-text">{limitLabel(limit)}</span>
                    {profile.isKids && " · perfis infantis vão até 12 anos"}
                  </>
                }
              />
            </div>
            <p className="text-sm text-muted">
              Títulos acima do limite não aparecem para {profile.name}, e conteúdo 18+ não existe no Olwe. Mudar o limite pede a senha
              da conta.
            </p>
            <LimitForm profileId={profile.id} isKids={profile.isKids} limit={limit} />
          </section>

          <Expandable
            id="bloqueio"
            open={openLock}
            delay={230}
            icon={locked ? "lock" : "unlock"}
            title="Bloqueio de perfil"
            detail={locked ? "Ativado: entrar no perfil pede um PIN" : "Desativado: qualquer pessoa da conta entra"}
          >
            <LockForm profileId={profile.id} name={profile.name} locked={locked} />
          </Expandable>

          {total > 1 ? (
            <Expandable id="excluir" open={false} delay={300} icon="trash" title="Excluir perfil" detail="Apaga a lista e o histórico deste perfil" tone="text-ember">
              <DeleteForm profileId={profile.id} name={profile.name} />
            </Expandable>
          ) : (
            <section className={`${CARD} ${HEAD} p-5 sm:p-6`} style={{ animationDelay: "300ms" }}>
              <Heading icon="trash" title="Excluir perfil" detail="A conta precisa de pelo menos um perfil." tone="text-muted" />
            </section>
          )}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/profiles/manage"
            className="bg-brand inline-flex min-h-12 items-center rounded-full px-10 font-semibold text-ink transition hover:brightness-110 active:scale-[0.98]"
          >
            Concluído
          </Link>
        </div>
      </main>
    </div>
  );
}
