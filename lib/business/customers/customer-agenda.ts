import { toNumber } from "@/lib/foundation/format";
import { db } from "@/prisma/db";

/**
 * Resumen por cliente para la lista de Clientes: la próxima cita (sin las canceladas) y el saldo abierto por cobrar.
 * Solo lectura, por `tenantId`; no cambia ninguna cita ni obligación.
 */
export type CustomerAgendaSummary = { nextAppointment: string | null; owed: number };

export async function customerAgendaSummary(tenantId: string, customerIds: string[], now = Date.now()): Promise<Map<string, CustomerAgendaSummary>> {
  const out = new Map<string, CustomerAgendaSummary>();
  if (customerIds.length === 0) return out;
  for (const id of customerIds) out.set(id, { nextAppointment: null, owed: 0 });

  const from = Temporal.Instant.fromEpochMilliseconds(now);
  const bookings = await db.orm.public.Booking.where({ tenantId })
    .where((b) => b.customerId.in(customerIds))
    .where((b) => b.startDate.gte(from))
    .where((b) => b.status.neq("CANCELLED"))
    .orderBy((b) => b.startDate.asc())
    .limit(1000)
    .select("customerId", "startDate")
    .all();
  for (const b of bookings) {
    const current = out.get(b.customerId);
    if (current && !current.nextAppointment) current.nextAppointment = String(b.startDate);
  }

  const open = await db.orm.public.Obligation.where({ tenantId, status: "OPEN" })
    .where((o) => o.customerId.in(customerIds))
    .select("customerId", "amount", "paidTotal")
    .limit(5000)
    .all();
  for (const o of open) {
    if (!o.customerId) continue;
    const current = out.get(o.customerId);
    if (current) current.owed = Math.round((current.owed + toNumber(o.amount) - toNumber(o.paidTotal)) * 100) / 100;
  }
  return out;
}
