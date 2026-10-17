import type { Metadata } from "next";
import { AlertTriangle, Rocket, UserX, Wrench } from "lucide-react";
import { RevealText } from "@/components/atoms/reveal-text";
import { PageHeader } from "@/components/molecules/page-header";
import { createAdminDb } from "@/lib/admin-db";
import { greetingFor } from "@/lib/dashboard";
import { getPriorities } from "@/lib/ops/accounts";
import { getStaffContext } from "@/lib/ops/access";
import ActivityFeed from "./_components/activity-feed";
import AuditLog from "./_components/audit-log";
import ExecutiveKpis from "./_components/executive-kpis";
import { PriorityBoard } from "./_components/priority-board";

export const metadata: Metadata = { title: "Inicio · NEXUS Operations Center" };

/**
 * Inicio del Operations Center: primero lo que pide acción hoy, después las
 * métricas de la plataforma y la actividad (de los negocios y del equipo).
 * Todo con datos reales; lo que aún no existe no se inventa.
 */
export default async function OpsHome() {
  const staff = await getStaffContext();
  const adminDb = createAdminDb();
  const [priorities, metrics, activity, audit] = await Promise.all([
    getPriorities(),
    adminDb.getExecutiveMetrics(),
    adminDb.getActivityFeed({ limit: 8 }),
    staff?.permissions.includes("audit.view") ? adminDb.listAuditLogs(8) : Promise.resolve([]),
  ]);
  const first = staff?.name?.split(" ")[0] ?? staff?.email.split("@")[0] ?? "equipo";
  const date = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={date.charAt(0).toUpperCase() + date.slice(1)}
        title={<RevealText parts={[`${greetingFor()}, `, { text: first, gold: true }]} />}
        description={`NEXUS Operations Center · ${staff?.roleName ?? ""}`}
      />

      <PriorityBoard
        groups={[
          { key: "setup", title: "Negocios por configurar", hint: "Onboarding sin terminar", icon: Wrench, tone: "warning", items: priorities.needSetup },
          { key: "suspended", title: "Cuentas suspendidas", hint: "Revisar motivo y siguiente paso", icon: AlertTriangle, tone: "danger", items: priorities.suspended },
          { key: "unassigned", title: "Sin responsable de cuenta", hint: "Toda cuenta activa necesita un responsable", icon: UserX, tone: "neutral", items: priorities.unassigned, href: "/admin/negocios" },
          { key: "recent", title: "Negocios nuevos (7 días)", hint: "Dar la bienvenida y revisar su configuración", icon: Rocket, tone: "neutral", items: priorities.recent },
        ]}
      />

      <section aria-label="Métricas de la plataforma">
        <ExecutiveKpis metrics={metrics} />
      </section>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-[15px] font-semibold">Actividad de los negocios</h2>
          <p className="text-xs text-muted-foreground">Últimos movimientos reales en la plataforma.</p>
          <div className="mt-4">
            <ActivityFeed items={activity} />
          </div>
        </section>
        {staff?.permissions.includes("audit.view") ? (
          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="font-display text-[15px] font-semibold">Actividad del equipo</h2>
            <p className="text-xs text-muted-foreground">Últimas acciones del equipo NEXUS.</p>
            <div className="mt-4">
              <AuditLog rows={audit} />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
