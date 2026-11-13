import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PageSkeleton } from "@/components/organisms/page-skeleton";
import { TenantShellSkeleton } from "./tenant-shell-skeleton";

const meta = {
  title: "Plantillas/TenantShellSkeleton",
  id: "plantillas-tenantshellskeleton",
  component: TenantShellSkeleton,
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "El sistema completo en esqueleto mientras el negocio carga: barra lateral, barra superior y panel con el esqueleto de la pantalla. Sustituye a la pantalla en blanco y a la N. Usa las mismas medidas y el mismo marco que `TenantShell` (variable `--sw`, panel de 28 px), así que sigue a PC, riel de iconos y celular, y al llegar lo real nada salta. `children` es el esqueleto del contenido: en la app, `RouteLoading` (el de la ruta de destino)." } },
  },
} satisfies Meta<typeof TenantShellSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

const dashboard = <PageSkeleton variant="dashboard" label="Cargando el resumen" />;

/** PC: barra lateral completa (248 px), barra superior y panel blanco. */
export const Desktop: Story = { args: { children: dashboard } };

/** Tableta: riel de 88 px solo con iconos. */
export const Tablet: Story = { args: { children: dashboard }, globals: { viewport: { value: "tablet" } } };

/** Celular: sin barra lateral; barra superior de 60 px y barra inferior de cinco huecos. */
export const Mobile: Story = { args: { children: dashboard }, globals: { viewport: { value: "mobile1" } } };

/** El contenido sigue a la ruta de destino: aquí, una lista. */
export const ConListaDeContactos: Story = { args: { children: <PageSkeleton variant="list" label="Cargando clientes" /> } };

/** Sin esqueleto de contenido: solo el marco (el panel vacío). */
export const SoloMarco: Story = { args: {} };
