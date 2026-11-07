import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HandCoins, MinusCircle, TrendingUp, Users, Wallet } from "lucide-react";
import { Delta } from "@/components/atoms/delta";
import { RevealText } from "@/components/atoms/reveal-text";
import { KpiCard } from "@/components/molecules/kpi-card";
import { PageHeader } from "@/components/molecules/page-header";
import { PullToRefresh } from "@/components/molecules/pull-to-refresh";
import { StatTile } from "@/components/molecules/stat-tile";
import { UrlSegmentedControl } from "@/components/molecules/url-segmented-control";
import { CustomizableDashboard, DashboardMenu, type DashboardWidget } from "@/components/organisms/customizable-dashboard";
import QuickActions from "@/components/organisms/quick-actions";
import RecentActivity from "@/components/organisms/recent-activity";
import { TenantShell } from "@/components/templates/tenant-shell";
import { isModule, sortModules } from "@/lib/core/capabilities/modules";
import { getVerticalTerms } from "@/lib/core/sectors/terms";
import { percentChange } from "@/lib/experience/dashboard";
import { CHART_CATALOG } from "@/lib/experience/dashboard/chart-catalog";
import { cashFlow, comparison, countLabel, updatedLabel } from "@/lib/experience/dashboard/insights";
import type { RecentActivityItem } from "@/lib/experience/dashboard/types";
import { quickCreateActions } from "@/lib/experience/navigation/quick-create";
import { formatCurrency } from "@/lib/foundation/format";
import { chartBuckets, runningBalance, type SeriesDay } from "@/lib/foundation/kernel/finance-series";
import { computePresence } from "@/lib/business/presence/presence";
import type { PresenceSnapshot } from "@/lib/business/presence/load";
import { paymentMethodLabel } from "@/lib/foundation/kernel/payment-vocabulary";
import Loading from "../loading";
import { VerticalTermsProvider } from "../vertical-terms-context";
import { IncomeChartPanel } from "./income-chart-panel";
import PresenceSummary from "./presence-summary";
import TenantNotifications from "./tenant-notifications";

/**
 * Inicio fiel: el `TenantShell` real con la misma composición que `app/[tenant]/(app)/page.tsx`
 * (mismos componentes, mismas funciones puras de `lib/`) y datos de muestra en lugar de la base.
 *
 * Qué NO es el dashboard de producción (ver `packages/brand/docs/05-calidad/pruebas-responsive.md`):
 * - Los datos son fixtures; la consulta, los permisos, Clerk y la sesión no existen aquí.
 * - La composición de widgets está **replicada** de `page.tsx` (la página es un Server Component asíncrono y no se
 *   puede montar en Storybook): si la página cambia, esta historia debe cambiar con ella.
 * - El detalle del gráfico (`loadMovementsAction`) y la campana (`loadNotificationsAction`) responden con mocks (`.storybook/mocks/`).
 * - Faltan `ThemeSync` y `AppEntrySplash` (no afectan al diseño responsive).
 */
const TENANT = "simplapp";
const BASE = `/${TENANT}`;
const VERTICAL = "gym" as const;
const terms = getVerticalTerms(VERTICAL);
const ACTIVE = sortModules(
  ["dashboard", "crm", "bookings", "memberships", "inventory", "payments", "pos", "finance", "receivables", "website", "google", "whatsapp"].filter(isModule),
);
const has = (m: (typeof ACTIVE)[number]) => ACTIVE.includes(m);
const NOW = new Date("2026-10-25T15:30:00-05:00");

type Estado = "completo" | "nueva";
/** Cifras de un negocio grande (decenas de millones por semana): ponen a prueba el ajuste de los importes. */
const ESCALA_GRANDE = 27;

const DIAS = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"];
const CON_DATOS: SeriesDay[] = DIAS.map((day, i) => ({
  day,
  income: [520_000, 610_000, 480_000, 820_000, 705_000, 960_000, 715_000][i],
  expenses: [180_000, 90_000, 240_000, 150_000, 210_000, 120_000, 110_000][i],
  count: [6, 7, 5, 9, 8, 11, 8][i],
}));
const SIN_DATOS: SeriesDay[] = DIAS.map((day) => ({ day, income: 0, expenses: 0, count: 0 }));

const datos = (estado: Estado, escala = 1) => {
  const days = estado === "completo" ? CON_DATOS.map((d) => ({ ...d, income: d.income * escala, expenses: d.expenses * escala })) : SIN_DATOS;
  const sum = (k: "income" | "expenses" | "count") => days.reduce((a, d) => a + d[k], 0);
  const current = { income: sum("income"), expenses: sum("expenses"), balance: sum("income") - sum("expenses"), count: sum("count") };
  const previous = estado === "completo" ? { income: 3_900_000 * escala, expenses: 1_250_000 * escala, balance: 2_650_000 * escala, count: 41 } : { income: 0, expenses: 0, balance: 0, count: 0 };
  return { days, current, previous, growth: estado === "completo" ? { added: 9, series: [100, 104, 110, 118, 128] } : { added: 0, series: [0, 0, 0, 0, 0] } };
};

