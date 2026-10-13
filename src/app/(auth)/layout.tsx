import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-ember/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-amber/10 blur-3xl" />
      <header className="relative px-4 py-6 sm:px-10">
        <Logo />
      </header>
      <main className="relative flex flex-1 items-center justify-center px-4 pb-16">{children}</main>
    </div>
  );
}
