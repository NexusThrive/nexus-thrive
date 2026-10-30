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
      // Server action de la búsqueda: en Storybook no hay servidor ni base.
      "@/app/[tenant]/(app)/_actions/search": path.resolve(import.meta.dirname, "mocks/search.ts"),
      // Mini-modales de «Crear»: datos de muestra, sin servidor ni base.
      "@/app/[tenant]/(app)/_actions/quick-create": path.resolve(import.meta.dirname, "mocks/quick-create.ts"),
      "@/app/[tenant]/(app)/finance/actions": path.resolve(import.meta.dirname, "mocks/finance-actions.ts"),
      "@/app/[tenant]/(app)/crm/profile-actions": path.resolve(import.meta.dirname, "mocks/profile-actions.ts"),
      // Acciones de compras: en Storybook hay datos de muestra.
      // Existencias: en Storybook hay datos de muestra.
      "@/app/[tenant]/(app)/stock/actions": path.resolve(import.meta.dirname, "mocks/stock-actions.ts"),
      "@/app/admin/usuarios/actions": path.resolve(import.meta.dirname, "mocks/admin-users-actions.ts"),
      "@/app/[tenant]/(app)/crecimiento/actions": path.resolve(import.meta.dirname, "mocks/growth-actions.ts"),
      "@/app/[tenant]/(app)/google/actions": path.resolve(import.meta.dirname, "mocks/google-actions.ts"),
      "@/app/s/[slug]/actions": path.resolve(import.meta.dirname, "mocks/store-actions.ts"),
      "@/app/[tenant]/(app)/pedidos-tienda/actions": path.resolve(import.meta.dirname, "mocks/store-actions.ts"),
      "@/app/[tenant]/(app)/sitio/actions": path.resolve(import.meta.dirname, "mocks/site-actions.ts"),
      "@/app/[tenant]/(app)/contabilidad/actions": path.resolve(import.meta.dirname, "mocks/accounting-actions.ts"),
      "@/app/[tenant]/(app)/factura-electronica/actions": path.resolve(import.meta.dirname, "mocks/fiscal-actions.ts"),
      "@/app/[tenant]/(app)/cobros/actions": path.resolve(import.meta.dirname, "mocks/cobros-actions.ts"),
      "@/app/[tenant]/(app)/billing/actions": path.resolve(import.meta.dirname, "mocks/billing-actions.ts"),
      "@/app/[tenant]/(app)/pos/actions": path.resolve(import.meta.dirname, "mocks/pos-actions.ts"),
      "@/app/[tenant]/(app)/cartera/actions": path.resolve(import.meta.dirname, "mocks/cartera-actions.ts"),
      "@/app/[tenant]/(app)/taxes/actions": path.resolve(import.meta.dirname, "mocks/taxes-actions.ts"),
      "@/app/[tenant]/(app)/data/actions": path.resolve(import.meta.dirname, "mocks/data-actions.ts"),
      // Perfil del negocio: en Storybook responde sin servidor.
      "@/app/[tenant]/(app)/settings/actions": path.resolve(import.meta.dirname, "mocks/settings-actions.ts"),
      "@/app/[tenant]/(app)/settings/context-actions": path.resolve(import.meta.dirname, "mocks/context-actions.ts"),
      "@/app/[tenant]/(app)/settings/team-actions": path.resolve(import.meta.dirname, "mocks/team-actions.ts"),
      // Acción de funciones: en Storybook responde sin servidor.
      "@/app/[tenant]/(app)/functions/actions": path.resolve(import.meta.dirname, "mocks/functions-actions.ts"),
      "@/app/[tenant]/(app)/purchases/actions": path.resolve(import.meta.dirname, "mocks/purchases-actions.ts"),
      "@": path.resolve(import.meta.dirname, ".."),
    };
    return viteConfig;
  },
};

export default config;
