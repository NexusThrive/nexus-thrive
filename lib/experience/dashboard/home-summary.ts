import { msOf } from "@/lib/core/events/instant";
import { can } from "@/lib/core/auth/permissions";
import type { ModuleValue } from "@/lib/core/capabilities/modules";
import { createTenantDb } from "@/lib/core/tenancy/db";
import { receivables } from "@/lib/domains/finance/receivables/receivables-db";
import { bookingsBetween, customersByIds } from "@/lib/business/scheduling/bookings-db";
import { addDaysKey, bogotaParts, bogotaToMs } from "@/lib/business/scheduling/calendar";
import { unreadConversationsCount } from "@/lib/integrations/channels/conversations-db";
import { createMembershipsDb } from "@/lib/industry/gym/memberships-repo";
import { EXPIRING_WINDOW_DAYS } from "@/lib/industry/gym/memberships";
import { db } from "@/prisma/db";
import { crmHomeSignals } from "@/lib/business/growth/pipeline-read";
import { percentChange } from "./index";

/**
 * Lo que Inicio muestra a los lados del cajón de apps. Sale de las MISMAS fuentes que las tarjetas de Resumen (sin consultas nuevas para
 * las cifras): `finance.getMetrics` (mes en curso y mes anterior, Bogotá), `finance.getSeries(7)` para la línea de la semana,
 * `receivables` (cartera) y `memberships.getMetrics`. Lo nuevo son las citas de hoy y dos conteos para las insignias.
 * El dinero solo llega a quien lo maneja (misma regla de Resumen): sin permiso, `month` es `null` y no hay montos.
 */
export type HomeSummary = {
  month: {
    sales: number;
    /** Variación en % frente al mes anterior completo; `null` si no hay con qué comparar. */
    salesChange: number | null;
    /** Ingresos por día de los últimos 7 días (línea de tendencia). */
    weekTrend: number[];
    /** Por cobrar vencido (cartera con días de mora); `null` sin el módulo de Cartera. */
    overdue: { total: number; count: number } | null;
    /** Ingresos − gastos del mes (el «Balance neto» de Resumen para el mes). */
    balance: number;
  } | null;
  /** La tarjeta de balance de Finanzas: últimos 30 días (misma serie que Finanzas, `finance.getSeries(30)`). */
  balance30: { balance: number; income: number; expenses: number } | null;
  today: { next: { title: string; customer: string; time: string; status: string } | null; more: number } | null;
  /** Factura electrónica (con el módulo y el permiso de dinero): documentos en espera del proveedor, rechazados y los de hoy. */
  fiscal?: { queued: number; rejected: number; today: number } | null;
  attention: { overdueCount: number; overdueTotal: number | null; expiringCount: number | null; expiringDays: number };
  /** CRM (de sus actividades): llamadas y reuniones de hoy, actividades vencidas y oportunidades abiertas sin actividad. */
  crm?: { today: { id: string; label: string; time: string; opportunityId: string }[]; overdue: number; withoutActivity: number } | null;
  /** Últimos clientes creados (para los círculos) y cuántos entraron hoy. */
  customers: { latest: { id: string; name: string; photoId: string | null }[]; today: number; total: number } | null;
  /** Integrantes activos del equipo (para los círculos). */
  team: { members: { id: string; name: string; email: string | null }[]; total: number };
  /** Actividad reciente: cobros, gastos y clientes nuevos, lo más nuevo primero. */
  recent: { id: string; kind: "payment" | "expense" | "customer"; title: string; note: string; at: string; href: string }[];
  /** Insignias del cajón por nombre de app (solo > 0). */
  badges: Record<string, number>;
  updatedAt: string;
};

const BOOKING_STATUS: Record<string, string> = { PENDING: "Pendiente", CONFIRMED: "Confirmada", COMPLETED: "Atendida", CANCELLED: "Cancelada" };
const hourFmt = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit" });

