import type { ReactElement } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../.storybook/decorators";
import { AppShellProvider } from "@/components/providers/shell-context";
import { buildTenantNav } from "@/lib/experience/navigation/tenant-nav";
import { AppHome } from "./app-home";

const groups = buildTenantNav("retail", ["dashboard", "crm", "quotes", "orders", "finance", "receivables", "purchases", "inventory", "website", "whatsapp"]);

function Shell({ children }: { children: ReactElement }) {
  return (
    <AppShellProvider value={{ brandName: "Simplapp", brandSub: "simplapp", groups, activeKey: undefined, title: "Aplicaciones", hrefFor: (href) => href, quickActions: [], openSearch: () => {} }}>
      {children}
    </AppShellProvider>
  );
}

const meta = {
  title: "Páginas/Aplicaciones (App Home)",
  component: AppHome,
  decorators: [withShell],
  parameters: { layout: "fullscreen", docs: { description: { component: "Pantalla de aplicaciones: la entrada del negocio. Iconos tipo app, centrados en una grilla. No muestra cifras: eso es Inicio." } } },
  render: () => (
    <Shell>
      <AppHome />
    </Shell>
  ),
} satisfies Meta<typeof AppHome>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
