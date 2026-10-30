import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { HandCoins, MinusCircle, TrendingUp, Users, Wallet } from "lucide-react";
import { tenantWithModules } from "@/lib/tenant/membership";
import { createTenantDb } from "@/lib/tenant/db";
import { getVerticalTerms } from "@/lib/vertical-terms";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import type { RecentActivityItem } from "@/lib/dashboard/types";
import { greetingFor, percentChange } from "@/lib/dashboard";
import { GRANULARITIES, HISTORY_DAYS, bogotaDayKey, chartBuckets, runningBalance, type FinanceSeries, type Granularity } from "@/lib/finance/series";
import { sortModules, isModule } from "@/lib/admin/catalogs";
import { quickCreateActions } from "@/lib/navigation/quick-create";
import { CHART_CATALOG } from "@/lib/dashboard/chart-catalog";
import { cashFlow, comparison, countLabel, daysUntil, updatedLabel } from "@/lib/dashboard/insights";
import { receivables } from "@/lib/receivables/receivables-db";
import { typeLabel } from "@/lib/business/memberships";
import { paymentMethodLabel } from "@/lib/finance";
import { Delta } from "@/components/atoms/delta";
import { RevealText } from "@/components/atoms/reveal-text";
import { KpiCard } from "@/components/molecules/kpi-card";
import { PageHeader } from "@/components/molecules/page-header";
import QuickActions from "@/components/organisms/quick-actions";
import type { ChartPoint } from "@/components/organisms/income-chart";
import { IncomeChartPanel } from "./_components/income-chart-panel";
import { UrlSegmentedControl } from "@/components/molecules/url-segmented-control";
import { PullToRefresh } from "@/components/molecules/pull-to-refresh";
import RecentActivity from "@/components/organisms/recent-activity";
import { CustomizableDashboard, DashboardMenu, type DashboardWidget } from "@/components/organisms/customizable-dashboard";
import { WelcomeChecklist, type WelcomeStep } from "@/components/organisms/welcome-checklist";
import { listProducts } from "@/lib/business/products-db";
import { loadPresence } from "@/lib/presence/load";
import PresenceSummary from "./_components/presence-summary";
import { StatTile } from "@/components/molecules/stat-tile";
import { requirePageContext } from "@/lib/tenant/context";

/**
 * Dashboard del negocio. Server Component: toda la data (tenant, usuario,
 * métricas y actividad reciente) se resuelve aquí desde PostgreSQL vía
 * `tenantDb` y solo se pasan valores serializables a la UI.
 *
 * Las métricas y la actividad son reales: ingresos/gastos del mes en curso
 * (horario Bogotá) y últimos 5 movimientos del tenant.
 */
const PERIODS = { hoy: 1, "7d": 7, "30d": 30 } as const;
type Period = keyof typeof PERIODS;

/** Puntos del gráfico: por hora hoy; por día, semana o mes en el resto (con «sin datos» y «sin movimientos»). */
function chartPoints(series: FinanceSeries, period: Period, granularity: Granularity, firstDay: string | null): ChartPoint[] {
  if (granularity === "dia" && period === "hoy" && series.hours) {
    return series.hours.map((h) => ({
      label: `${h.hour}h`,
      full: `${h.hour}:00 – ${h.hour + 1}:00`,
      income: h.income,
      expenses: h.expenses,
    }));
  }
  return chartBuckets(series.days, granularity, firstDay, granularity === "dia" && period === "7d");
}

