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
  today: { next: { title: string; customer: string; time: string; status: string } | null; more: number } | null;
  attention: { overdueCount: number; overdueTotal: number | null; expiringCount: number | null; expiringDays: number };
  /** CRM (de sus actividades): llamadas y reuniones de hoy, actividades vencidas y oportunidades abiertas sin actividad. */
  crm?: { today: { id: string; label: string; time: string; opportunityId: string }[]; overdue: number; withoutActivity: number } | null;
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

  const [metrics, prevMetrics, week, cartera, membership, bookings, unread, toVerify, crm] = await Promise.all([
    seesMoney && has("finance") ? tenantDb.finance.getMetrics() : null,
    seesMoney && has("finance") ? tenantDb.finance.getMetrics(prev) : null,
    seesMoney && has("finance") ? tenantDb.finance.getSeries(7, false) : null,
    has("receivables") ? receivables(tenantId) : null,
    has("memberships") ? createMembershipsDb(tenantId).getMetrics() : null,
    has("bookings") ? bookingsBetween(tenantId, bogotaToMs(day, "00:00"), bogotaToMs(addDaysKey(day, 1), "00:00")) : null,
    has("whatsapp") ? unreadConversationsCount(tenantId) : 0,
    has("payments") || has("online_payments") ? intentsToVerify(tenantId) : 0,
    has("crm") ? crmHomeSignals(tenantId) : null,
  ]);

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
    today,
    attention: {
      overdueCount: overdue?.count ?? 0,
      overdueTotal: seesMoney && overdue ? overdue.total : null,
      expiringCount: membership ? membership.expiringCount : null,
      expiringDays: EXPIRING_WINDOW_DAYS,
    },
    crm: crm ? { today: crm.today.slice(0, 3).map((t) => ({ id: t.id, label: t.label, time: hourFmt.format(new Date(t.at)), opportunityId: t.opportunityId })), overdue: crm.overdue, withoutActivity: crm.withoutActivity } : null,
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
