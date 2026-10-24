import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CalendarPlus, HandCoins, Receipt, UserRoundPlus } from "lucide-react";
import { Delta } from "@/components/atoms/delta";
import { KpiCard } from "@/components/molecules/kpi-card";
import { PageHeader } from "@/components/molecules/page-header";
import { MinusCircle, TrendingUp, Users, Wallet } from "lucide-react";
import { AppSidebar } from "@/components/organisms/app-sidebar";
import { AppTopbar } from "@/components/organisms/app-topbar";
import { BusinessSwitcher } from "@/components/organisms/business-switcher";
import { IncomeChart } from "@/components/organisms/income-chart";
import { NavbarSearch } from "@/components/organisms/navbar-search";
import QuickActions from "@/components/organisms/quick-actions";
import RecentActivity from "@/components/organisms/recent-activity";
import { AppShellProvider } from "@/components/providers/shell-context";
import { buildTenantNav } from "@/lib/navigation/tenant-nav";
import { ToastProvider } from "@/components/molecules/toast";
import { withShell } from "../../../../.storybook/decorators";
import PresencePillars from "./presence-pillars";

const pillars = [
  { key: "site" as const, label: "Sitio", weight: 25, score: 88, verified: true, hint: "Tu sitio responde y está optimizado." },
  { key: "onlineSales" as const, label: "Venta en línea", weight: 25, score: 70, verified: true, hint: "Vendes y cobras en línea." },
  { key: "google" as const, label: "Google", weight: 15, score: 100, verified: true, hint: "Tu ficha coincide con tus datos." },
  { key: "reputation" as const, label: "Reputación", weight: 10, score: 82, verified: true, hint: "Buena calificación." },
  { key: "attribution" as const, label: "Atribución", weight: 15, score: 60, verified: true, hint: "Registra el origen de tus ventas." },
  { key: "basics" as const, label: "Datos básicos", weight: 10, score: 95, verified: false, hint: "Identidad y catálogo completos." },
];
const series = Array.from({ length: 14 }, (_, i) => ({ day: `2026-10-${String(i + 10).padStart(2, "0")}`, score: 55 + i * 2 }));
const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const chart = days.map((d, i) => ({ label: d, full: `${d} ${19 + i} de oct.`, income: [420, 610, 380, 760, 920, 1180, 540][i]! * 1000, expenses: [150, 90, 210, 130, 260, 180, 70][i]! * 1000 }));
const activity = [
  { id: "1", type: "payment" as const, title: "Mensualidad · Plan Premium", description: "Camila Torres", amount: "$ 180.000", time: "hace 12 min" },
  { id: "2", type: "payment" as const, title: "Venta en mostrador", description: "Punto de venta · caja 1", amount: "$ 64.500", time: "hace 1 h" },
  { id: "3", type: "expense" as const, title: "Compra de insumos", description: "Proveedor Andina", amount: "$ 210.000", time: "hace 3 h" },
  { id: "4", type: "payment" as const, title: "Pedido de la tienda #118", description: "Pagado con Wompi", amount: "$ 92.000", time: "ayer" },
];
const quick = [
  { key: "c", label: "Nuevo socio", hint: "Registra a tu cliente", href: "/crm", icon: UserRoundPlus },
  { key: "p", label: "Registrar pago", hint: "Cobra y genera el comprobante", href: "/finance", icon: HandCoins },
  { key: "g", label: "Registrar gasto", hint: "Mantén tu balance al día", href: "/finance", icon: Receipt },
  { key: "r", label: "Nueva reserva", hint: "Agenda una clase", href: "/bookings", icon: CalendarPlus },
];

const groups = buildTenantNav("gym", ["dashboard", "crm", "bookings", "memberships", "inventory", "payments", "pos", "online_payments", "billing", "purchases", "finance", "receivables", "accounting", "taxes", "website", "google", "growth", "whatsapp"]);

/** Inicio de NEXUS V2 con el shell completo (barra superior, barra lateral por categorías y panel). Es la vista del README y de la versión. */
function Preview() {
  return (
    <div style={{ "--sw": "248px", minHeight: 900 } as React.CSSProperties} className="relative bg-background text-foreground">
      <ToastProvider>
        <AppShellProvider value={{ brandName: "Simplapp Gym", brandSub: "simplapp", groups, activeKey: "", title: "Inicio", hrefFor: (h) => h, quickActions: [], openSearch: () => {} }}>
          <AppTopbar search={<NavbarSearch />} switcher={<BusinessSwitcher currentSlug="simplapp" currentName="Simplapp Gym" businesses={[{ slug: "simplapp", name: "Simplapp Gym" }, { slug: "cafe", name: "Café Central" }]} />} />
          <AppSidebar />
          <main className="grid content-start gap-4 p-6" style={{ marginLeft: "var(--sw)", paddingTop: "calc(var(--topbar-height) + 24px)" }}>
            <PageHeader eyebrow="Domingo, 25 de octubre" title="Buenas tardes, Camila" description="Así va Simplapp Gym en los últimos 7 días. 38 cobros registrados." />
            <section aria-label="Métricas del negocio" className="grid grid-cols-4 gap-3.5">
              <KpiCard index={0} label="Ingresos" value={4810000} format="cop" icon={TrendingUp} delta={<Delta value={12} />} hint="vs. semana anterior" trend={[3, 5, 4, 7, 6, 9, 8]} />
              <KpiCard index={1} label="Socios activos" value={128} icon={Users} delta={<Delta value={9} format="count" />} hint="nuevos" trend={[100, 104, 110, 118, 128]} />
              <KpiCard index={2} label="Gastos" value={1100000} format="cop" icon={MinusCircle} hint="caja menor y fijos" trend={[2, 1, 3, 2, 3, 2, 1]} trendColor="var(--danger)" />
              <KpiCard index={3} label="Balance" value={3710000} format="cop" icon={Wallet} hint="ingresos menos gastos" trend={[1, 2, 2, 3, 3, 4]} trendColor="var(--nx-gold-600)" />
            </section>
            <section className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] items-start gap-3.5">
              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                <div className="border-b border-border px-[18px] py-4">
                  <h2 className="font-display text-[15px] font-semibold">Ingresos y gastos</h2>
                  <p className="text-xs text-muted-foreground">Por día, últimos 7 días</p>
                </div>
                <div className="px-[18px] pb-3.5 pt-2"><IncomeChart data={chart} /></div>
              </div>
              <QuickActions tenantSlug="simplapp" actions={quick} />
            </section>
            <PresencePillars pillars={pillars} phase={{ score: 84, coverage: 100, phase: "A", measured: 6 }} trend={{ direction: "up", delta: 14, days: 30, series }} />
            <RecentActivity items={activity} />
          </main>
        </AppShellProvider>
      </ToastProvider>
    </div>
  );
}

const meta = {
  title: "Páginas/Inicio/Panel completo",
  component: Preview,
  decorators: [withShell],
  parameters: { layout: "fullscreen", nextjs: { navigation: { pathname: "/simplapp" } }, docs: { description: { component: "El Inicio de NEXUS V2 con su shell completo y datos de demostración: presencia verificada, métricas, ingresos y gastos, acciones rápidas y actividad." } } },
} satisfies Meta<typeof Preview>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Claro: Story = {};
