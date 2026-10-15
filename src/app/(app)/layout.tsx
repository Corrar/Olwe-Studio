import { eq } from "drizzle-orm";
import { after } from "next/server";
import { ViewTransition } from "react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { MobileNav } from "@/components/nav-links";
import { OlweIntro } from "@/components/olwe-intro";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireProfile } from "@/lib/dal";
import { recordActivity } from "@/lib/stats";
import { isDemoCatalog } from "@/lib/tmdb";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await requireProfile();
  // Usuários ativos do painel: depois de enviar a página, sem atrasá-la.
  after(() => recordActivity(profile.userId));
  // Perfis da conta para o menu do avatar: só o necessário (o hash do PIN vira só "bloqueado").
  const account = await db.query.profiles.findMany({
    where: eq(profiles.userId, profile.userId),
    orderBy: profiles.createdAt,
    columns: { id: true, name: true, avatar: true, isKids: true, pinHash: true },
  });

  return (
    <>
      {/* Vinheta de abertura: uma vez por sessão e de novo, com som, ao escolher um perfil. */}
      {/* key: trocar de perfil pelo menu remonta a vinheta, que toca na hora (com som) e consome o pedido. */}
      <OlweIntro key={profile.id} />
      <Header
        profile={{ id: profile.id, name: profile.name, avatar: profile.avatar, isKids: profile.isKids }}
        profiles={account.map(({ pinHash, ...p }) => ({ ...p, locked: pinHash !== null }))}
      />
      {/* Troca de página com um esmaecer curto; a busca enquanto se digita ("olwe-search") não anima. */}
      <ViewTransition default={{ "olwe-search": "none", default: "auto" }}>
        <main className="flex-1">{children}</main>
      </ViewTransition>
      <Footer demo={isDemoCatalog} app kids={profile.isKids} />
      <MobileNav />
    </>
  );
}
