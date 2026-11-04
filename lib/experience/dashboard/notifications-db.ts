import { and } from "@prisma/orm-postgres/orm-client";
import { db } from "@/prisma/db";
import { bogotaDayKey } from "@/lib/foundation/kernel/finance-series";
import { buildNotifications, type AppNotification } from "@/lib/experience/dashboard/notifications";
import { can } from "@/lib/core/auth/permissions";
import { createTenantDb } from "@/lib/core/tenancy/db";
import { activeModuleNames } from "@/lib/core/tenancy/settings-db";

import { createMembershipsDb } from "@/lib/industry/gym/memberships-repo";
/**
 * Notificaciones de la campana de una persona en su negocio: cobros y gastos
 * de hoy, citas de hoy y membresías por vencer o vencidas, solo de los
 * módulos activos, sin las que esa persona ya descartó. Todo por `tenantId`;
 * `memberId` es el integrante (`User`) de ese negocio.
 */
export async function loadNotifications(tenantId: string, memberId: string, role?: string): Promise<AppNotification[]> {
  const tenantDb = createTenantDb(tenantId);
  // Las descartadas se piden desde ya, en paralelo con los módulos (antes iban al final, una tras otra).
  const dismissedRows = db.orm.public.DismissedNotification.where({ userId: memberId }).select("key").all();
  const active = new Set(await activeModuleNames(tenantId));
  const modules = {
    // Cobros y gastos solo para quien maneja dinero (P5, D3); con rol desconocido se conserva el comportamiento anterior.
    finance: (active.has("finance") || active.has("payments")) && (role == null || can(role, "money.handle")),
    bookings: active.has("bookings"),
    memberships: active.has("memberships"),
  };

  const today = bogotaDayKey(Date.now());
  // 00:00 de hoy en Bogotá (UTC−5) y 00:00 de mañana.
  const startMs = Date.parse(`${today}T05:00:00Z`);
  const start = Temporal.Instant.fromEpochMilliseconds(startMs);
  const end = Temporal.Instant.fromEpochMilliseconds(startMs + 86_400_000);

  const [movements, bookings, membership, registrations] = await Promise.all([
    modules.finance ? tenantDb.finance.getMovements(20) : Promise.resolve([]),
    modules.bookings
      ? db.orm.public.Booking.where({ tenantId })
          .where((b) => and(b.startDate.gte(start), b.startDate.lt(end)))
          .select("id", "customerId", "serviceName", "startDate", "status")
          .all()
      : Promise.resolve([]),
    modules.memberships ? createMembershipsDb(tenantId).getMetrics() : Promise.resolve(null),
    // Altas del registro público: evento `customer.registered` de la última semana.
    active.has("crm")
      ? db.orm.public.OutboxEvent.where({ tenantId, type: "customer.registered" })
          .where((e) => e.createdAt.gte(Temporal.Instant.fromEpochMilliseconds(startMs - 7 * 86_400_000)))
          .orderBy((e) => e.createdAt.desc())
          .limit(20)
          .select("id", "createdAt", "payload")
          .all()
      : Promise.resolve([]),
  ]);

  const customerIds = [...new Set(bookings.map((b) => b.customerId))];
  const customers = customerIds.length
    ? await db.orm.public.Customer.where({ tenantId }).where((c) => c.id.in(customerIds)).select("id", "name").all()
    : [];
  const names = new Map(customers.map((c) => [c.id, c.name]));

  const dismissed = new Set((await dismissedRows).map((d) => d.key));
  const all = buildNotifications({
    movements: movements.filter((m) => bogotaDayKey(m.at) === today),
    bookings: bookings
      .filter((b) => b.status !== "CANCELLED")
      .map((b) => ({ id: b.id, at: String(b.startDate), service: b.serviceName, customer: names.get(b.customerId) ?? "Cliente" })),
    expiring: membership?.expiringCount ?? 0,
    expired: membership?.expiredCount ?? 0,
    registrations: registrations.map((event) => {
      const payload = event.payload as { name?: unknown; customer_id?: unknown } | null;
      return {
        id: String(event.id),
        customerId: typeof payload?.customer_id === "string" ? payload.customer_id : "",
        name: typeof payload?.name === "string" ? payload.name : "Cliente",
        at: String(event.createdAt),
      };
    }),
    todayStart: new Date(startMs).toISOString(),
    modules: { ...modules, registrations: active.has("crm") },
  });
  return all.filter((n) => !dismissed.has(n.id));
}

/** Descarta una notificación para esa persona (deslizar o ×). */
export async function dismissNotification(memberId: string, key: string) {
  await db.orm.public.DismissedNotification.upsert({ create: { userId: memberId, key }, update: {}, conflictOn: { userId: memberId, key } });
}
