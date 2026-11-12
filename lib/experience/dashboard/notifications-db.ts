import { and } from "@prisma/orm-postgres/orm-client";
import { db } from "@/prisma/db";
import { bogotaDayKey } from "@/lib/foundation/kernel/finance-series";
import { buildNotifications, type AppNotification } from "@/lib/experience/dashboard/notifications";
import { readKey, type InboxItem } from "@/lib/experience/dashboard/inbox";
import { can } from "@/lib/core/auth/permissions";
import { createTenantDb } from "@/lib/core/tenancy/db";
import { overdueCountFor } from "@/lib/business/customers/tasks-db";
import { orderCode } from "@/lib/business/store/cart";
import { activeModuleNames } from "@/lib/core/tenancy/settings-db";

import { createMembershipsDb } from "@/lib/industry/gym/memberships-repo";
/**
 * Reúne las notificaciones de una persona en su negocio, solo de los módulos activos. Todo por `tenantId`; `memberId` es el integrante
 * (`User`) de ese negocio. `today`: lo de hoy (la campana). `inbox`: el historial de las últimas semanas (el buzón): cobros y gastos de
 * 30 días, citas de una semana atrás y una adelante y altas de 30 días. Devuelve también las claves que la persona ya archivó o leyó.
 */
async function collect(tenantId: string, memberId: string, role: string | undefined, scope: "today" | "inbox") {
  const tenantDb = createTenantDb(tenantId);
  // Las descartadas y leídas se piden desde ya, en paralelo con los módulos (antes iban al final, una tras otra).
  const markedRows = db.orm.public.DismissedNotification.where({ userId: memberId }).select("key").all();
  const active = new Set(await activeModuleNames(tenantId));
  const modules = {
    // Cobros y gastos solo para quien maneja dinero (P5, D3); con rol desconocido se conserva el comportamiento anterior.
    finance: (active.has("finance") || active.has("payments")) && (role == null || can(role, "money.handle")),
    bookings: active.has("bookings"),
    memberships: active.has("memberships"),
  };

  const inbox = scope === "inbox";
  const today = bogotaDayKey(Date.now());
  // 00:00 de hoy en Bogotá (UTC−5) y 00:00 de mañana.
  const startMs = Date.parse(`${today}T05:00:00Z`);
  const DAY = 86_400_000;
  const bookingFrom = Temporal.Instant.fromEpochMilliseconds(inbox ? startMs - 7 * DAY : startMs);
  const bookingTo = Temporal.Instant.fromEpochMilliseconds(inbox ? startMs + 8 * DAY : startMs + DAY);
  const regFrom = Temporal.Instant.fromEpochMilliseconds(startMs - (inbox ? 30 : 7) * DAY);

  const [movements, bookings, membership, registrations, overdueTasks, readyOrders] = await Promise.all([
    modules.finance ? tenantDb.finance.getMovements(inbox ? 120 : 20) : Promise.resolve([]),
    modules.bookings
      ? db.orm.public.Booking.where({ tenantId })
          .where((b) => and(b.startDate.gte(bookingFrom), b.startDate.lt(bookingTo)))
          .select("id", "customerId", "serviceName", "startDate", "status")
          .all()
      : Promise.resolve([]),
    modules.memberships ? createMembershipsDb(tenantId).getMetrics() : Promise.resolve(null),
    // Altas del registro público: evento `customer.registered`.
    active.has("crm")
      ? db.orm.public.OutboxEvent.where({ tenantId, type: "customer.registered" })
          .where((e) => e.createdAt.gte(regFrom))
          .orderBy((e) => e.createdAt.desc())
          .limit(inbox ? 60 : 20)
          .select("id", "createdAt", "payload")
          .all()
      : Promise.resolve([]),
    active.has("crm") ? overdueCountFor(tenantId, memberId) : Promise.resolve(0),
    // Pedidos listos que siguen esperando entrega: solo para quien maneja pedidos y con la tienda o los pedidos activos.
    (active.has("orders") || active.has("website")) && (role == null || can(role, "money.handle"))
      ? db.orm.public.StoreOrder.where({ tenantId, fulfillment: "READY" }).orderBy((o) => o.createdAt.desc()).limit(10).select("id", "number", "customerName", "createdAt").all()
      : Promise.resolve([]),
  ]);

  const customerIds = [...new Set(bookings.map((b) => b.customerId))];
  const customers = customerIds.length
    ? await db.orm.public.Customer.where({ tenantId }).where((c) => c.id.in(customerIds)).select("id", "name").all()
    : [];
  const names = new Map(customers.map((c) => [c.id, c.name]));

  const marked = new Set((await markedRows).map((d) => d.key));
  const all = buildNotifications({
    movements: inbox ? movements : movements.filter((m) => bogotaDayKey(m.at) === today),
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
    overdueTasks,
    readyOrders: readyOrders.map((o) => ({ id: o.id, code: orderCode(o.number), customer: o.customerName, at: String(o.createdAt) })),
    todayStart: new Date(startMs).toISOString(),
    modules: { ...modules, registrations: active.has("crm") },
    limit: inbox ? 200 : 12,
  });
  return { all, marked };
}

/** Notificaciones de la campana de una persona: lo de hoy, sin las que ya archivó. */
export async function loadNotifications(tenantId: string, memberId: string, role?: string): Promise<AppNotification[]> {
  const { all, marked } = await collect(tenantId, memberId, role, "today");
  return all.filter((n) => !marked.has(n.id));
}

/** El buzón de una persona: el historial reciente con su estado de lectura y de archivo (nada se borra: se archiva). */
export async function loadInbox(tenantId: string, memberId: string, role?: string): Promise<InboxItem[]> {
  const { all, marked } = await collect(tenantId, memberId, role, "inbox");
  return all.map((n) => ({ ...n, read: marked.has(readKey(n.id)), archived: marked.has(n.id) }));
}

const valid = (ids: readonly string[]) => ids.filter((id) => id && id.length <= 190).slice(0, 300);

/** Marca como leídas (o vuelve a no leídas) las notificaciones indicadas. */
export async function setRead(memberId: string, ids: readonly string[], read: boolean): Promise<void> {
  for (const id of valid(ids)) {
    const key = readKey(id);
    if (read) await db.orm.public.DismissedNotification.upsert({ create: { userId: memberId, key }, update: {}, conflictOn: { userId: memberId, key } });
    else await db.orm.public.DismissedNotification.where({ userId: memberId, key }).delete();
  }
}

/** Archiva (o devuelve al buzón) las notificaciones indicadas. */
export async function setArchived(memberId: string, ids: readonly string[], archived: boolean): Promise<void> {
  for (const id of valid(ids)) {
    if (archived) await dismissNotification(memberId, id);
    else await db.orm.public.DismissedNotification.where({ userId: memberId, key: id }).delete();
  }
}

/** Descarta una notificación para esa persona (deslizar o ×). */
export async function dismissNotification(memberId: string, key: string) {
  await db.orm.public.DismissedNotification.upsert({ create: { userId: memberId, key }, update: {}, conflictOn: { userId: memberId, key } });
}
