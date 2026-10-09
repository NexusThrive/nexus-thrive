import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { fontVariables } from "@/lib/fonts";
import { AppIntro } from "@/components/brand/app-intro";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus Thrive",
  description: "Nexus Thrive",
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
        <body className="min-h-full flex flex-col">
          <AppIntro />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}