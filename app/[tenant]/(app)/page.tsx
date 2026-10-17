import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MinusCircle, TrendingUp, Users, Wallet } from "lucide-react";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { getVerticalTerms } from "@/lib/vertical-terms";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import type { RecentActivityItem } from "@/lib/dashboard-types";
import { greetingFor, percentChange } from "@/lib/dashboard";
import { runningBalance, type FinanceSeries } from "@/lib/finance-series";
import { sortModules } from "@/lib/admin-catalogs";
import { quickCreateActions } from "@/lib/navigation/quick-create";
import { Delta } from "@/components/atoms/delta";
import { RevealText } from "@/components/atoms/reveal-text";
import { KpiCard } from "@/components/molecules/kpi-card";
import { PageHeader, SectionTitle } from "@/components/molecules/page-header";
import QuickActions from "@/components/organisms/quick-actions";
import { IncomeChart, type ChartPoint } from "@/components/organisms/income-chart";
import { UrlSegmentedControl } from "@/components/molecules/url-segmented-control";
import RecentActivity from "@/components/organisms/recent-activity";
import MembershipSummary from "./memberships/_components/membership-summary";

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

const weekdayShort = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", weekday: "short" });
const dayLong = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "short" });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Puntos del gráfico: por hora hoy, por día en 7 y 30 días. */
function chartPoints(series: FinanceSeries, period: Period): ChartPoint[] {
  if (period === "hoy" && series.hours) {
    return series.hours.map((h) => ({
      label: `${h.hour}h`,
      full: `${h.hour}:00 – ${h.hour + 1}:00`,
      income: h.income,
      expenses: h.expenses,
    }));
  }
  return series.days.map((d) => {
    // Mediodía UTC del día: el nombre no cambia con la zona horaria.
    const date = new Date(`${d.day}T12:00:00Z`);
    return {
      label: period === "7d" ? cap(weekdayShort.format(date)).replace(".", "") : String(date.getUTCDate()),
      full: cap(dayLong.format(date)),
      income: d.income,
      expenses: d.expenses,
    };
  });
}

