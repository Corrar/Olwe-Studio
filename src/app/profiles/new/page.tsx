import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/dal";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Novo perfil" };

export default async function NewProfilePage() {
  await requireUser();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-16">
      <Logo href="/profiles" size={30} />
      <h1 className="font-display text-3xl font-semibold">Novo perfil</h1>
      <ProfileForm />
    </div>
  );
}
