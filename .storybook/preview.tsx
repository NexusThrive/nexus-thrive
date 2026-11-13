import type { Decorator, Preview } from "@storybook/nextjs-vite";
import { withThemeByClassName } from "@storybook/addon-themes";
import { fontVariables } from "@/lib/experience/fonts";
import { MotionProvider } from "@/components/providers/motion-provider";
import { PreferencesProvider } from "@/components/providers/preferences";
import { MINIMAL_VIEWPORTS } from "storybook/viewport";
import { VIEWPORTS } from "../e2e/viewports";
import "../app/globals.css";

/** Presets de Storybook (`mobile1`, `tablet`…) más los viewports de referencia de Nexus (`e2e/viewports.ts`). */
const viewports = {
  ...MINIMAL_VIEWPORTS,
  ...Object.fromEntries(
    VIEWPORTS.map((v) => [v.clave, { name: `${v.nombre} · ${v.ancho}×${v.alto}`, styles: { width: `${v.ancho}px`, height: `${v.alto}px` }, type: v.ancho < 768 ? "mobile" : v.ancho < 1280 ? "tablet" : "desktop" }]),
  ),
};

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
    viewport: { options: viewports },
    options: {
      storySort: {
        order: [
          "Introducción",
          ["Sistema de diseño", "Elegir el patrón", "Accesibilidad", "Inventario"],
          "Fundamentos",
          ["Colores", "Tipografía", "Espacio y forma", "Capas y elevación", "Movimiento"],
          "Átomos",
          ["Acciones", "Formularios", "Datos", "Presentación", "Marca", "Movimiento"],
          "Moléculas",
          ["Formularios", "Superposiciones", "Avisos y estados", "Navegación", "Contenido", "Calendario"],
          "Widgets",
          "Organismos",
          ["Superposiciones", "Shell", "Datos", "Inicio", "AURI", "Finanzas", "Agenda", "Canales", "Onboarding", "Acceso", "Configuración"],
          "Plantillas",
          "Páginas",
          "Propuestas",
          "Laboratorio",
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
