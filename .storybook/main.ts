import path from "node:path";
import type { StorybookConfig } from "@storybook/nextjs-vite";
import remarkGfm from "remark-gfm";

const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: [
    "../components/docs/**/*.mdx",
    "../components/**/*.stories.tsx",
    // Piezas de una función con historia propia (p. ej. el tablero del CRM).
    "../app/**/*.stories.tsx",
  ],
  addons: [
    {
      // Tablas en los documentos MDX (Introducción y Fundamentos): sin
      // remark-gfm salían como texto con barras.
      name: "@storybook/addon-docs",
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
  ],
  staticDirs: ["../public"],
  async viteFinal(viteConfig) {
    viteConfig.resolve ??= {};
    viteConfig.resolve.alias = {
      ...(viteConfig.resolve.alias as Record<string, string> | undefined),
      // Clerk exige sesión real; en Storybook basta un avatar de muestra.
      "@clerk/nextjs": path.resolve(import.meta.dirname, "mocks/clerk.tsx"),
      "@nexus/brand": path.resolve(import.meta.dirname, "../packages/brand/src"),
      // Acciones de compras: en Storybook hay datos de muestra.
      // Existencias: en Storybook hay datos de muestra.
      "@/app/[tenant]/(app)/stock/actions": path.resolve(import.meta.dirname, "mocks/stock-actions.ts"),
      // Perfil del negocio: en Storybook responde sin servidor.
      "@/app/[tenant]/(app)/settings/context-actions": path.resolve(import.meta.dirname, "mocks/context-actions.ts"),
      // Acción de funciones: en Storybook responde sin servidor.
      "@/app/[tenant]/(app)/functions/actions": path.resolve(import.meta.dirname, "mocks/functions-actions.ts"),
      "@/app/[tenant]/(app)/purchases/actions": path.resolve(import.meta.dirname, "mocks/purchases-actions.ts"),
      "@": path.resolve(import.meta.dirname, ".."),
    };
    return viteConfig;
  },
};

export default config;