const PRESENCIA = (estado: Estado): PresenceSnapshot => ({
  ...computePresence(
    estado === "completo"
      ? { name: "Simplapp Gym", address: "Cra. 7 # 45-10, Bogotá", whatsappNumber: "3001234567", latitude: 4.6, longitude: -74.07, instagramHandle: "simplappgym", catalogItems: 8 }
      : { name: "Simplapp Gym" },
  ),
  website: null,
  siteUrl: null,
  publishedUrl: null,
  requestStatus: null,
  scannedAt: null,
  catalogItems: estado === "completo" ? 8 : 0,
  instagramHandle: estado === "completo" ? "simplappgym" : null,
  googleBusinessUrl: null,
  whatsappNumber: estado === "completo" ? "3001234567" : null,
});

const ACTIVIDAD: RecentActivityItem[] = [
  { id: "pending-1", type: "pending", title: "Carlos Mejía", description: "FV-0112 · 12 días de mora", amount: formatCurrency(240_000), time: "Vence 13/10/2026", href: `${BASE}/finanzas/cartera` },
  { id: "expiry-1", type: "expiry", title: "Laura Gómez", description: "Membresía mensual por vencer", amount: "", time: "En 2 días", href: `${BASE}/memberships` },
  { id: "p1", type: "payment", title: "Mensualidad · Plan Premium", description: "Punto de venta", amount: formatCurrency(180_000), time: "hace 2 h", href: `${BASE}/finanzas` },
  { id: "p2", type: "payment", title: "Venta en mostrador", description: "Efectivo", amount: formatCurrency(45_000), time: "hace 4 h", href: `${BASE}/finanzas` },
  { id: "e1", type: "expense", title: "Compra de insumos", description: "Caja menor", amount: formatCurrency(62_000), time: "hace 5 h", href: `${BASE}/finanzas` },
  { id: "c1", type: "customer", title: "Andrés Pinzón", description: `Nuevo ${terms.customer.toLowerCase()}`, amount: "", time: "ayer", href: `${BASE}/contactos/c1` },
];

