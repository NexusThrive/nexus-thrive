import { Montserrat, Inter, JetBrains_Mono } from "next/font/google";

/** Títulos y marca: misma familia geométrica del logo */
export const fontDisplay = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

/** Interfaz, formularios, tablas */
export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/** Código, IDs, referencias */
export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

/** Pasar a <html className={fontVariables}> */
export const fontVariables = `${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`;
