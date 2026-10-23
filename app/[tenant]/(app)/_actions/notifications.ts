"use server";

import { and } from "@prisma/orm-postgres/orm-client";
import { db } from "@/prisma/db";
import { bogotaDayKey } from "@/lib/finance/series";
import { buildNotifications, type AppNotification } from "@/lib/dashboard/notifications";
import { requireTenantContext } from "@/lib/tenant/context";

/**
 * Notificaciones de la campana: cobros y gastos de hoy, citas de hoy y
 * membresías por vencer o vencidas, solo de los módulos activos. Verifica
 * sesión y pertenencia al negocio (requireTenantContext); sin acceso, vacía.
 */
export async function loadNotificationsAction(tenantSlug: string): Promise<AppNotification[]> {
  const ctx = await requireTenantContext(tenantSlug);
  if (!ctx) return [];
  const { tenantDb, tenantId } = ctx;

  const modulesRows = await db.orm.public.TenantModule.where({ tenantId, active: true }).all();
  const active = new Set(modulesRows.map((m) => m.moduleName));
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
      ? db.orm.public.Booking
          .where({ tenantId })
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

  const dismissed = new Set((await db.orm.public.DismissedNotification.where({ userId: ctx.memberId }).select("key").all()).map((d) => d.key));
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

/** Descarta una notificación para esta persona (deslizar o ×). */
export async function dismissNotificationAction(tenantSlug: string, key: string): Promise<void> {
  const ctx = await requireTenantContext(tenantSlug);
  if (!ctx || !key || key.length > 200) return;
  await db.orm.public.DismissedNotification.upsert({ create: { userId: ctx.memberId, key }, update: {}, conflictOn: { userId: ctx.memberId, key } });
}
