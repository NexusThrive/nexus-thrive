import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import type {
  DashboardMetric,
  RecentActivityItem,
} from "@/lib/dashboard-types";
import MetricCard from "../components/tenant/metric-card";
import QuickActions from "../components/tenant/quick-actions";
import RecentActivity from "../components/tenant/recent-activity";

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
  const [metrics, activeCustomers, recentActivity] = await Promise.all([
    tenantDb.finance.getMetrics(),
    tenantDb.customers.countActive(),
    tenantDb.finance.getRecentActivity(5),
  ]);

  const metricsCards: DashboardMetric[] = [
    {
      id: "ingresos",
      title: "Ingresos",
      value: formatCurrency(metrics.income),
      description: "Cobros aprobados durante el mes en curso",
      icon: TrendingUp,
      iconTone: "indigo",
      trend: {
        direction: "neutral",
        label:
          metrics.income > 0 ? "Ingresos del mes" : "Sin cobros registrados",
      },
    },
    {
      id: "clientes",
      title: "Clientes",
      value: String(activeCustomers),
      description: "Clientes activos en tu cartera",
      icon: Users,
      iconTone: "emerald",
      trend: {
        direction: "neutral",
        label:
          activeCustomers > 0
            ? `${activeCustomers} ${activeCustomers === 1 ? "cliente" : "clientes"}`
            : "Sin clientes aún",
      },
    },
    {
      id: "gastos",
      title: "Gastos",
      value: formatCurrency(metrics.expenses),
      description: "Egresos de caja menor del mes en curso",
      icon: TrendingDown,
      iconTone: "rose",
      trend: {
        direction: "neutral",
        label:
          metrics.expenses > 0 ? "Gastos del mes" : "Sin gastos registrados",
      },
    },
    {
      id: "balance",
      title: "Balance",
      value: formatCurrency(metrics.balance),
      description: "Ingresos menos gastos del mes en curso",
      icon: Wallet,
      iconTone: "slate",
      trend: {
        direction:
          metrics.balance > 0 ? "up" : metrics.balance < 0 ? "down" : "neutral",
        label:
          metrics.balance > 0
            ? "Balance positivo"
            : metrics.balance < 0
              ? "Balance negativo"
              : "Sin movimientos",
      },
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
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {greeting}, {greetingName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Aquí tienes un resumen de{" "}
            <span className="font-medium text-slate-700">
              {tenantRecord.name}
            </span>
            .
          </p>
        </div>
        <p className="shrink-0 text-sm text-slate-500">{formattedDate}</p>
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

      {/* Actividad reciente real + acciones rápidas */}
      <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivity items={activityItems} />
        </div>
        <QuickActions tenantSlug={tenantRecord.slug} />
      </section>
    </div>
  );
}