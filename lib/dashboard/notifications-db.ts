import { and } from "@prisma/orm-postgres/orm-client";
import { db } from "@/prisma/db";
import { bogotaDayKey } from "@/lib/finance/series";
import { buildNotifications, type AppNotification } from "@/lib/dashboard/notifications";
import { createTenantDb } from "@/lib/tenant/db";
import { activeModuleNames } from "@/lib/tenant/settings-db";

/**
 * Notificaciones de la campana de una persona en su negocio: cobros y gastos
 * de hoy, citas de hoy y membresías por vencer o vencidas, solo de los
 * módulos activos, sin las que esa persona ya descartó. Todo por `tenantId`;
 * `memberId` es el integrante (`User`) de ese negocio.
 */
export async function loadNotifications(tenantId: string, memberId: string): Promise<AppNotification[]> {
  const tenantDb = createTenantDb(tenantId);
  const active = new Set(await activeModuleNames(tenantId));
  const modules = {
    finance: active.has("finance") || active.has("payments"),
    bookings: active.has("bookings"),
    memberships: active.has("memberships"),
  };

  const today = bogotaDayKey(Date.now());
  // 00:00 de hoy en Bogotá (UTC−5) y 00:00 de mañana.
  const startMs = Date.parse(`${today}T05:00:00Z`);
  const start = Temporal.Instant.fromEpochMilliseconds(startMs);
  const end = Temporal.Instant.fromEpochMilliseconds(startMs + 86_400_000);

  const [movements, bookings, membership] = await Promise.all([
    modules.finance ? tenantDb.finance.getMovements(20) : Promise.resolve([]),
    modules.bookings
      ? db.orm.public.Booking.where({ tenantId })
          .where((b) => and(b.startDate.gte(start), b.startDate.lt(end)))
          .select("id", "customerId", "serviceName", "startDate", "status")
          .all()
      : Promise.resolve([]),
    modules.memberships ? tenantDb.memberships.getMetrics() : Promise.resolve(null),
  ]);

  const customerIds = [...new Set(bookings.map((b) => b.customerId))];
  const customers = customerIds.length
    ? await db.orm.public.Customer.where({ tenantId }).where((c) => c.id.in(customerIds)).select("id", "name").all()
    : [];
  const names = new Map(customers.map((c) => [c.id, c.name]));

  const dismissed = new Set(
    (await db.orm.public.DismissedNotification.where({ userId: memberId }).select("key").all()).map((d) => d.key),
  );
  const all = buildNotifications({
    movements: movements.filter((m) => bogotaDayKey(m.at) === today),
    bookings: bookings
      .filter((b) => b.status !== "CANCELLED")
      .map((b) => ({ id: b.id, at: String(b.startDate), service: b.serviceName, customer: names.get(b.customerId) ?? "Cliente" })),
    expiring: membership?.expiringCount ?? 0,
    expired: membership?.expiredCount ?? 0,
    todayStart: new Date(startMs).toISOString(),
    modules,
  });
  return all.filter((n) => !dismissed.has(n.id));
}

/** Descarta una notificación para esa persona (deslizar o ×). */
export async function dismissNotification(memberId: string, key: string) {
  await db.orm.public.DismissedNotification.upsert({ create: { userId: memberId, key }, update: {}, conflictOn: { userId: memberId, key } });
}
