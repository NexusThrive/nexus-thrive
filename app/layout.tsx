import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkLocalization, clerkProviderAppearance } from "@/lib/auth/clerk-appearance";
import { fontVariables } from "@/lib/fonts";
import { prefsInitScript, themeInitScript } from "@/lib/init-scripts";
import { MotionProvider } from "@/components/providers/motion-provider";
import { PreferencesProvider } from "@/components/providers/preferences";
import { PwaProvider } from "@/components/providers/pwa";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.nexusthrive.com.co",
  ),
  title: "NEXUS THRIVE",
  description:
    "NEXUS THRIVE — el sistema operativo del negocio: vende, cobra, controla caja e inventario y atiende a tus clientes en un solo lugar.",
  applicationName: "NEXUS THRIVE",
  appleWebApp: { capable: true, title: "NEXUS", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F6F3" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Tema y preferencias antes del primer pintado (sin parpadeo). `beforeInteractive`
            de next/script lo inserta en el HTML del servidor y se ejecuta al parsear,
            sin que React renderice una etiqueta <script> en el cliente (su aviso). */}
        <Script id="nexus-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript + prefsInitScript }} />
        <ClerkProvider localization={clerkLocalization} appearance={clerkProviderAppearance}>
          <PreferencesProvider>
            <MotionProvider />
            <PwaProvider>{children}</PwaProvider>
          </PreferencesProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
