import type { Metadata } from "next";
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
      <head>
        {/* Tema y preferencias antes del primer pintado (sin parpadeo).
            Script inline crudo: se ejecuta síncrono durante el parseo del
            HTML, antes del primer paint. next/script no aplica aquí porque
            React 19 no ejecuta <script> renderizados en el cliente.
            Por eso `<html>` y `<head>` quedan FUERA de `ClerkProvider` (que es
            un componente de cliente): así el script se renderiza solo en el
            servidor y React no avisa de «script tag while rendering». */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript + prefsInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
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
