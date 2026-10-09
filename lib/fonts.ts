import { Montserrat, Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";

/** Títulos y marca: misma familia geométrica del logo (Montserrat 600–700). */
export const fontDisplay = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

/** Interfaz, formularios, tablas. */
export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/** Código, IDs, referencias. */
export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

/** Wordmark y portadas: Public Stunt (usar solo en marca, no en UI). */
export const fontStunt = localFont({
  src: [
    {
      path: "../app/fonts/public-stunt.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../app/fonts/public-stunt-italic.otf",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-stunt",
  display: "swap",
});

/** Pasar a <html className={fontVariables}> */
export const fontVariables = `${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable} ${fontStunt.variable}`;