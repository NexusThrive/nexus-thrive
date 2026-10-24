import type { Metadata } from "next";
import Script from "next/script";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkLocalization, clerkProviderAppearance } from "@/lib/auth/clerk-appearance";
import { fontVariables } from "@/lib/fonts";
import { prefsInitScript, themeInitScript } from "@/lib/init-scripts";
import { MotionProvider } from "@/components/providers/motion-provider";
import { PreferencesProvider } from "@/components/providers/preferences";
import { SplashIntro } from "@/components/organisms/splash-intro";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEXUS THRIVE",
  description: "NEXUS THRIVE — plataforma de gestión de negocios.",
  applicationName: "NEXUS THRIVE",
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
            <SplashIntro />
            {children}
          </PreferencesProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
