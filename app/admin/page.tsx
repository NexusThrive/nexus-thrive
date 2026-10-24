import type { Metadata } from "next";
import { AlertTriangle, Headphones, HeartPulse, Inbox, Receipt, Rocket, Target, UserX, Wrench } from "lucide-react";
import { RevealText } from "@/components/atoms/reveal-text";
import { PageHeader } from "@/components/molecules/page-header";
import { createAdminDb } from "@/lib/admin/db";
import { greetingFor } from "@/lib/dashboard";
import { getPriorities } from "@/lib/ops/accounts";
import type { PermissionKey } from "@/lib/ops/permissions";
import { billingPriorities, healthPriorities, inboxPriorities, leadPriorities, ticketPriorities } from "@/lib/ops/work-priorities";
import { getStaffContext } from "@/lib/ops/access";
import ActivityFeed from "./_components/activity-feed";
import AuditLog from "./_components/audit-log";
import ExecutiveKpis from "./_components/executive-kpis";
import { PriorityBoard } from "./_components/priority-board";
import { CustomizableDashboard, type DashboardWidget } from "@/components/organisms/customizable-dashboard";

export const metadata: Metadata = { title: "Inicio · NEXUS Operations Center" };

/**
 * Inicio del Operations Center: primero lo que pide acción hoy, después las
 * métricas de la plataforma y la actividad (de los negocios y del equipo).
 * Todo con datos reales; lo que aún no existe no se inventa.
 */
export default async function OpsHome() {
  const staff = await getStaffContext();
  const adminDb = createAdminDb();
  const can = (p: PermissionKey) => !!staff?.permissions.includes(p);
  const [priorities, leads, tickets, billing, inbox, health, metrics, activity, audit] = await Promise.all([
    getPriorities(),
    can("leads.view") ? leadPriorities() : Promise.resolve(null),
    can("tickets.view") ? ticketPriorities() : Promise.resolve(null),
    can("billing.view") ? billingPriorities() : Promise.resolve(null),
    can("tickets.view") ? inboxPriorities() : Promise.resolve(null),
    can("accounts.view") ? healthPriorities() : Promise.resolve(null),
    adminDb.getExecutiveMetrics(),
    adminDb.getActivityFeed({ limit: 8 }),
    staff?.permissions.includes("audit.view") ? adminDb.listAuditLogs(8) : Promise.resolve([]),
  ]);
  const first = staff?.name?.split(" ")[0] ?? staff?.email.split("@")[0] ?? "equipo";
  const date = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long" }).format(new Date());

  // Cada bloque se puede ocultar y reordenar desde «Personalizar»; la
  // preferencia es de cada persona del equipo (clave con su id) en este navegador.
  const widgets: DashboardWidget[] = [
    { id: "priorities", label: "Prioridades de hoy", node: (
      <PriorityBoard
        groups={[
          ...(inbox ? [{ key: "inbox", title: "Bandeja sin leer", hint: "WhatsApp y correo que esperan respuesta", icon: Inbox, itemIcon: Inbox, tone: "warning" as const, items: inbox, href: "/admin/bandeja" }] : []),
          ...(tickets ? [{ key: "tickets", title: "Soporte que vence", hint: "SLA vencido, en riesgo o sin asignar", icon: Headphones, itemIcon: Headphones, tone: "danger" as const, items: tickets, href: "/admin/soporte" }] : []),
          ...(billing ? [{ key: "billing", title: "Cobros que piden acción", hint: "Por confirmar, aviso de suspensión o suspendibles", icon: Receipt, itemIcon: Receipt, tone: "danger" as const, items: billing, href: "/admin/facturacion" }] : []),
          ...(health ? [{ key: "health", title: "Cuentas en riesgo", hint: "Salud baja: la acción sugerida va primero", icon: HeartPulse, itemIcon: HeartPulse, tone: "danger" as const, items: health, href: "/admin/salud" }] : []),
          ...(leads ? [{ key: "leads", title: "Seguimientos comerciales", hint: "Próximos pasos vencidos o para hoy", icon: Target, itemIcon: Target, tone: "warning" as const, items: leads, href: "/admin/crm" }] : []),
          { key: "setup", title: "Negocios por configurar", hint: "Onboarding sin terminar", icon: Wrench, tone: "warning", items: priorities.needSetup },
          { key: "suspended", title: "Cuentas suspendidas", hint: "Revisar motivo y siguiente paso", icon: AlertTriangle, tone: "danger", items: priorities.suspended },
          { key: "unassigned", title: "Sin responsable de cuenta", hint: "Toda cuenta activa necesita un responsable", icon: UserX, tone: "neutral", items: priorities.unassigned, href: "/admin/negocios" },
          { key: "recent", title: "Negocios nuevos (7 días)", hint: "Dar la bienvenida y revisar su configuración", icon: Rocket, tone: "neutral", items: priorities.recent },
        ]}
      />
    ) },
    { id: "kpis", label: "Métricas de la plataforma", node: (
      <section aria-label="Métricas de la plataforma">
        <ExecutiveKpis metrics={metrics} />
      </section>
    ) },
    { id: "activity", label: "Actividad", node: (
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
    ) },
  ];

  return (
    <CustomizableDashboard
      scope={`admin:${staff?.staffId ?? "anon"}`}
      widgets={widgets}
      header={
      <PageHeader
        eyebrow={date.charAt(0).toUpperCase() + date.slice(1)}
        title={<RevealText parts={[`${greetingFor()}, `, { text: first, gold: true }]} />}
        description={`NEXUS Operations Center · ${staff?.roleName ?? ""}`}
      />
      }
    />
  );
}
