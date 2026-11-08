import type { ReactElement } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { withShell } from "../../.storybook/decorators";
import { AppShellProvider } from "@/components/providers/shell-context";
import { buildTenantNav } from "@/lib/experience/navigation/tenant-nav";
import { quickCreateActions } from "@/lib/experience/navigation/quick-create";
import type { HomeSummary } from "@/lib/experience/dashboard/home-summary";
import { AppHome } from "./app-home";

const groups = buildTenantNav("retail", ["dashboard", "crm", "bookings", "memberships", "quotes", "orders", "payments", "finance", "receivables", "purchases", "inventory", "website", "whatsapp"]);

/** Cifras de muestra con la forma de `loadHomeSummary` (en la app salen de las mismas fuentes que Resumen). */
const summary: HomeSummary = {
  month: { sales: 48_600_000, salesChange: 12, weekTrend: [5.1, 4.2, 6.3, 5.9, 7.4, 6.8, 8.9], overdue: { total: 7_200_000, count: 3 }, balance: 21_400_000 },
  balance30: { balance: 27_000, income: 27_000, expenses: 0 },
  today: { next: { title: "Consulta inicial", customer: "María Pérez", time: "10:00 a. m.", status: "Pendiente" }, more: 2 },
  fiscal: { queued: 4, rejected: 1, today: 6 },
  attention: { overdueCount: 3, overdueTotal: 7_200_000, expiringCount: 2, expiringDays: 3 },
  badges: { "Ventas y cobros": 3, Canales: 2 },
  customers: {
    latest: [
      { id: "c1", name: "María Pérez", photoId: null },
      { id: "c2", name: "Colegio San José", photoId: null },
      { id: "c3", name: "Carlos Ramírez", photoId: null },
      { id: "c4", name: "Hotel Marbella", photoId: null },
      { id: "c5", name: "Laura Gómez", photoId: null },
    ],
    today: 3,
    total: 48,
  },
  team: {
    members: [
      { id: "u1", name: "Santiago Ortiz", email: "santiago@simpleapp.co" },
      { id: "u2", name: "Valentina Ruiz", email: "vale@simpleapp.co" },
      { id: "u3", name: "Andrés Torres", email: "andres@simpleapp.co" },
    ],
    total: 3,
  },
  recent: [
    { id: "r1", kind: "payment", title: "Pago de María Pérez", note: "Cobro · $ 120.000 · hace 12 minutos", at: "2026-11-07T22:00:00Z", href: "/finanzas" },
    { id: "r2", kind: "customer", title: "Laura Gómez", note: "Cliente nuevo · hace 1 hora", at: "2026-11-07T21:00:00Z", href: "/contactos/c5" },
    { id: "r3", kind: "expense", title: "Arriendo del local", note: "Gasto · $ 1.800.000 · hace 3 horas", at: "2026-11-07T19:00:00Z", href: "/finanzas" },
  ],
  updatedAt: "2026-11-07T22:40:00.000Z",
};

function Shell({ children }: { children: ReactElement }) {
  return (
    <AppShellProvider value={{ brandName: "Simplapp", brandSub: "simplapp", groups, activeKey: undefined, title: "Aplicaciones", hrefFor: (href) => href, quickActions: [], createActions: quickCreateActions("retail", ["crm", "finance", "bookings"], Infinity), openSearch: () => {} }}>
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
        <AppHome summary={summary} userName="Santiago" business={{ name: "Simpleapp", location: "Cra 7 # 45-10, Bogotá" }} trial={{ daysLeft: 15, level: "ok", planHref: "/settings" }} />
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
        <AppHome summary={{ month: null, balance30: null, today: null, attention: { overdueCount: 0, overdueTotal: null, expiringCount: null, expiringDays: 3 }, badges: {}, customers: null, team: { members: [], total: 0 }, recent: [], updatedAt: "2026-11-07T22:40:00.000Z" }} userName="Santiago" business={{ name: "Simpleapp", location: null }} />
      </div>
    </Shell>
  ),
};

/** Primera visita: el saludo y el cajón ya están; las cifras llegan después y solo sus bloques se ven en esqueleto. */
export const CifrasEnCamino: Story = {
  render: () => (
    <Shell>
      <div className="min-h-dvh bg-background pt-14">
        <AppHome summary={new Promise<null>(() => {})} userName="Santiago" />
      </div>
    </Shell>
  ),
};

/** Teclear en Inicio abre un buscador flotante con esa tecla escrita; AURI AI está al final del campo, en su círculo y mirando al frente; con un clic (o Enter si nada coincide) recibe la consulta. */
export const BuscadorPorTeclado: Story = {
  play: async () => {
    await userEvent.keyboard("zqxw");
    const search = await within(document.body).findByRole("dialog");
    await expect(within(search).getByRole("combobox")).toHaveValue("zqxw");
    await expect(await within(search).findByRole("button", { name: /Preguntarle a AURI: zqxw/ })).toBeVisible();
  },
};
