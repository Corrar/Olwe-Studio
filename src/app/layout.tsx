import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/sora";
import { IntroTrigger } from "@/components/olwe-intro";
import { ToastProvider } from "@/components/toast";
import { INTRO_HEAD_SCRIPT } from "@/lib/intro";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Olwe", template: "%s · Olwe" },
  description: "Filmes e séries grátis, ou sem anúncios no Premium.",
  applicationName: "Olwe",
  // Instalado na tela inicial do iPhone/iPad, abre sem a barra do navegador.
  appleWebApp: { capable: true, title: "Olwe", statusBarStyle: "black" },
};

// viewportFit "cover" ocupa a tela toda (notch e barra de gestos): as áreas seguras ficam com pt-safe, pb-safe e gutter.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#08090d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: o script da vinheta pode marcar o <html> antes do React assumir a página.
    <html lang="pt-BR" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Esconde a vinheta antes da primeira pintura quando ela já tocou nesta sessão. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_HEAD_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <IntroTrigger />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
