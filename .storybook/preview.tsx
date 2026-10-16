import type { Decorator, Preview } from "@storybook/nextjs-vite";
import { withThemeByClassName } from "@storybook/addon-themes";
import { fontVariables } from "@/lib/fonts";
import "../app/globals.css";

/** Las fuentes de marca (next/font) cuelgan de variables CSS en un ancestro. */
const withFonts: Decorator = (Story) => (
  <div className={`${fontVariables} bg-background font-sans text-foreground antialiased`}>
    <Story />
  </div>
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
          "Fundamentos",
          "Átomos",
          "Moléculas",
          "Organismos",
          "Plantillas",
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
