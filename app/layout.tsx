import type { Metadata } from "next";
import Script from "next/script";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkLocalization, clerkProviderAppearance } from "@/lib/auth/clerk-appearance";
import { fontVariables } from "@/lib/fonts";
import { themeInitScript } from "@/components/atoms/theme-toggle";
import { MotionProvider } from "@/components/providers/motion-provider";
import { PreferencesProvider, prefsInitScript } from "@/components/providers/preferences";
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
    <ClerkProvider localization={clerkLocalization} appearance={clerkProviderAppearance}>
      <html
        lang="es"
        className={`${fontVariables} h-full antialiased`}
        suppressHydrationWarning
      >
        <head>
          {/* Tema y preferencias antes del primer pintado (sin parpadeo). */}
          <Script id="nx-init" strategy="beforeInteractive">
            {themeInitScript + prefsInitScript}
          </Script>
        </head>
        <body className="min-h-full flex flex-col bg-background text-foreground">
          <PreferencesProvider>
            <MotionProvider />
            <SplashIntro />
            {children}
          </PreferencesProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
