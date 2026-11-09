import type { ReactElement } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../.storybook/decorators";
import { AppShellProvider } from "@/components/providers/shell-context";
import { buildTenantNav } from "@/lib/experience/navigation/tenant-nav";
import { WorkspaceLauncher } from "./workspace-launcher";
import { WorkspaceNav } from "./workspace-nav";

const groups = buildTenantNav("retail", ["dashboard", "crm", "quotes", "orders", "finance", "receivables", "purchases", "inventory", "website", "whatsapp"]);

/** Contexto de la shell para la historia: la página activa es «Contactos». */
function Shell({ children }: { children: ReactElement }) {
  return (
    <AppShellProvider value={{ brandName: "Simplapp", brandSub: "simplapp", groups, activeKey: "/contactos", title: "Contactos", hrefFor: (href) => href, quickActions: [], openSearch: () => {} }}>
      {children}
    </AppShellProvider>
  );
}

const navMeta = {
  title: "Organismos/Workspace/Navegación contextual",
  component: WorkspaceNav,
  decorators: [withShell],
  parameters: { layout: "fullscreen", docs: { description: { component: "Secciones del espacio activo (el grupo de la página actual), en una fila debajo de la barra superior. Reemplaza a la barra lateral fija en escritorio." } } },
  render: () => (
    <Shell>
      <WorkspaceNav />
    </Shell>
  ),
} satisfies Meta<typeof WorkspaceNav>;
export default navMeta;
export const Contactos: StoryObj<typeof navMeta> = {};

export const BotonAplicaciones: StoryObj<typeof WorkspaceLauncher> = {
  render: () => (
    <Shell>
      <WorkspaceLauncher />
    </Shell>
  ),
  decorators: [withShell],
};
