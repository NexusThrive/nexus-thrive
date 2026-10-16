import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { fontVariables } from "@/lib/fonts";
import { themeInitScript } from "@/components/atoms/theme-toggle";
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
    <ClerkProvider>
      <html
        lang="es"
        className={`${fontVariables} h-full antialiased`}
        suppressHydrationWarning
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        </head>
        <body className="min-h-full flex flex-col bg-background text-foreground">
          <SplashIntro />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
