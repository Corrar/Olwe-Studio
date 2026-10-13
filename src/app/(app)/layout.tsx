import { Suspense } from "react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { MobileNav } from "@/components/nav-links";
import { requireProfile } from "@/lib/dal";
import { isDemoCatalog } from "@/lib/tmdb";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await requireProfile();
  return (
    <>
      <Suspense>
        <Header profile={profile} />
      </Suspense>
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer demo={isDemoCatalog} />
      <MobileNav />
    </>
  );
}