export async function loadHomeSummary(tenantId: string, modules: readonly ModuleValue[], role: string | null | undefined): Promise<HomeSummary> {
  const has = (m: ModuleValue) => modules.includes(m);
  const seesMoney = role == null || can(role as Parameters<typeof can>[0], "money.handle");
  const tenantDb = createTenantDb(tenantId);
  const now = new Date();
  const { day } = bogotaParts(now.getTime());
  const [y, m] = day.split("-").map(Number) as [number, number];
  const prev = m === 1 ? { month: 12, year: y - 1 } : { month: m - 1, year: y };

  const startOfToday = Temporal.Instant.from(`${day}T05:00:00Z`);
  const [metrics, prevMetrics, week, month30, cartera, membership, bookings, unread, toVerify, crm, latestCustomers, customersToday, customersTotal, team, activity, fiscalDocs] = await Promise.all([
    seesMoney && has("finance") ? tenantDb.finance.getMetrics() : null,
    seesMoney && has("finance") ? tenantDb.finance.getMetrics(prev) : null,
    seesMoney && has("finance") ? tenantDb.finance.getSeries(7, false) : null,
    seesMoney && has("finance") ? tenantDb.finance.getSeries(30, false) : null,
    has("receivables") ? receivables(tenantId) : null,
    has("memberships") ? createMembershipsDb(tenantId).getMetrics() : null,
    has("bookings") ? bookingsBetween(tenantId, bogotaToMs(day, "00:00"), bogotaToMs(addDaysKey(day, 1), "00:00")) : null,
    has("whatsapp") ? unreadConversationsCount(tenantId) : 0,
    has("payments") || has("online_payments") ? intentsToVerify(tenantId) : 0,
    has("crm") ? crmHomeSignals(tenantId) : null,
    has("crm") ? db.orm.public.Customer.where({ tenantId, active: true }).orderBy((c) => c.createdAt.desc()).limit(5).select("id", "name", "photoId", "createdAt").all() : [],
    has("crm") ? db.orm.public.Customer.where({ tenantId }).where((c) => c.createdAt.gte(startOfToday)).aggregate((a) => ({ n: a.count() })) : { n: 0 },
    has("crm") ? db.orm.public.Customer.where({ tenantId, active: true }).aggregate((a) => ({ n: a.count() })) : { n: 0 },
    db.orm.public.User.where({ tenantId, active: true }).orderBy((u) => u.createdAt.asc()).limit(50).select("id", "name", "email").all(),
    seesMoney && has("finance") ? tenantDb.finance.getRecentActivity(6) : [],
    seesMoney && has("einvoicing") ? db.orm.public.FiscalDocument.where({ tenantId }).select("status", "createdAt").orderBy((d) => d.createdAt.desc()).limit(2000).all() : null,
  ]);
  const ago = new Intl.RelativeTimeFormat("es-CO", { numeric: "auto" });
  const relative = (iso: string) => {
    const min = Math.round((new Date(iso).getTime() - now.getTime()) / 60_000);
    if (Math.abs(min) < 60) return ago.format(min, "minute");
    if (Math.abs(min) < 1440) return ago.format(Math.round(min / 60), "hour");
    return ago.format(Math.round(min / 1440), "day");
  };
  const fmtMoney = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Math.abs(n));
  const recent = [
    ...activity.map((a) => ({ id: `m-${a.id}`, kind: a.type, title: a.title, note: `${a.type === "expense" ? "Gasto" : "Cobro"} · ${fmtMoney(a.amount)}`, at: String(a.date), href: "/finanzas" })),
    ...latestCustomers.map((c) => ({ id: `c-${c.id}`, kind: "customer" as const, title: c.name, note: "Cliente nuevo", at: String(c.createdAt), href: `/contactos/${c.id}` })),
  ]
    .sort((x, y) => y.at.localeCompare(x.at))
    .slice(0, 5)
    .map((r) => ({ ...r, note: `${r.note} · ${relative(r.at)}` }));

  const overdueRows = cartera?.rows.filter((r) => r.daysOverdue > 0) ?? [];
  const overdue = cartera ? { total: Math.round(overdueRows.reduce((s, r) => s + r.balance, 0) * 100) / 100, count: overdueRows.length } : null;

  // Hoy: la próxima cita que aún no pasa (o la primera del día) y cuántas más hay programadas.
  let today: HomeSummary["today"] = null;
  if (bookings) {
    const live = bookings.filter((b) => String(b.status) !== "CANCELLED");
    const upcoming = live.filter((b) => new Date(String(b.endDate)).getTime() >= now.getTime());
    const next = upcoming[0] ?? null;
    const names = next ? await customersByIds(tenantId, [next.customerId]) : [];
    today = {
      next: next
        ? { title: next.serviceName, customer: names[0]?.name ?? "", time: hourFmt.format(new Date(String(next.startDate))), status: BOOKING_STATUS[String(next.status)] ?? "" }
        : null,
      more: Math.max(0, upcoming.length - 1),
    };
  }

  return {
    month: metrics
      ? {
          sales: metrics.income,
          salesChange: prevMetrics ? percentChange(metrics.income, prevMetrics.income) : null,
          weekTrend: week?.days.map((d) => d.income) ?? [],
          overdue: seesMoney ? overdue : null,
          balance: metrics.balance,
        }
      : null,
    balance30: month30 ? { balance: month30.current.balance, income: month30.current.income, expenses: month30.current.expenses } : null,
    today,
    fiscal: fiscalDocs
      ? {
          queued: fiscalDocs.filter((d) => d.status === "PENDING_PROVIDER" || d.status === "SUBMITTED").length,
          rejected: fiscalDocs.filter((d) => d.status === "REJECTED").length,
          today: fiscalDocs.filter((d) => (msOf(d.createdAt) ?? 0) >= startOfToday.epochMilliseconds).length,
        }
      : null,
    attention: {
      overdueCount: overdue?.count ?? 0,
      overdueTotal: seesMoney && overdue ? overdue.total : null,
      expiringCount: membership ? membership.expiringCount : null,
      expiringDays: EXPIRING_WINDOW_DAYS,
    },
    crm: crm ? { today: crm.today.slice(0, 3).map((t) => ({ id: t.id, label: t.label, time: hourFmt.format(new Date(t.at)), opportunityId: t.opportunityId })), overdue: crm.overdue, withoutActivity: crm.withoutActivity } : null,
    customers: has("crm") ? { latest: latestCustomers.map((c) => ({ id: c.id, name: c.name, photoId: c.photoId ?? null })), today: Number(customersToday.n ?? 0), total: Number(customersTotal.n ?? 0) } : null,
    team: { members: team.slice(0, 5).map((u) => ({ id: u.id, name: u.name?.trim() || u.email?.split("@")[0] || "Integrante", email: u.email })), total: team.length },
    recent,
    badges: Object.fromEntries(
      [
        ["Ventas y cobros", toVerify],
        ["Canales", unread],
      ].filter(([, n]) => Number(n) > 0),
    ) as Record<string, number>,
    updatedAt: now.toISOString(),
  };
}

/** Transferencias que el cliente avisó y falta verificar (insignia de Ventas y cobros); el mismo criterio de «¿Dónde está mi plata?». */
async function intentsToVerify(tenantId: string): Promise<number> {
  const r = await db.orm.public.PaymentIntent.where({ tenantId, status: "VERIFYING" }).aggregate((a) => ({ n: a.count() }));
  return Number(r.n ?? 0);
}
