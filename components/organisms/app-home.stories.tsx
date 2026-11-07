import type { ReactElement } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../.storybook/decorators";
import { AppShellProvider } from "@/components/providers/shell-context";
import { buildTenantNav } from "@/lib/experience/navigation/tenant-nav";
import type { HomeSummary } from "@/lib/experience/dashboard/home-summary";
import { AppHome } from "./app-home";

const groups = buildTenantNav("retail", ["dashboard", "crm", "bookings", "memberships", "quotes", "orders", "payments", "finance", "receivables", "purchases", "inventory", "website", "whatsapp"]);

/** Cifras de muestra con la forma de `loadHomeSummary` (en la app salen de las mismas fuentes que Resumen). */
const summary: HomeSummary = {
  month: { sales: 48_600_000, salesChange: 12, weekTrend: [5.1, 4.2, 6.3, 5.9, 7.4, 6.8, 8.9], overdue: { total: 7_200_000, count: 3 }, balance: 21_400_000 },
  today: { next: { title: "Consulta inicial", customer: "María Pérez", time: "10:00 a. m.", status: "Pendiente" }, more: 2 },
  attention: { overdueCount: 3, overdueTotal: 7_200_000, expiringCount: 2, expiringDays: 3 },
  badges: { "Ventas y cobros": 3, Canales: 2 },
  updatedAt: "2026-11-07T22:40:00.000Z",
};

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
  parameters: { layout: "fullscreen", docs: { description: { component: "Inicio unificado: saludo y pastilla de prueba; debajo «Este mes» (ventas, vencido y balance), el cajón de apps al centro con sus insignias, y «Hoy» y «Atención». Resumen ya no es una app del cajón." } } },
  render: () => (
    <Shell>
      <div className="min-h-dvh bg-background pt-14">
        <AppHome summary={summary} userName="Santiago" trial={{ daysLeft: 15, level: "ok", planHref: "/settings" }} />
      </div>
    </Shell>
  ),
} satisfies Meta<typeof AppHome>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Negocio nuevo: sin cifras ni citas; solo el saludo y el cajón. */
export const SinDatos: Story = {
  render: () => (
    <Shell>
      <div className="min-h-dvh bg-background pt-14">
        <AppHome summary={{ month: null, today: null, attention: { overdueCount: 0, overdueTotal: null, expiringCount: null, expiringDays: 3 }, badges: {}, updatedAt: "2026-11-07T22:40:00.000Z" }} userName="Santiago" />
      </div>
    </Shell>
  ),
};