export default async function TenantDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ p?: string; g?: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const { p, g } = await searchParams;
  const period: Period = p === "hoy" || p === "30d" ? p : "7d";
  const days = PERIODS[period];
  const granularity: Granularity = GRANULARITIES.includes(g as Granularity) ? (g as Granularity) : "dia";

  // Sesión + negocio activo + membresía activa (SEC-03): no basta el layout.
  const pageCtx = await requirePageContext(tenantSlug);
  const tenantRecord = await tenantWithModules(pageCtx.tenantId);
  if (!tenantRecord) {
    notFound();
  }

  const { userId } = await auth();
  const tenantDb = createTenantDb(tenantRecord.id);
  const localUser = userId
    ? await tenantDb.users.findByClerkUserId(userId)
    : null;

  // El saludo prefiere el nombre vivo de Clerk (si cambia en la cuenta, se
  // refleja al instante); el nombre del equipo (Ajustes → Equipo) es el
  // fallback, y el usuario del correo el último recurso.
  const clerkUser = await currentUser();
  const greetingName =
    clerkUser?.firstName?.trim() ||
    localUser?.name?.trim().split(/\s+/)[0] ||
    localUser?.email?.split("@")[0] ||
    "Hola";

  const rawDate = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const formattedDate = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  // Datos reales (mismo mes Bogotá que usa Finanzas) y el mes anterior para
  // la variación de cada KPI.
  const [series, growth, recentActivity, membershipMetrics, monthMetrics] = await Promise.all([
    tenantDb.finance.getSeries(days),
    tenantDb.customers.activeGrowth(days === 1 ? 7 : days),
    tenantDb.finance.getRecentActivity(20),
    tenantDb.memberships.getMetrics(),
    tenantDb.finance.getMetrics(),
  ]);
  // Semana y mes miran más atrás que el periodo elegido (12 semanas / 12 meses), sin periodo previo.
  const chartSeries = granularity === "dia" ? series : await tenantDb.finance.getSeries(HISTORY_DAYS[granularity], false);
  // Antes de que el negocio existiera no hay datos (no es lo mismo que un día sin movimientos).
  const firstDay = tenantRecord.createdAt ? bogotaDayKey(String(tenantRecord.createdAt)) : null;
  const presence = await loadPresence(tenantRecord);
  // Por cobrar: solo con el módulo de Cartera encendido (la misma regla de su pantalla).
  const moduleOn = (name: string) => tenantRecord.modules.some((m) => m.active && m.moduleName === name);
  const cartera = moduleOn("receivables") ? await receivables(tenantRecord.id) : null;
  const pending = cartera?.aging ?? null;
  // Fuentes de la actividad que no son movimientos: socios nuevos, membresías por vencer y cartera.
  const [newCustomers, expiring] = await Promise.all([
    moduleOn("crm") ? tenantDb.customers.recent(5) : [],
    moduleOn("memberships") ? tenantDb.memberships.list({ status: "expiring", limit: 5 }).then((r) => r.rows) : [],
  ]);
  const hasCatalog =
    tenantRecord.modules.some((m) => m.active && m.moduleName === "inventory")
      ? (await listProducts(tenantRecord.id, { limit: 1 })).length > 0
      : true;
  const { current, previous } = series;
  const activeCustomers = growth.series.at(-1) ?? 0;
  const incomeTrend = period === "hoy" && series.hours ? series.hours.map((h) => h.income) : series.days.map((d) => d.income);
  const expenseTrend = period === "hoy" && series.hours ? series.hours.map((h) => h.expenses) : series.days.map((d) => d.expenses);
  const balanceTrend =
    period === "hoy" && series.hours
      ? series.hours.map((h) => h.income - h.expenses).map((_, i, a) => a.slice(0, i + 1).reduce((x, y) => x + y, 0))
      : runningBalance(series.days);
  const versus = period === "hoy" ? "vs. ayer" : "vs. periodo anterior";
  const incomeVs = comparison(current.income, previous.income, versus);
  const expenseVs = comparison(current.expenses, previous.expenses, versus);
  const flow = cashFlow(current.income, current.expenses);
  const periodText = period === "hoy" ? "hoy" : period === "7d" ? "esta semana" : "este mes";

  // Vocabulario adaptativo de la vertical (Socios / Pacientes / Turistas…).
  const terms = getVerticalTerms(tenantRecord.vertical);
  const base = `/${tenantSlug}`;
  const activeModules = sortModules(
    tenantRecord.modules.filter((m) => m.active).map((m) => m.moduleName).filter(isModule),
  );
  const has = (m: (typeof activeModules)[number]) => activeModules.includes(m);
  const quickActions = quickCreateActions(tenantRecord.vertical, activeModules, 4, localUser?.role);
  // La variación solo se muestra si hay mes anterior con qué comparar.
  const deltaFor = (current: number, before: number, inverse = false) => {
    const change = percentChange(current, before);
    return change == null ? undefined : <Delta value={change} inverse={inverse} />;
  };

  // Actividad: lo que pide atención (cartera y vencimientos) va primero; después, lo reciente por fecha.
  const recentItems = [
    ...recentActivity.map((item) => ({
      at: String(item.date),
      item: {
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        amount: formatCurrency(Math.abs(item.amount)),
        time: formatRelativeTime(item.date),
        href: `${base}/finance`,
      } satisfies RecentActivityItem,
    })),
    ...newCustomers.map((c) => ({
      at: c.createdAt,
      item: {
        id: `customer-${c.id}`,
        type: "customer" as const,
        title: c.name,
        description: `Nuevo ${terms.customer.toLowerCase()}`,
        amount: "",
        time: formatRelativeTime(c.createdAt),
        href: `${base}/crm/${c.id}`,
      } satisfies RecentActivityItem,
    })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, 8)
    .map((entry) => entry.item);
  const attentionItems: RecentActivityItem[] = [
    ...(cartera?.rows ?? []).slice(0, 3).map((row) => ({
      id: `pending-${row.id}`,
      type: "pending" as const,
      title: row.party,
      description: row.daysOverdue > 0 ? `${row.number} · ${row.daysOverdue} ${row.daysOverdue === 1 ? "día" : "días"} de mora` : `${row.number} · por cobrar`,
      amount: formatCurrency(row.balance),
      time: row.dueDate ? `Vence ${row.dueDate}` : "Sin vencimiento",
      href: `${base}/cartera`,
    })),
    ...expiring.slice(0, 3).map((m) => {
      const left = daysUntil(m.endDate);
      return {
        id: `expiry-${m.id}`,
        type: "expiry" as const,
        title: m.customerName,
        description: `Membresía ${typeLabel(m.type).toLowerCase()} por vencer`,
        amount: "",
        time: left === 0 ? "Vence hoy" : `En ${left} ${left === 1 ? "día" : "días"}`,
        href: `${base}/memberships`,
      };
    }),
  ];
  const activityItems: RecentActivityItem[] = [...attentionItems, ...recentItems];
  const activityFilters = [
    ...(moduleOn("finance") ? [{ type: "payment" as const, label: "Pagos" }, { type: "expense" as const, label: "Gastos" }] : []),
    ...(moduleOn("crm") ? [{ type: "customer" as const, label: terms.customers }] : []),
    ...(moduleOn("memberships") ? [{ type: "expiry" as const, label: "Vencimientos" }] : []),
    ...(cartera ? [{ type: "pending" as const, label: "Pendientes" }] : []),
  ];
  const activityRegistry = {
    all: { href: `${base}/finance`, label: "Ver registro completo" },
    payment: { href: `${base}/finance`, label: "Ver todos los pagos" },
    expense: { href: `${base}/finance`, label: "Ver todos los gastos" },
    customer: { href: `${base}/crm`, label: `Ver ${terms.customers.toLowerCase()}` },
    expiry: { href: `${base}/memberships`, label: "Ver membresías" },
    pending: { href: `${base}/cartera`, label: "Ver la cartera" },
  };

  // Primeros pasos: solo de los módulos activos; los marca hecho lo que ya hay
  // en los datos (las últimas 20 operaciones bastan para detectar el primer
  // cobro y el primer gasto de una cuenta nueva).
  const customerWord = terms.customer.toLowerCase();
  const welcomeSteps: WelcomeStep[] = [
    has("crm") && {
      id: "customer", icon: "customer", done: activeCustomers > 0,
      title: `Registra tu primer ${customerWord}`,
      description: `Agrega a tus contactos para llevar su historial, sus cobros y su seguimiento.`,
      cta: `Nuevo ${customerWord}`, href: `${base}/crm`,
    },
    has("finance") && {
      id: "payment", icon: "payment", done: recentActivity.some((a) => a.type === "payment"),
      title: "Registra tu primer cobro",
      description: "Cobra y genera el comprobante para que tus ingresos queden al día.",
      cta: "Registrar pago", href: `${base}/finance?nuevo=pago`,
    },
    has("finance") && {
      id: "expense", icon: "expense", done: recentActivity.some((a) => a.type === "expense"),
      title: "Agrega tus gastos",
      description: "Anota los egresos de caja para conocer tu balance real.",
      cta: "Registrar gasto", href: `${base}/finance?nuevo=gasto`,
    },
    has("inventory") && {
      id: "catalog", icon: "catalog", done: hasCatalog,
      title: "Arma tu catálogo",
      description: "Define lo que vendes: precios, inventario y planes, para cobrar en un toque.",
      cta: "Agregar al catálogo", href: `${base}/inventory?nuevo=1`,
    },
  ].filter((step): step is WelcomeStep => Boolean(step));
  const showWelcome = welcomeSteps.length >= 2 && welcomeSteps.some((step) => !step.done);

  const widgets: DashboardWidget[] = [
    ...(showWelcome
      ? [{ id: "welcome", label: "Primeros pasos", node: <WelcomeChecklist scope={tenantSlug} name={greetingName} steps={welcomeSteps} /> }]
      : []),
    { id: "presence", label: "Presencia en línea", node: (
      <PresenceSummary presence={presence} href={`${base}/presence`} />
    ) },
    { id: "kpi-income", label: "Ingresos", span: 3, half: true, node: (
      <KpiCard
        index={0}
        label="Ingresos"
        value={current.income}
        format="cop"
        icon={TrendingUp}
        delta={deltaFor(current.income, previous.income)}
        hint={`${countLabel(current.count, "cobro registrado", "cobros registrados", "Sin cobros")} · ${incomeVs.note}`}
        info="Suma de los pagos aprobados del periodo. La variación compara con el periodo anterior del mismo largo."
        action={{ label: "Ver cobros" }}
        trend={incomeTrend}
        href={has("finance") ? `${base}/finance` : undefined}
      />
    ) },
    { id: "kpi-expenses", label: "Gastos", span: 3, half: true, node: (
      <KpiCard
        index={1}
        label="Gastos"
        value={current.expenses}
        format="cop"
        icon={MinusCircle}
        delta={deltaFor(current.expenses, previous.expenses, true)}
        hint={`${expenseVs.note} · caja menor y fijos`}
        info="Suma de los gastos registrados en el periodo, sin los anulados. Más gasto que antes se marca en rojo."
        action={{ label: "Ver gastos" }}
        trend={expenseTrend}
        trendColor="var(--danger)"
        href={has("finance") ? `${base}/finance` : undefined}
      />
    ) },
    { id: "kpi-balance", label: "Balance neto", span: 3, half: true, node: (
      <KpiCard
        index={2}
        label="Balance neto"
        value={flow}
        format="cop"
        icon={Wallet}
        alert={flow < 0}
        delta={deltaFor(flow, previous.balance)}
        hint="Ingresos − gastos del periodo"
        info="Flujo de caja del periodo: lo que entró menos lo que salió. No incluye lo que aún te deben (ver «Por cobrar»)."
        action={{ label: "Ver balance" }}
        trend={balanceTrend}
        trendColor="var(--nx-gold-600)"
        href={has("finance") ? `${base}/finance` : undefined}
      />
    ) },
    ...(pending
      ? [{ id: "kpi-pending", label: "Por cobrar", span: 3 as const, half: true, node: (
          <KpiCard
            index={3}
            label="Por cobrar"
            value={pending.total}
            format="cop"
            icon={HandCoins}
            alert={pending.buckets.d1_30.count + pending.buckets.d31_60.count + pending.buckets.d61_90.count + pending.buckets.d90.count > 0}
            hint={pending.count === 0 ? "Nada pendiente" : `${countLabel(pending.count, "cuenta pendiente", "cuentas pendientes")}`}
            info="Saldo de las cuentas por cobrar emitidas y aún no pagadas, con o sin vencimiento. Es dinero que todavía no entra a caja."
            action={{ label: "Ver cartera" }}
            href={`${base}/cartera`}
          />
        ) }]
      : []),
    { id: "kpi-customers", label: "Clientes activos", span: 3, half: true, node: (
      <KpiCard
        index={4}
        label={`${terms.customers} activos`}
        value={activeCustomers}
        icon={Users}
        delta={growth.added > 0 ? <Delta value={growth.added} format="count" /> : undefined}
        hint={activeCustomers > 0 ? (growth.added > 0 ? "nuevos en el periodo" : "en tu cartera") : `Sin ${terms.customers.toLowerCase()} aún`}
        info={`${terms.customers} con registro activo hoy. La variación cuenta los nuevos del periodo.`}
        action={{ label: `Ver ${terms.customers.toLowerCase()}` }}
        trend={growth.series}
        href={has("crm") ? `${base}/crm` : undefined}
      />
    ) },
    { id: "chart", label: "Ingresos y gastos", node: (
      <div className="h-full overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border px-[18px] py-4">
            <div>
              <h2 className="font-display text-[15px] font-semibold">Ingresos y gastos</h2>
              <p className="text-xs text-muted-foreground">
                {granularity === "semana"
                  ? "Por semana, últimas 12 semanas"
                  : granularity === "mes"
                    ? "Por mes, últimos 12 meses"
                    : period === "hoy"
                      ? "Por hora, hoy"
                      : period === "7d"
                        ? "Por día, últimos 7 días"
                        : "Por día, últimos 30 días"}
                {" · "}toca una barra para ver sus movimientos
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><i aria-hidden="true" className="size-2.5 bg-foreground" />Ingresos</span>
              <span className="inline-flex items-center gap-1.5"><i aria-hidden="true" className="size-2.5 bg-border-strong" />Gastos</span>
              <UrlSegmentedControl
                param="g"
                ariaLabel="Agrupar la gráfica"
                value={granularity}
                defaultValue="dia"
                options={[
                  { value: "dia", label: "Día" },
                  { value: "semana", label: "Semana" },
                  { value: "mes", label: "Mes" },
                ]}
              />
            </div>
          </div>
          <div className="px-[18px] pb-3.5 pt-2">
            <IncomeChartPanel tenantSlug={tenantSlug} data={chartPoints(chartSeries, period, granularity, firstDay)} />
          </div>
      </div>
    ), span: 8 },
    { id: "quick-actions", label: "Accesos rápidos", span: 4, node: <QuickActions tenantSlug={tenantRecord.slug} actions={quickActions} /> },
    ...(has("memberships")
      ? [
          { id: "mem-active", label: "Membresías activas", span: 3 as const, half: true, node: <StatTile index={0} label="Activas" value={membershipMetrics.activeCount} tone="success" note="Con más de 3 días de vigencia" href={`${base}/memberships`} className="h-full" /> },
          { id: "mem-expiring", label: "Membresías por vencer", span: 3 as const, half: true, node: <StatTile index={1} label="Por vencer" value={membershipMetrics.expiringCount} tone="warning" pulse={membershipMetrics.expiringCount > 0} note="En los próximos 3 días" href={`${base}/memberships`} className="h-full" /> },
          { id: "mem-expired", label: "Membresías vencidas", span: 3 as const, half: true, node: <StatTile index={2} label="Vencidas" value={membershipMetrics.expiredCount} tone="danger" note="Pendientes de renovación" href={`${base}/memberships`} className="h-full" /> },
          { id: "mem-renewals", label: "Renovaciones del mes", span: 3 as const, half: true, node: <StatTile index={3} label="Renovaciones" value={formatCurrency(membershipMetrics.renewalRevenueProjection)} note="Valor por cobrar este mes" href={`${base}/memberships`} className="h-full" /> },
        ]
      : []),
    { id: "activity", label: "Actividad reciente", node: <RecentActivity items={activityItems} filters={activityFilters} registry={activityRegistry} /> },
  ];

  return (
    <PullToRefresh>
      <CustomizableDashboard
        scope={tenantSlug}
        widgets={widgets}
        charts={{
          entries: CHART_CATALOG.filter((entry) => has(entry.needs)),
          subtitle: periodText.charAt(0).toUpperCase() + periodText.slice(1),
          data: {
            points: chartPoints(series, period, "dia", firstDay).map(({ label, full, income, expenses }) => ({ label, full, income, expenses })),
            methods: monthMetrics.byMethod.map((m) => ({ label: paymentMethodLabel(m.method), total: m.total })),
            customers: growth.series,
            income: current.income,
            expenses: current.expenses,
            balance: current.balance,
          },
        }}
        header={
      <PageHeader
        eyebrow={formattedDate}
        title={<RevealText parts={[`${greetingFor()}, `, { text: greetingName, gold: true }]} />}
        description={`Así va ${tenantRecord.name} ${periodText}. ${countLabel(current.count, "cobro registrado", "cobros registrados", "Sin cobros registrados")}. ${updatedLabel()}.`}
        actions={
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <UrlSegmentedControl
              param="p"
              ariaLabel="Periodo"
              value={period}
              defaultValue="7d"
              className="min-w-0 flex-1 [&>button]:flex-1 sm:flex-none sm:[&>button]:flex-none"
              options={[
                { value: "hoy", label: "Hoy" },
                { value: "7d", label: "7 días" },
                { value: "30d", label: "30 días" },
              ]}
            />
            <DashboardMenu />
          </div>
        }
      />
        }
      />
    </PullToRefresh>
  );
}
