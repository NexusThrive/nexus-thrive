import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Building2, HandCoins, Wallet } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { KpiCard } from "@/components/molecules/kpi-card";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { VerticalTermsProvider } from "@/app/[tenant]/(app)/vertical-terms-context";
import { getVerticalTerms } from "@/lib/vertical-terms";
import { TenantShell } from "./tenant-shell";

const meta = {
  title: "Plantillas/TenantShell",
  component: TenantShell,
  // El layout `(app)` envuelve el shell con el vocabulario de la vertical (los mini-modales de «Crear» lo leen).
  decorators: [(Story) => <VerticalTermsProvider terms={getVerticalTerms("construction")}><Story /></VerticalTermsProvider>],
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

/** Página larga (hay barra de scroll) con un modal: abrirlo no debe mover la navbar ni el contenido. */
export const WithModal: Story = {
  args: {
    children: (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-semibold">Clientes</h1>
        <ResponsiveSheet title="Nuevo cliente" description="Prueba de que abrir un modal no mueve la página." trigger={<Button>Nuevo cliente</Button>}>
          <p className="text-sm text-muted-foreground">Contenido del modal.</p>
        </ResponsiveSheet>
        <div className="h-[2400px] rounded-lg border border-dashed border-border-strong p-4 text-sm text-muted-foreground">Contenido largo (fuerza la barra de scroll).</div>
      </div>
    ),
  },
};
