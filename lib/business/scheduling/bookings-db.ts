import { db } from "@/prisma/db";

/**
 * Agenda del negocio (citas, clases, reservas). Todo filtra por `tenantId`.
 * Las reglas de horario, choques y cupo son puras y viven en `calendar.ts`.
 */

const instant = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms);

/** Citas que empiezan entre `fromMs` (incluido) y `toMs` (excluido), en orden. */
export async function bookingsBetween(tenantId: string, fromMs: number, toMs: number) {
  return db.orm.public.Booking.where({ tenantId })
    .where((b) => b.startDate.gte(instant(fromMs)))
    .where((b) => b.startDate.lt(instant(toMs)))
    .orderBy((b) => b.startDate.asc())
    .all();
}

/** Citas que se cruzan con el intervalo [startMs, endMs) (para choques y cupo). */
export async function bookingsOverlapping(tenantId: string, startMs: number, endMs: number) {
  return db.orm.public.Booking.where({ tenantId })
    .where((b) => b.startDate.lt(instant(endMs)))
    .where((b) => b.endDate.gt(instant(startMs)))
    .select("id", "startDate", "endDate", "staffUserId", "productId", "partySize", "status")
    .all();
}

/** Clientes activos con teléfono (para agendar y recordar), por nombre. */
export async function customerPhoneOptions(tenantId: string, limit = 500) {
  return db.orm.public.Customer.where({ tenantId, active: true }).select("id", "name", "phone").orderBy((c) => c.name.asc()).limit(limit).all();
}

/** Clientes del negocio por id (también archivados), con teléfono. */
export async function customersByIds(tenantId: string, ids: readonly string[]) {
  if (ids.length === 0) return [];
  return db.orm.public.Customer.where({ tenantId }).where((c) => c.id.in([...new Set(ids)])).select("id", "name", "phone").all();
}

/** Integrantes activos del negocio (responsables de una cita). */
export async function activeTeam(tenantId: string) {
  return db.orm.public.User.where({ tenantId, active: true }).select("id", "name", "email").all();
}

/** ¿`userId` es un integrante activo de este negocio? */
export async function isActiveTeamMember(tenantId: string, userId: string): Promise<boolean> {
  return (await db.orm.public.User.where({ tenantId, id: userId, active: true }).select("id").first()) !== null;
}

type BookingData = {
  customerId: string;
  productId: string | null;
  serviceName: string;
  startDate: Temporal.Instant;
  endDate: Temporal.Instant;
  staffUserId: string | null;
  partySize: number;
  kind: string;
  totalAmount: bigint;
  notes: string | null;
};

/**
 * Crea la cita (confirmada) o mueve una existente (y borra su recordatorio
 * enviado). Devuelve el id, o `null` si `id` no es una cita de este negocio.
 */
export async function saveBooking(tenantId: string, id: string | null, data: BookingData): Promise<string | null> {
  const now = instant(Date.now());
  if (id) {
    const exists = await db.orm.public.Booking.where({ tenantId, id }).select("id").first();
    if (!exists) return null;
    await db.orm.public.Booking.where({ tenantId, id }).update({ ...data, updatedAt: now, reminderSentAt: null });
    return id;
  }
  return (await db.orm.public.Booking.create({ tenantId, ...data, status: "CONFIRMED", updatedAt: now, createdAt: now })).id;
}

/** Cambia el estado de una cita del negocio. `false` si no existe. */
export async function setBookingStatus(tenantId: string, id: string, status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED") {
  const b = await db.orm.public.Booking.where({ tenantId, id }).select("id").first();
  if (!b) return false;
  await db.orm.public.Booking.where({ tenantId, id }).update({ status: status as "CONFIRMED", updatedAt: instant(Date.now()) });
  return true;
}

/** Marca el recordatorio de la cita como enviado. */
export async function markBookingReminder(tenantId: string, id: string) {
  await db.orm.public.Booking.where({ tenantId, id }).update({ reminderSentAt: instant(Date.now()) });
}