export default async function TenantDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const { p } = await searchParams;
  const period: Period = p === "hoy" || p === "30d" ? p : "7d";
  const days = PERIODS[period];

  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  })
    .include("modules", (module) => module.select("moduleName", "active"))
    .first();

  if (!tenantRecord) {
    notFound();
  }

  const { userId } = await auth();
  const tenantDb = createTenantDb(tenantRecord.id);
  const localUser = userId
    ? await tenantDb.users.findByClerkUserId(userId)
    : null;

  const greetingName =
    localUser?.name?.trim().split(/\s+/)[0] ||
    localUser?.email?.split("@")[0] ||
    "Usuario";

  const rawDate = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const formattedDate = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  // Datos reales (mismo mes Bogotá que usa Finanzas) y el mes anterior para
  // la variación de cada KPI.
  const [series, growth, recentActivity, membershipMetrics] = await Promise.all([
    tenantDb.finance.getSeries(days),
    tenantDb.customers.activeGrowth(days === 1 ? 7 : days),
    tenantDb.finance.getRecentActivity(6),
    tenantDb.memberships.getMetrics(),
  ]);
  const { current, previous } = series;
  const activeCustomers = growth.series.at(-1) ?? 0;
  const incomeTrend = period === "hoy" && series.hours ? series.hours.map((h) => h.income) : series.days.map((d) => d.income);
  const expenseTrend = period === "hoy" && series.hours ? series.hours.map((h) => h.expenses) : series.days.map((d) => d.expenses);
  const balanceTrend =
    period === "hoy" && series.hours
      ? series.hours.map((h) => h.income - h.expenses).map((_, i, a) => a.slice(0, i + 1).reduce((x, y) => x + y, 0))
      : runningBalance(series.days);
  const versus = period === "hoy" ? "vs. ayer" : "vs. periodo anterior";
  const periodText = period === "hoy" ? "hoy" : period === "7d" ? "esta semana" : "este mes";

  // Vocabulario adaptativo de la vertical (Socios / Pacientes / Turistas…).
  const terms = getVerticalTerms(tenantRecord.vertical);
  const base = `/${tenantSlug}`;
  const activeModules = sortModules(
    tenantRecord.modules.filter((m) => m.active).map((m) => m.moduleName),
  );
  const has = (m: (typeof activeModules)[number]) => activeModules.includes(m);
  const quickActions = quickCreateActions(tenantRecord.vertical, activeModules);
  // La variación solo se muestra si hay mes anterior con qué comparar.
  const deltaFor = (current: number, before: number, inverse = false) => {
    const change = percentChange(current, before);
    return change == null ? undefined : <Delta value={change} inverse={inverse} />;
  };

  const activityItems: RecentActivityItem[] = recentActivity.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    description: item.description,
    amount: formatCurrency(Math.abs(item.amount)),
    time: formatRelativeTime(item.date),
  }));

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow={formattedDate}
        title={<RevealText parts={[`${greetingFor()}, `, { text: greetingName, gold: true }]} />}
        description={`Así va ${tenantRecord.name} ${periodText}. ${current.count} ${current.count === 1 ? "cobro registrado" : "cobros registrados"}.`}
        actions={
          <UrlSegmentedControl
            param="p"
            ariaLabel="Periodo"
            value={period}
            defaultValue="7d"
            options={[
              { value: "hoy", label: "Hoy" },
              { value: "7d", label: "7 días" },
              { value: "30d", label: "30 días" },
            ]}
          />
        }
      />

      <section aria-label="Métricas del negocio" className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <KpiCard
          index={0}
          label="Ingresos"
          value={current.income}
          format="cop"
          icon={TrendingUp}
          delta={deltaFor(current.income, previous.income)}
          hint={percentChange(current.income, previous.income) == null ? "Cobros del periodo" : versus}
          trend={incomeTrend}
          href={has("finance") ? `${base}/finance` : undefined}
        />
        <KpiCard
          index={1}
          label={`${terms.customers} activos`}
          value={activeCustomers}
          icon={Users}
          delta={growth.added > 0 ? <Delta value={growth.added} format="count" /> : undefined}
          hint={activeCustomers > 0 ? (growth.added > 0 ? "nuevos" : "en tu cartera") : `Sin ${terms.customers.toLowerCase()} aún`}
          trend={growth.series}
          href={has("crm") ? `${base}/crm` : undefined}
        />
        <KpiCard
          index={2}
          label="Gastos"
          value={current.expenses}
          format="cop"
          icon={MinusCircle}
          delta={deltaFor(current.expenses, previous.expenses, true)}
          hint="caja menor y fijos"
          trend={expenseTrend}
          trendColor="var(--danger)"
          href={has("finance") ? `${base}/finance` : undefined}
        />
        <KpiCard
          index={3}
          label="Balance"
          value={current.balance}
          format="cop"
          icon={Wallet}
          alert={current.balance < 0}
          delta={deltaFor(current.balance, previous.balance)}
          hint="ingresos menos gastos"
          trend={balanceTrend}
          trendColor="var(--nx-gold-600)"
          href={has("finance") ? `${base}/finance` : undefined}
        />
      </section>

      <section className="mt-3.5 grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border px-[18px] py-4">
            <div>
              <h2 className="font-display text-[15px] font-semibold">Ingresos y gastos</h2>
              <p className="text-xs text-muted-foreground">
                {period === "hoy" ? "Por hora, hoy" : period === "7d" ? "Por día, últimos 7 días" : "Por día, últimos 30 días"}
              </p>
            </div>
            <div className="flex gap-3.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><i aria-hidden="true" className="size-2.5 bg-foreground" />Ingresos</span>
              <span className="inline-flex items-center gap-1.5"><i aria-hidden="true" className="size-2.5 bg-border-strong" />Gastos</span>
            </div>
          </div>
          <div className="px-[18px] pb-3.5 pt-2">
            <IncomeChart data={chartPoints(series, period)} />
          </div>
        </div>
        <QuickActions tenantSlug={tenantRecord.slug} actions={quickActions} />
      </section>

      {has("memberships") ? (
        <>
          <SectionTitle
            title="Membresías"
            action={
              <Link href={`${base}/memberships`} className="text-[13px] font-semibold text-accent-text">
                Ver membresías →
              </Link>
            }
          />
          <MembershipSummary metrics={membershipMetrics} />
        </>
      ) : null}

      <div className="mt-7">
        <RecentActivity items={activityItems} />
      </div>
    </div>
  );
}
