import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MinusCircle, TrendingUp, Users, Wallet } from "lucide-react";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { getVerticalTerms } from "@/lib/vertical-terms";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import type { RecentActivityItem } from "@/lib/dashboard-types";
import { greetingFor, percentChange, previousBogotaMonth } from "@/lib/dashboard";
import { sortModules } from "@/lib/admin-catalogs";
import { quickCreateActions } from "@/lib/navigation/quick-create";
import { Delta } from "@/components/atoms/delta";
import { RevealText } from "@/components/atoms/reveal-text";
import { KpiCard } from "@/components/molecules/kpi-card";
import { PageHeader, SectionTitle } from "@/components/molecules/page-header";
import QuickActions from "@/components/organisms/quick-actions";
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
export default async function TenantDashboard({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

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
  const [metrics, previous, activeCustomers, recentActivity, membershipMetrics] =
    await Promise.all([
      tenantDb.finance.getMetrics(),
      tenantDb.finance.getMetrics(previousBogotaMonth()),
      tenantDb.customers.countActive(),
      tenantDb.finance.getRecentActivity(5),
      tenantDb.memberships.getMetrics(),
    ]);

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
        description={`Así va ${tenantRecord.name} este mes.`}
      />

      <section aria-label="Métricas del negocio" className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <KpiCard
          index={0}
          label="Ingresos"
          value={metrics.income}
          format="cop"
          icon={TrendingUp}
          delta={deltaFor(metrics.income, previous.income)}
          hint={percentChange(metrics.income, previous.income) == null ? "Cobros del mes" : "vs. mes anterior"}
          href={has("finance") ? `${base}/finance` : undefined}
        />
        <KpiCard
          index={1}
          label={`${terms.customers} activos`}
          value={activeCustomers}
          icon={Users}
          hint={activeCustomers > 0 ? "en tu cartera" : `Sin ${terms.customers.toLowerCase()} aún`}
          href={has("crm") ? `${base}/crm` : undefined}
        />
        <KpiCard
          index={2}
          label="Gastos"
          value={metrics.expenses}
          format="cop"
          icon={MinusCircle}
          delta={deltaFor(metrics.expenses, previous.expenses, true)}
          hint="caja menor y fijos"
          href={has("finance") ? `${base}/finance` : undefined}
        />
        <KpiCard
          index={3}
          label="Balance"
          value={metrics.balance}
          format="cop"
          icon={Wallet}
          alert={metrics.balance < 0}
          delta={deltaFor(metrics.balance, previous.balance)}
          hint="ingresos menos gastos"
          href={has("finance") ? `${base}/finance` : undefined}
        />
      </section>

      <section className="mt-3.5 grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <RecentActivity items={activityItems} />
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
    </div>
  );
}
