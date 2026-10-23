"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/prisma/db";
import { bogotaToMs, capacityLeft, staffConflict } from "@/lib/business/calendar";
import { getProduct } from "@/lib/business/products-db";
import { requireTenantContext } from "@/lib/tenant/context";

export type AgendaResult = { ok: true; message?: string; id?: string } | { ok: false; message: string; field?: string };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const KINDS = ["APPOINTMENT", "CLASS", "DELIVERY", "VISIT", "DEPARTURE"];
const instant = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms);

export type BookingInput = {
  id?: string | null;
  customerId: string;
  productId: string | null;
  serviceName: string;
  day: string;
  time: string;
  durationMinutes: number;
  staffUserId: string | null;
  partySize: number;
  amount: number | null;
  notes: string;
  kind?: string;
};

/** Crea o mueve una cita: valida horario, responsable libre y cupo del servicio. */
export async function saveBookingAction(slug: string, v: BookingInput): Promise<AgendaResult> {
  const ctx = await requireTenantContext(slug);
  if (!ctx) return { ok: false, message: "No tienes acceso a este negocio." };
  if (!v.customerId) return { ok: false, message: "Elige el cliente.", field: "customerId" };
  if (!DATE.test(v.day) || !TIME.test(v.time)) return { ok: false, message: "Fecha u hora no válida.", field: "time" };
  const minutes = Math.round(v.durationMinutes);
  if (!(minutes >= 5 && minutes <= 24 * 60)) return { ok: false, message: "La duración va de 5 minutos a 24 horas.", field: "durationMinutes" };
  const party = Math.round(v.partySize || 1);
  if (!(party >= 1 && party <= 500)) return { ok: false, message: "Cantidad de personas no válida.", field: "partySize" };
  const customer = await db.orm.public.Customer.where({ tenantId: ctx.tenantId, id: v.customerId }).select("id").first();
  if (!customer) return { ok: false, message: "El cliente no es de este negocio.", field: "customerId" };
  const product = v.productId ? await getProduct(ctx.tenantId, v.productId) : null;
  if (v.productId && !product) return { ok: false, message: "El servicio no existe.", field: "productId" };
  const serviceName = (product?.name ?? v.serviceName).trim();
  if (serviceName.length < 2) return { ok: false, message: "Escribe el servicio.", field: "serviceName" };
  if (v.staffUserId && !(await db.orm.public.User.where({ tenantId: ctx.tenantId, id: v.staffUserId, active: true }).select("id").first())) return { ok: false, message: "Esa persona no está en el equipo.", field: "staffUserId" };

  const start = bogotaToMs(v.day, v.time);
  const end = start + minutes * 60_000;
  const nearby = await db.orm.public.Booking.where({ tenantId: ctx.tenantId })
    .where((b) => b.startDate.lt(instant(end)))
    .where((b) => b.endDate.gt(instant(start)))
    .select("id", "startDate", "endDate", "staffUserId", "productId", "partySize", "status")
    .all();
  const slots = nearby.map((b) => ({ id: b.id, start: Date.parse(String(b.startDate)), end: Date.parse(String(b.endDate)), staffUserId: b.staffUserId, productId: b.productId, partySize: b.partySize, status: b.status }));
  const candidate = { id: v.id ?? undefined, start, end, staffUserId: v.staffUserId, productId: v.productId, partySize: party };
  const clash = staffConflict(candidate, slots);
  if (clash) return { ok: false, message: "Esa persona ya tiene otra cita en ese horario.", field: "staffUserId" };
  const left = capacityLeft(candidate, slots, product?.capacity ?? null);
  if (left != null && left < 0) return { ok: false, message: `No hay cupo: quedan ${left + party} lugares en ese horario.`, field: "partySize" };

  const amount = v.amount ?? (product ? product.price * party : 0);
  const data = {
    customerId: v.customerId,
    productId: product?.id ?? null,
    serviceName: serviceName.slice(0, 120),
    startDate: instant(start),
    endDate: instant(end),
    staffUserId: v.staffUserId,
    partySize: party,
    kind: KINDS.includes(v.kind ?? "") ? v.kind! : "APPOINTMENT",
    totalAmount: BigInt(Math.round(Math.max(0, amount))),
    notes: v.notes.trim().slice(0, 500) || null,
    updatedAt: instant(Date.now()),
  };
  let id = v.id ?? null;
  if (id) {
    const exists = await db.orm.public.Booking.where({ tenantId: ctx.tenantId, id }).select("id").first();
    if (!exists) return { ok: false, message: "La cita no existe." };
    await db.orm.public.Booking.where({ tenantId: ctx.tenantId, id }).update({ ...data, reminderSentAt: null });
  } else {
    id = (await db.orm.public.Booking.create({ tenantId: ctx.tenantId, ...data, status: "CONFIRMED", createdAt: instant(Date.now()) })).id;
  }
  revalidatePath(`/${slug}/bookings`);
  revalidatePath(`/${slug}`);
  return { ok: true, id, message: v.id ? "Cita actualizada" : "Cita agendada" };
}

export async function setBookingStatusAction(slug: string, id: string, status: string): Promise<AgendaResult> {
  const ctx = await requireTenantContext(slug);
  if (!ctx) return { ok: false, message: "No tienes acceso." };
  if (!["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].includes(status)) return { ok: false, message: "Estado no válido." };
  const b = await db.orm.public.Booking.where({ tenantId: ctx.tenantId, id }).select("id").first();
  if (!b) return { ok: false, message: "La cita no existe." };
  await db.orm.public.Booking.where({ tenantId: ctx.tenantId, id }).update({ status: status as "CONFIRMED", updatedAt: instant(Date.now()) });
  revalidatePath(`/${slug}/bookings`);
  revalidatePath(`/${slug}`);
  return { ok: true, message: status === "CANCELLED" ? "Cita cancelada" : status === "COMPLETED" ? "Cita completada" : "Cita confirmada" };
}

/** Marca el recordatorio como enviado (el envío lo hace WhatsApp). */
export async function markReminderAction(slug: string, id: string): Promise<AgendaResult> {
  const ctx = await requireTenantContext(slug);
  if (!ctx) return { ok: false, message: "No tienes acceso." };
  await db.orm.public.Booking.where({ tenantId: ctx.tenantId, id }).update({ reminderSentAt: instant(Date.now()) });
  revalidatePath(`/${slug}/bookings`);
  return { ok: true };
}
