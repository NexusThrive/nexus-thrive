import type { Metadata } from "next";
import { createAdminDb } from "@/lib/platform/admin/db";
import { greetingFor } from "@/lib/experience/dashboard/index";
import { getPriorities } from "@/lib/platform/accounts/accounts";
import type { PermissionKey } from "@/lib/platform/team/permissions";
import { billingPriorities, healthPriorities, inboxPriorities, leadPriorities, ticketPriorities } from "@/lib/platform/accounts/work-priorities";
import { getStaffContext } from "@/lib/platform/team/access";
import { executiveKpiWidgets } from "./_components/executive-kpis";
import { HomeActivity } from "./_components/home-activity";
import { OpsAuriHero } from "./_components/ops-auri-hero";
import { PriorityBoard, type PriorityGroup } from "./_components/priority-board";
import { CustomizableDashboard, DashboardMenu, type DashboardWidget } from "@/components/organisms/customizable-dashboard";

export const metadata: Metadata = { title: "Inicio · NEXUS Operations Center" };

/**
 * Inicio del Operations Center, ordenado de lo general a lo concreto: el saludo con AURI y una línea de lo que pide atención,
 * las cifras de la plataforma en una fila de KPIs, las alertas, las prioridades de hoy en una tabla filtrable y la actividad
 * reciente (negocios y equipo) en otra. Todo con datos reales; lo que aún no existe no se inventa.
 */
export default async function OpsHome() {
  const staff = await getStaffContext();
  const adminDb = createAdminDb();
  const can = (p: PermissionKey) => !!staff?.permissions.includes(p);
  const canAudit = can("audit.view");
  const [priorities, leads, tickets, billing, inbox, health, metrics, activity, audit] = await Promise.all([
    getPriorities(),
    can("leads.view") ? leadPriorities() : Promise.resolve(null),
    can("tickets.view") ? ticketPriorities() : Promise.resolve(null),
    can("billing.view") ? billingPriorities() : Promise.resolve(null),
    can("tickets.view") ? inboxPriorities() : Promise.resolve(null),
    can("accounts.view") ? healthPriorities() : Promise.resolve(null),
    adminDb.getExecutiveMetrics(),
    adminDb.getActivityFeed({ limit: 8 }),
    canAudit ? adminDb.listAuditLogs(8) : Promise.resolve([]),
  ]);
  const first = staff?.name?.split(" ")[0] ?? staff?.email.split("@")[0] ?? "equipo";
  const date = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long" }).format(new Date());

  const groups: PriorityGroup[] = [
    ...(inbox ? [{ key: "inbox", title: "Bandeja sin leer", hint: "WhatsApp y correo que esperan respuesta", tone: "warning" as const, items: inbox, href: "/admin/bandeja" }] : []),
    ...(tickets ? [{ key: "tickets", title: "Soporte que vence", hint: "SLA vencido, en riesgo o sin asignar", tone: "danger" as const, items: tickets, href: "/admin/soporte" }] : []),
    ...(billing ? [{ key: "billing", title: "Cobros que piden acción", hint: "Por confirmar, aviso de suspensión o suspendibles", tone: "danger" as const, items: billing, href: "/admin/facturacion" }] : []),
    ...(health ? [{ key: "health", title: "Cuentas en riesgo", hint: "Salud baja: la acción sugerida va primero", tone: "danger" as const, items: health, href: "/admin/salud" }] : []),
    ...(leads ? [{ key: "leads", title: "Seguimientos comerciales", hint: "Próximos pasos vencidos o para hoy", tone: "warning" as const, items: leads, href: "/admin/crm" }] : []),
    { key: "setup", title: "Negocios por configurar", hint: "Onboarding sin terminar", tone: "warning", items: priorities.needSetup },
    { key: "suspended", title: "Cuentas suspendidas", hint: "Revisar motivo y siguiente paso", tone: "danger", items: priorities.suspended },
    { key: "unassigned", title: "Sin responsable de cuenta", hint: "Toda cuenta activa necesita un responsable", tone: "neutral", items: priorities.unassigned, href: "/admin/negocios" },
    { key: "recent", title: "Negocios nuevos (7 días)", hint: "Dar la bienvenida y revisar su configuración", tone: "neutral", items: priorities.recent },
  ];

  // La línea del saludo: cuánto hay pendiente y dónde se concentra (las dos categorías con más), o que todo está al día.
  const pending = groups.filter((g) => g.items.length > 0).sort((a, b) => b.items.length - a.items.length);
  const total = pending.reduce((n, g) => n + g.items.length, 0);
  const top = pending.slice(0, 2).map((g) => `${g.items.length} en ${g.title.toLowerCase()}`);
  const summary =
    total === 0
      ? "Todo al día. Buen momento para revisar la salud de las cuentas y el embudo comercial."
      : `Hoy hay ${total} ${total === 1 ? "pendiente" : "pendientes"}: ${top.join(" y ")}${pending.length > 2 ? ", entre otros" : ""}.`;

  // Cada bloque se puede ocultar y reordenar desde «Editar diseño»; la
  // preferencia es de cada persona del equipo (clave con su id) en este navegador.
  const widgets: DashboardWidget[] = [
    ...executiveKpiWidgets(metrics),
    { id: "priorities", label: "Prioridades de hoy", node: <PriorityBoard groups={groups} /> },
    { id: "activity", label: "Actividad reciente", node: <HomeActivity activity={activity} audit={canAudit ? audit : null} /> },
  ];

  // A todo el ancho y fluido como el Inicio de los negocios (`data-bleed`: la vista pone su propio margen, hasta 1680 px).
  return (
    <div data-bleed="" className="mx-auto w-full max-w-[1680px] px-5 pb-16 pt-6 md:px-6">
      <CustomizableDashboard
        scope={`admin:${staff?.staffId ?? "anon"}`}
        widgets={widgets}
        // `key`: el encabezado llega del servidor como elemento y React lo pide al pintarlo junto a los bloques.
        header={<OpsAuriHero key="saludo" date={date.charAt(0).toUpperCase() + date.slice(1)} greeting={greetingFor()} name={first} summary={summary} actions={<DashboardMenu />} />}
      />
    </div>
  );
}