function Pagina({ estado, escala = 1 }: { estado: Estado; escala?: number }) {
  const { days, current, previous, growth } = datos(estado, escala);
  const completo = estado === "completo";
  const firstDay = "2026-01-05";
  const points = chartBuckets(days, "dia", firstDay, true);
  const incomeTrend = days.map((d) => d.income);
  const expenseTrend = days.map((d) => d.expenses);
  const flow = cashFlow(current.income, current.expenses);
  const incomeVs = comparison(current.income, previous.income, "vs. periodo anterior");
  const expenseVs = comparison(current.expenses, previous.expenses, "vs. periodo anterior");
  const activeCustomers = growth.series.at(-1) ?? 0;
  const deltaFor = (cur: number, before: number, inverse = false) => {
    const change = percentChange(cur, before);
    return change == null ? undefined : <Delta value={change} inverse={inverse} />;
  };
  const pending = completo ? { total: 1_150_000 * escala, count: 3, overdue: 2 } : null;
  const quickActions = quickCreateActions(VERTICAL, ACTIVE, 4, "OWNER");
  const activityItems = completo ? ACTIVIDAD : [];
  const activityFilters = [
    { type: "payment" as const, label: "Pagos" },
    { type: "expense" as const, label: "Gastos" },
    { type: "customer" as const, label: terms.customers },
    { type: "expiry" as const, label: "Vencimientos" },
    { type: "pending" as const, label: "Pendientes" },
  ];
  const activityRegistry = {
    all: { href: `${BASE}/finanzas`, label: "Ver registro completo" },
    payment: { href: `${BASE}/finanzas`, label: "Ver todos los pagos" },
    expense: { href: `${BASE}/finanzas`, label: "Ver todos los gastos" },
    customer: { href: `${BASE}/contactos`, label: `Ver ${terms.customers.toLowerCase()}` },
    expiry: { href: `${BASE}/memberships`, label: "Ver membresías" },
    pending: { href: `${BASE}/finanzas/cartera`, label: "Ver la cartera" },
  };
  const widgets: DashboardWidget[] = [
    { id: "kpi-income", label: "Ingresos", span: 3, half: true, node: (
      <KpiCard index={0} label="Ingresos" value={current.income} format="cop" icon={TrendingUp} delta={deltaFor(current.income, previous.income)}
        hint={`${countLabel(current.count, "cobro registrado", "cobros registrados", "Sin cobros")} · ${incomeVs.note}`}
        info="Suma de los cobros confirmados del periodo. La variación compara con el periodo anterior del mismo largo."
        action={{ label: "Ver cobros" }} trend={incomeTrend} href={`${BASE}/finanzas`} />
    ) },
    { id: "kpi-expenses", label: "Gastos", span: 3, half: true, node: (
      <KpiCard index={1} label="Gastos" value={current.expenses} format="cop" icon={MinusCircle} delta={deltaFor(current.expenses, previous.expenses, true)}
        hint={`${expenseVs.note} · caja menor y fijos`}
        info="Suma de los gastos registrados en el periodo, sin los anulados. Más gasto que antes se marca en rojo."
        action={{ label: "Ver gastos" }} trend={expenseTrend} trendColor="var(--danger)" href={`${BASE}/finanzas`} />
    ) },
    { id: "kpi-balance", label: "Balance neto", span: 3, half: true, node: (
      <KpiCard index={2} label="Balance neto" value={flow} format="cop" icon={Wallet} alert={flow < 0} delta={deltaFor(flow, previous.balance)}
        hint="Ingresos − gastos del periodo"
        info="Flujo de caja del periodo: lo que entró menos lo que salió. No incluye lo que aún te deben (ver «Por cobrar»)."
        action={{ label: "Ver balance" }} trend={runningBalance(days)} trendColor="var(--nx-gold-600)" href={`${BASE}/finanzas`} />
    ) },
    ...(pending
      ? [{ id: "kpi-pending", label: "Por cobrar", span: 3 as const, half: true, node: (
          <KpiCard index={3} label="Por cobrar" value={pending.total} format="cop" icon={HandCoins} alert={pending.overdue > 0}
            hint={countLabel(pending.count, "cuenta pendiente", "cuentas pendientes")}
            info="Saldo de las cuentas por cobrar emitidas y aún no pagadas, con o sin vencimiento. Es dinero que todavía no entra a caja."
            action={{ label: "Ver cartera" }} href={`${BASE}/finanzas/cartera`} />
        ) }]
      : []),
    { id: "chart", label: "Ingresos y gastos", span: 8, node: (
      <div className="h-full overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border px-[18px] py-4">
          <div>
            <h2 className="font-display text-[15px] font-semibold">Ingresos y gastos</h2>
            <p className="text-xs text-muted-foreground">Por día, últimos 7 días{" · "}toca una barra para ver sus movimientos</p>
          </div>
          <div className="flex flex-wrap items-center gap-3.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><i aria-hidden="true" className="size-2.5 bg-foreground" />Ingresos</span>
            <span className="inline-flex items-center gap-1.5"><i aria-hidden="true" className="size-2.5 bg-border-strong" />Gastos</span>
            <UrlSegmentedControl param="g" ariaLabel="Agrupar la gráfica" value="dia" defaultValue="dia"
              options={[{ value: "dia", label: "Día" }, { value: "semana", label: "Semana" }, { value: "mes", label: "Mes" }]} />
          </div>
        </div>
        <div className="px-[18px] pb-3.5 pt-2">
          <IncomeChartPanel tenantSlug={TENANT} data={points} />
        </div>
      </div>
    ) },
    { id: "kpi-customers", label: "Clientes activos", span: 4, node: (
      <KpiCard index={4} label={`${terms.customers} activos`} value={activeCustomers} icon={Users}
        delta={growth.added > 0 ? <Delta value={growth.added} format="count" /> : undefined}
        hint={activeCustomers > 0 ? (growth.added > 0 ? "nuevos en el periodo" : "en tu cartera") : `Sin ${terms.customers.toLowerCase()} aún`}
        info={`${terms.customers} con registro activo hoy. La variación cuenta los nuevos del periodo.`}
        action={{ label: `Ver ${terms.customers.toLowerCase()}` }} trend={growth.series} href={`${BASE}/contactos`} />
    ) },
    { id: "activity", label: "Actividad reciente", span: 8, node: <RecentActivity items={activityItems} filters={activityFilters} registry={activityRegistry} /> },
    { id: "quick-actions", label: "Accesos rápidos", span: 4, node: <QuickActions tenantSlug={TENANT} actions={quickActions} /> },
    { id: "presence", label: "Presencia en línea", node: <PresenceSummary presence={PRESENCIA(estado)} href={`${BASE}/presence`} /> },
    ...(has("memberships")
      ? [
          { id: "mem-active", label: "Membresías activas", span: 3 as const, half: true, node: <StatTile index={0} label="Activas" value={completo ? 128 : 0} tone="success" note="con acceso hoy" /> },
          { id: "mem-expiring", label: "Membresías por vencer", span: 3 as const, half: true, node: <StatTile index={1} label="Por vencer" value={completo ? 7 : 0} tone="warning" note="en los próximos 7 días" /> },
          { id: "mem-expired", label: "Membresías vencidas", span: 3 as const, half: true, node: <StatTile index={2} label="Vencidas" value={completo ? 4 : 0} tone="danger" note="sin renovar" /> },
          { id: "mem-renewals", label: "Renovaciones del mes", span: 3 as const, half: true, node: <StatTile index={3} label="Renovaciones" value={formatCurrency(completo ? 2_340_000 * escala : 0)} tone="neutral" note="este mes" /> },
        ]
      : []),
  ];

  return (
    <PullToRefresh>
      <CustomizableDashboard
        scope={`${TENANT}-fiel-${estado}`}
        widgets={widgets}
        charts={{
          entries: CHART_CATALOG.filter((entry) => has(entry.needs)),
          subtitle: "Esta semana",
          data: {
            points: points.map(({ label, full, income, expenses }) => ({ label, full, income, expenses })),
            methods: completo ? [{ method: "WOMPI" as const, total: 2_900_000 * escala }, { method: "CASH" as const, total: 1_400_000 * escala }, { method: "TRANSFER" as const, total: 1_030_000 * escala }].map((m) => ({ label: paymentMethodLabel(m.method), total: m.total })) : [],
            customers: growth.series,
            income: current.income,
            expenses: current.expenses,
            balance: current.balance,
          },
        }}
        header={
          <PageHeader
            eyebrow="Domingo, 25 de octubre"
            title={<RevealText parts={["Buenas tardes, ", { text: "Camila", gold: true }]} />}
            description={`Así va Simplapp Gym esta semana. ${countLabel(current.count, "cobro registrado", "cobros registrados", "Sin cobros registrados")}. ${updatedLabel(NOW)}`}
            actions={
              <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                <UrlSegmentedControl param="p" ariaLabel="Periodo" value="7d" defaultValue="7d"
                  className="min-w-0 flex-1 [&>button]:flex-1 sm:flex-none sm:[&>button]:flex-none"
                  options={[{ value: "hoy", label: "Hoy" }, { value: "7d", label: "7 días" }, { value: "30d", label: "30 días" }]} />
                <DashboardMenu />
              </div>
            }
          />
        }
      />
    </PullToRefresh>
  );
}

