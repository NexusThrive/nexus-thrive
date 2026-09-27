import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

/**
 * Tipografía del wordmark (Public Stunt, uso personal) vía next/font/local:
 * genera una URL de asset válida en dev y build — el @font-face manual con
 * url() relativa quedaba malformado por webpack (src roto → caía a
 * Space Grotesk). También define --font-public-stunt que usa el Logo de @nexus/ui.
 */
const publicStunt = localFont({
  src: [
    {
      path: "../assets/fonts/PublicStunt_PERSONAL_USE_ONLY.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/PublicStuntItalic_PERSONAL_USE_ONLY.otf",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-public-stunt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nexus — Conectá tu negocio",
  description: "El ecosistema de módulos que resuelve las necesidades de tu negocio.",
};

/**
 * Layout raíz del portal. El estampado visual es el del sistema Nexus
 * (token CSS en globals.css) — mismo lenguaje que caja menor y gym.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="light">
      <body
        className={`${publicStunt.variable} min-h-screen bg-nexus-bg text-nexus-ink antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}