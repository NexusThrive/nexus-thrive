import path from "node:path";
import type { StorybookConfig } from "@storybook/nextjs-vite";
import remarkGfm from "remark-gfm";

const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: [
    "../packages/brand/docs/storybook/**/*.mdx",
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
      "@/app/[tenant]/(app)/finanzas/actions": path.resolve(import.meta.dirname, "mocks/finance-actions.ts"),
      "@/app/[tenant]/(app)/contactos/nuevo/actions": path.resolve(import.meta.dirname, "mocks/nuevo-cliente-actions.ts"),
      "@/app/[tenant]/(app)/contactos/[id]/ficha-actions": path.resolve(import.meta.dirname, "mocks/ficha-actions.ts"),
      "@/app/[tenant]/(app)/contactos/[id]/actions": path.resolve(import.meta.dirname, "mocks/ficha-notes-actions.ts"),
      "@/app/[tenant]/(app)/contactos/actions": path.resolve(import.meta.dirname, "mocks/contactos-actions.ts"),
      "@/app/[tenant]/(app)/contactos/profile-actions": path.resolve(import.meta.dirname, "mocks/profile-actions.ts"),
      // Acciones de compras: en Storybook hay datos de muestra.
      // Existencias: en Storybook hay datos de muestra.
      "@/app/[tenant]/(app)/inventario/existencias/actions": path.resolve(import.meta.dirname, "mocks/stock-actions.ts"),
      "@/app/admin/usuarios/actions": path.resolve(import.meta.dirname, "mocks/admin-users-actions.ts"),
      "@/app/admin/soluciones/actions": path.resolve(import.meta.dirname, "mocks/admin-soluciones-actions.ts"),
      "@/app/[tenant]/(app)/presencia/crecimiento/actions": path.resolve(import.meta.dirname, "mocks/growth-actions.ts"),
      "@/app/[tenant]/(app)/presencia/google/actions": path.resolve(import.meta.dirname, "mocks/google-actions.ts"),
      "@/app/s/[slug]/actions": path.resolve(import.meta.dirname, "mocks/store-actions.ts"),
      "@/app/[tenant]/(app)/proyectos/entregables/actions": path.resolve(import.meta.dirname, "mocks/entregables-actions.ts"),
      "@/app/entregable/[token]/actions": path.resolve(import.meta.dirname, "mocks/entregables-actions.ts"),
      "@/app/[tenant]/(app)/ventas/pedidos/actions": path.resolve(import.meta.dirname, "mocks/pedidos-actions.ts"),
      "@/app/[tenant]/(app)/presencia/sitio/actions": path.resolve(import.meta.dirname, "mocks/site-actions.ts"),
      "@/app/[tenant]/(app)/finanzas/contabilidad/actions": path.resolve(import.meta.dirname, "mocks/accounting-actions.ts"),
      "@/app/[tenant]/(app)/finanzas/facturacion-electronica/actions": path.resolve(import.meta.dirname, "mocks/fiscal-actions.ts"),
      "@/app/[tenant]/(app)/ventas/cobros/actions": path.resolve(import.meta.dirname, "mocks/cobros-actions.ts"),
      "@/app/[tenant]/(app)/crm/actions": path.resolve(import.meta.dirname, "mocks/oportunidades-actions.ts"),
      "@/app/[tenant]/(app)/crm/tareas/actions": path.resolve(import.meta.dirname, "mocks/tareas-actions.ts"),
      "@/app/[tenant]/(app)/crm/formularios/actions": path.resolve(import.meta.dirname, "mocks/formularios-actions.ts"),
      "@/app/[tenant]/(app)/canales/conversaciones/actions": path.resolve(import.meta.dirname, "mocks/conversaciones-actions.ts"),
      "@/app/[tenant]/(app)/canales/avisos/actions": path.resolve(import.meta.dirname, "mocks/avisos-actions.ts"),
      "@/app/[tenant]/(app)/ventas/cotizaciones/actions": path.resolve(import.meta.dirname, "mocks/cotizaciones-actions.ts"),
      "@/app/[tenant]/(app)/integrations/actions": path.resolve(import.meta.dirname, "mocks/integrations-actions.ts"),
      "@/app/[tenant]/(app)/finanzas/facturacion/actions": path.resolve(import.meta.dirname, "mocks/billing-actions.ts"),
      "@/app/[tenant]/(app)/ventas/pos/actions": path.resolve(import.meta.dirname, "mocks/pos-actions.ts"),
      "@/app/[tenant]/(app)/finanzas/cartera/actions": path.resolve(import.meta.dirname, "mocks/cartera-actions.ts"),
      "@/app/[tenant]/(app)/finanzas/impuestos/actions": path.resolve(import.meta.dirname, "mocks/taxes-actions.ts"),
      "@/app/[tenant]/(app)/data/actions": path.resolve(import.meta.dirname, "mocks/data-actions.ts"),
      // Perfil del negocio: en Storybook responde sin servidor.
      "@/app/[tenant]/(app)/settings/actions": path.resolve(import.meta.dirname, "mocks/settings-actions.ts"),
      "@/app/[tenant]/(app)/settings/context-actions": path.resolve(import.meta.dirname, "mocks/context-actions.ts"),
      "@/app/[tenant]/(app)/settings/team-actions": path.resolve(import.meta.dirname, "mocks/team-actions.ts"),
      // Acción de funciones: en Storybook responde sin servidor.
      "@/app/[tenant]/(app)/functions/actions": path.resolve(import.meta.dirname, "mocks/functions-actions.ts"),
      "@/app/[tenant]/(app)/compras/actions": path.resolve(import.meta.dirname, "mocks/purchases-actions.ts"),
      // Detalle de la gráfica del Inicio (import relativo de `income-chart-panel`): datos de muestra.
      "../_actions/movements": path.resolve(import.meta.dirname, "mocks/movements-actions.ts"),
      // Campana de notificaciones del negocio (import relativo de `tenant-notifications`): datos de muestra.
      "../_actions/notifications": path.resolve(import.meta.dirname, "mocks/notifications-actions.ts"),
      "@": path.resolve(import.meta.dirname, ".."),
    };
    return viteConfig;
  },
};

export default config;
