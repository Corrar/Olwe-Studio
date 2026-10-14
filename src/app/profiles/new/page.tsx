import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { getCurrentProfile, requireUser } from "@/lib/dal";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Adicionar perfil" };

export default async function NewProfilePage() {
  await requireUser();
  if ((await getCurrentProfile())?.isKids) redirect("/profiles");
  return (
    <div className="pb-safe relative isolate flex min-h-dvh flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgb(255_106_61/0.14),transparent_70%)]"
      />
      <header className="pt-safe">
        <div className="gutter flex h-16 items-center justify-between gap-4 sm:h-20">
          <Link
            href="/profiles"
            className="-ml-2 inline-flex min-h-10 items-center gap-2 rounded-full pl-2 pr-4 text-sm text-muted transition-colors hover:bg-white/5 hover:text-text"
          >
            <Icon name="arrow-left" size={18} />
            Perfis
          </Link>
          <Logo href="/profiles" size={26} />
        </div>
      </header>

      <main className="gutter flex flex-1 flex-col items-center pt-4 pb-12 sm:pt-6">
        <div className="mb-8 w-full max-w-2xl text-center sm:text-left">
          <h1 className="animate-fade-up font-display text-3xl font-semibold tracking-tight sm:text-4xl">Adicionar perfil</h1>
          <p className="mt-1 animate-fade-up text-muted [animation-delay:60ms]">Crie um perfil para outra pessoa que assiste ao Olwe.</p>
        </div>
        <ProfileForm />
      </main>
    </div>
  );
}
