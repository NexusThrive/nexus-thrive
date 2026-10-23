import type { Decorator, Preview } from "@storybook/nextjs-vite";
import { withThemeByClassName } from "@storybook/addon-themes";
import { fontVariables } from "@/lib/fonts";
import { MotionProvider } from "@/components/providers/motion-provider";
import { PreferencesProvider } from "@/components/providers/preferences";
import "../app/globals.css";

/** Fuentes de marca (next/font), preferencias y efectos de puntero globales. */
const withFonts: Decorator = (Story) => (
  <PreferencesProvider>
    <MotionProvider />
    <div className={`${fontVariables} bg-background font-sans text-foreground antialiased`}>
      <Story />
    </div>
  </PreferencesProvider>
);

const preview: Preview = {
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    nextjs: { appDirectory: true },
    controls: { expanded: true, sort: "requiredFirst" },
    backgrounds: { disable: true },
    options: {
      storySort: {
        order: [
          "Introducción",
          ["Sistema de diseño", "Elegir el patrón", "Accesibilidad", "Inventario"],
          "Fundamentos",
          ["Colores", "Tipografía", "Espacio y forma", "Capas y elevación", "Movimiento"],
          "Átomos",
          "Moléculas",
          "Organismos",
          "Plantillas",
          "Páginas",
        ],
      },
    },
    a11y: { test: "todo" },
  },
  decorators: [
    withFonts,
    withThemeByClassName({
      themes: { Claro: "", Oscuro: "dark" },
      defaultTheme: "Claro",
    }),
  ],
};

export default preview;
