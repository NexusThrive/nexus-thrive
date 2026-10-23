import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Building2, HandCoins, Wallet } from "lucide-react";
import { KpiCard } from "@/components/molecules/kpi-card";
import { TenantShell } from "./tenant-shell";

const meta = {
  title: "Plantillas/TenantShell",
  component: TenantShell,
  args: {
    tenantSlug: "constructora",
    tenantName: "Constructora Andina",
    vertical: "construction",
    activeModules: ["dashboard", "crm", "construction", "finance"],
    children: (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Obras activas" value="12" icon={Building2} />
          <KpiCard label="Ingresos del mes" value="$ 48.200.000" icon={HandCoins} />
          <KpiCard label="Gastos del mes" value="$ 9.870.000" icon={Wallet} />
        </div>
      </div>
    ),
  },
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/constructora" } },
    docs: {
      story: { inline: false, iframeHeight: 560 },
      description: {
        component:
          "Esqueleto de todas las páginas del negocio: topbar, sidebar y contenido. El layout `app/[tenant]/(app)/layout.tsx` resuelve los datos y se los pasa.",
      },
    },
  },
} satisfies Meta<typeof TenantShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {};
export const Mobile: Story = { globals: { viewport: { value: "mobile1" } } };