/** Mismo envoltorio que `app/[tenant]/(app)/layout.tsx`: vocabulario de la vertical + `TenantShell`. */
function Inicio({ estado, cargando = false, nombre = "Simplapp Gym", escala = 1 }: { estado: Estado; cargando?: boolean; nombre?: string; escala?: number }) {
  return (
    <VerticalTermsProvider terms={terms}>
      <TenantShell tenantSlug={TENANT} tenantName={nombre} vertical={VERTICAL} activeModules={ACTIVE} role="OWNER"
        businesses={[{ slug: TENANT, name: nombre }, { slug: "norte", name: "Simplapp Norte" }]}
        topbarActions={<TenantNotifications tenantSlug={TENANT} />}>
        {cargando ? <Loading /> : <Pagina estado={estado} escala={escala} />}
      </TenantShell>
    </VerticalTermsProvider>
  );
}

const meta = {
  title: "Páginas/Inicio/Dashboard fiel",
  component: Inicio,
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: `/${TENANT}` } },
    docs: {
      description: {
        component:
          "El Inicio con el `TenantShell` real y la misma composición que `app/[tenant]/(app)/page.tsx`, con datos de muestra. Sirve para auditar y probar el comportamiento responsive del sistema real; no es la página de producción (ver el comentario del archivo).",
      },
    },
  },
} satisfies Meta<typeof Inicio>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Negocio con actividad: todos los widgets (primeros pasos ya completados, así que no aparece). */
export const ConDatos: Story = { args: { estado: "completo" } };
/** Cuenta recién creada: ceros, primeros pasos pendientes, presencia baja y actividad vacía. */
export const CuentaNueva: Story = { args: { estado: "nueva" } };
/** Precarga de la ruta (`loading.tsx` real) dentro del shell. */
export const Cargando: Story = { args: { estado: "completo", cargando: true } };
/** Negocio con nombre muy largo: la barra superior cede ancho a la marca (se corta con puntos suspensivos) y no pisa las acciones. */
export const NombreLargo: Story = { args: { estado: "completo", nombre: "Constructora y Servicios Integrales del Norte de Colombia S.A.S." } };
/** Cifras de decenas de millones: los importes se ajustan al ancho de su tarjeta sin cortarse. */
export const CifrasGrandes: Story = { args: { estado: "completo", escala: ESCALA_GRANDE } };
