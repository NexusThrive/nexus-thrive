import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { getVerticalTerms } from "@/lib/vertical-terms";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import type {
  DashboardMetric,
  RecentActivityItem,
} from "@/lib/dashboard-types";
import MetricCard from "../../components/tenant/metric-card";
import QuickActions from "../../components/tenant/quick-actions";
import RecentActivity from "../../components/tenant/recent-activity";
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
  }).first();

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

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  const rawDate = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const formattedDate = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  // Datos reales (mismo mes Bogotá que usa Finanzas).
  const [metrics, activeCustomers, recentActivity, membershipMetrics] =
    await Promise.all([
      tenantDb.finance.getMetrics(),
      tenantDb.customers.countActive(),
      tenantDb.finance.getRecentActivity(5),
      tenantDb.memberships.getMetrics(),
    ]);

  // Vocabulario adaptativo de la vertical (Socios / Pacientes / Turistas…).
  const terms = getVerticalTerms(tenantRecord.vertical);

  const metricsCards: DashboardMetric[] = [
    {
      id: "ingresos",
      title: "Ingresos",
      value: formatCurrency(metrics.income),
      description:
        metrics.income > 0 ? "Cobros del mes" : "Sin cobros registrados",
      icon: TrendingUp,
    },
    {
      id: "clientes",
      title: terms.customers,
      value: String(activeCustomers),
      description:
        activeCustomers > 0
          ? `${activeCustomers} ${
              activeCustomers === 1
                ? terms.customer.toLowerCase()
                : terms.customers.toLowerCase()
            } activos en tu cartera`
          : `Sin ${terms.customers.toLowerCase()} aún`,
      icon: Users,
    },
    {
      id: "gastos",
      title: "Gastos",
      value: formatCurrency(metrics.expenses),
      description:
        metrics.expenses > 0 ? "Gastos del mes" : "Sin gastos registrados",
      icon: TrendingDown,
    },
    {
      id: "balance",
      title: "Balance",
      value: formatCurrency(metrics.balance),
      description:
        metrics.balance > 0
          ? "Balance positivo"
          : metrics.balance < 0
            ? "Balance negativo"
            : "Sin movimientos",
      icon: Wallet,
      alert: metrics.balance < 0,
    },
  ];

  const activityItems: RecentActivityItem[] = recentActivity.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    description: item.description,
    amount: formatCurrency(item.amount),
    time: formatRelativeTime(item.date),
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado del dashboard */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] font-semibold leading-8 tracking-[-0.01em] text-foreground">
            {greeting}, {greetingName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aquí tienes un resumen de{" "}
            <span className="font-medium text-foreground">
              {tenantRecord.name}
            </span>
            .
          </p>
        </div>
        <p className="shrink-0 text-sm text-muted-foreground">{formattedDate}</p>
      </div>

      {/* Métricas reales */}
      <section
        aria-label="Métricas del negocio"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metricsCards.map(({ id, ...metric }) => (
          <MetricCard key={id} {...metric} />
        ))}
      </section>

      {/* Estado de las membresías (datos reales) */}
      <section
        aria-labelledby="dashboard-memberships-title"
        className="space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              id="dashboard-memberships-title"
              className="font-display text-base font-semibold text-foreground"
            >
              Membresías
            </h2>
            <p className="text-sm text-muted-foreground">
              Estado actual de los planes de tus{" "}
              {terms.customers.toLowerCase()}.
            </p>
          </div>
          <Link
            href={`/${tenantSlug}/memberships`}
            className="text-sm font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
          >
            Ver módulo →
          </Link>
        </div>
        <MembershipSummary metrics={membershipMetrics} />
      </section>

      {/* Actividad reciente real + acciones rápidas */}
      <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivity items={activityItems} />
        </div>
        <QuickActions tenantSlug={tenantRecord.slug} terms={terms} />
      </section>
    </div>
  );
}