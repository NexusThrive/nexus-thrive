import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import {
  mockRecentActivity,
  placeholderMetrics,
} from "@/lib/dashboard-mocks";
import MetricCard from "../components/tenant/metric-card";
import QuickActions from "../components/tenant/quick-actions";
import RecentActivity from "../components/tenant/recent-activity";

/**
 * Dashboard del negocio. Server Component: toda la data (tenant, usuario,
 * métricas) se resuelve aquí y solo se pasan valores serializables a los
 * componentes de UI.
 *
 * Las métricas y la actividad usan placeholders de `lib/dashboard-mocks.ts`
 * hasta que exista la capa de agregación de datos.
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

      {/* Métricas */}
      <section
        aria-label="Métricas del negocio"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {placeholderMetrics.map(({ id, ...metric }) => (
          <MetricCard key={id} {...metric} />
        ))}
      </section>

      {/* Actividad reciente + acciones rápidas */}
      <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivity items={mockRecentActivity} />
        </div>
        <QuickActions tenantSlug={tenantRecord.slug} />
      </section>
    </div>
  );
}
