import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/sora";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Olwe", template: "%s · Olwe" },
  description: "Filmes e séries sem anúncios, do seu jeito.",
};

export const viewport: Viewport = {
  themeColor: "#08090d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
