import { and } from "@prisma/orm-postgres/orm-client";
import { db } from "@/prisma/db";
import { toNumber } from "@/lib/format";
import { bogotaDayKey } from "@/lib/finance/series";
import { addDaysKey, bogotaToMs } from "./calendar";
import { recordCharge } from "./charge";
import { payTicketSale as payTicketSaleOnce } from "./money-service";
import { voidPayment, withNextNumber } from "./finance-db";
import { listProducts } from "./products-db";
import { museumSettings, saleKindLabel, slotLoads, ticketCode, validateTicketSale, type MuseumSettings, type SaleLike, type TicketLineInput } from "./museum";

/**
 * Taquilla del museo (servidor, aislado por tenant): ventas numeradas por
 * franja con aforo, reservas de grupos y colegios (que pasan a la agenda),
 * cobro con recibo y anulación.
 */

const instant = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms);

export async function getMuseumSettings(tenantId: string): Promise<MuseumSettings> {
  const t = await db.orm.public.Tenant.where({ id: tenantId }).select("settings").first();
  return museumSettings(t?.settings);
}

export async function saveMuseumSettings(tenantId: string, value: MuseumSettings) {
  const t = await db.orm.public.Tenant.where({ id: tenantId }).select("settings").first();
  const current = t?.settings && typeof t.settings === "object" ? (t.settings as Record<string, unknown>) : {};
  await db.orm.public.Tenant.where({ id: tenantId }).update({ settings: { ...current, museum: value } });
}

export type TicketSaleRow = SaleLike & { id: string; number: number; code: string; visitDate: string; groupName: string | null; customerId: string | null; customerName: string | null; paymentId: string | null; bookingId: string | null; createdAt: string };

function toRow(r: { id: string; number: number; visitDate: unknown; slot: string; visitors: number; lines: unknown; total: string; kind: string; groupName: string | null; customerId: string | null; paymentId: string | null; status: string; bookingId: string | null; createdAt: unknown }, names: Map<string, string>): TicketSaleRow {
  return {
    id: r.id,
    number: r.number,
    code: ticketCode(r.number),
    visitDate: bogotaDayKey(String(r.visitDate)),
    slot: r.slot,
    visitors: r.visitors,
    lines: Array.isArray(r.lines) ? (r.lines as SaleLike["lines"]) : [],
    total: toNumber(r.total),
    kind: r.kind,
    groupName: r.groupName,
    customerId: r.customerId,
    customerName: r.customerId ? (names.get(r.customerId) ?? null) : null,
    paymentId: r.paymentId,
    status: r.status,
    bookingId: r.bookingId,
    createdAt: String(r.createdAt),
  };
}

/** Ventas con visita entre dos días (YYYY-MM-DD, `to` excluido). */
export async function salesBetween(tenantId: string, fromDay: string, toDay: string): Promise<TicketSaleRow[]> {
  const rows = await db.orm.public.TicketSale.where({ tenantId })
    .where((s) => and(s.visitDate.gte(instant(bogotaToMs(fromDay, "00:00"))), s.visitDate.lt(instant(bogotaToMs(toDay, "00:00")))))
    .orderBy([(s) => s.visitDate.asc(), (s) => s.number.asc()])
    .all();
  const ids = [...new Set(rows.map((r) => r.customerId).filter((x): x is string => !!x))];
  const people = ids.length ? await db.orm.public.Customer.where({ tenantId }).where((c) => c.id.in(ids)).select("id", "name").all() : [];
  const names = new Map(people.map((p) => [p.id, p.name]));
  return rows.map((r) => toRow(r, names));
}

export const salesOn = (tenantId: string, day: string) => salesBetween(tenantId, day, addDaysKey(day, 1));

/** Tipos de entrada activos (productos TICKET) con su precio. */
export async function ticketTypes(tenantId: string) {
  return (await listProducts(tenantId, { kind: "TICKET", activeOnly: true })).map((p) => ({ id: p.id, name: p.name, price: p.price }));
}

/** Crea los tipos de entrada sugeridos si el museo aún no tiene ninguno. */
export async function seedTicketTypes(tenantId: string) {
  if ((await listProducts(tenantId, { kind: "TICKET" })).length) return false;
  const base = [
    ["General", 15000],
    ["Estudiante", 8000],
    ["Niño (menor de 12)", 6000],
    ["Adulto mayor", 8000],
    ["Extranjero", 25000],
    ["Colegio (por estudiante)", 5000],
  ] as const;
  for (const [name, price] of base) {
    await db.orm.public.Product.create({ tenantId, kind: "TICKET", name, price: price.toFixed(2), category: "Taquilla" });
  }
  return true;
}

export type NewSale = { day: string; slot: string; kind: string; lines: TicketLineInput[]; groupName: string | null; customerId: string | null; pay: { method: string } | null };

/** Vende (o reserva) entradas para una franja. Las guiadas y de colegio quedan en la agenda. */
export async function createTicketSale(tenantId: string, input: NewSale, userId: string): Promise<{ ok: true; id: string; code: string; receipt: string | null } | { ok: false; message: string }> {
  const [settings, types, day] = await Promise.all([getMuseumSettings(tenantId), ticketTypes(tenantId), salesOn(tenantId, input.day)]);
  const load = slotLoads(settings, day).find((l) => l.slot === input.slot && settings.slots.includes(l.slot));
  if (input.customerId && !(await db.orm.public.Customer.where({ tenantId, id: input.customerId }).select("id").first())) return { ok: false, message: "El cliente no es de este negocio." };
  const v = validateTicketSale(input, { settings, load, todayKey: bogotaDayKey(Date.now()), prices: new Map(types.map((t) => [t.id, { name: t.name, price: t.price }])) });
  if (!v.ok) return v;

  const at = bogotaToMs(input.day, input.slot);
  const group = input.groupName?.trim().slice(0, 120) || null;
  const sale = await withNextNumber(
    async () => (await db.orm.public.TicketSale.where({ tenantId }).aggregate((a) => ({ top: a.max("number") }))).top,
    (n) =>
      db.orm.public.TicketSale.create({
        tenantId,
        number: n,
        visitDate: instant(at),
        slot: input.slot,
        visitors: v.visitors,
        lines: v.lines,
        total: v.total.toFixed(2),
        kind: input.kind,
        groupName: group,
        customerId: input.customerId,
        status: input.pay ? "PAID" : "RESERVED",
        createdById: userId,
      }),
  );
  const code = ticketCode(sale.number);

  let receipt: string | null = null;
  if (input.pay && v.total > 0) {
    const charge = await recordCharge(tenantId, { amount: v.total, method: input.pay.method, customerId: input.customerId, description: `Taquilla ${code} · ${v.visitors} ${v.visitors === 1 ? "entrada" : "entradas"} · ${input.slot}`, sourceType: "TICKET_SALE", sourceId: sale.id }, userId);
    receipt = charge.receipt;
    await db.orm.public.TicketSale.where({ tenantId, id: sale.id }).update({ paymentId: charge.paymentId });
  }

  if ((input.kind === "GUIADA" || input.kind === "COLEGIO") && input.customerId) {
    const booking = await db.orm.public.Booking.create({
      tenantId,
      customerId: input.customerId,
      serviceName: `${saleKindLabel(input.kind)} · ${group ?? code}`.slice(0, 120),
      startDate: instant(at),
      endDate: instant(at + settings.guidedMinutes * 60_000),
      partySize: v.visitors,
      kind: "VISIT",
      totalAmount: BigInt(Math.round(v.total)),
      notes: `Taquilla ${code}`,
      status: input.pay ? "CONFIRMED" : "PENDING",
      createdAt: instant(Date.now()),
      updatedAt: instant(Date.now()),
    });
    await db.orm.public.TicketSale.where({ tenantId, id: sale.id }).update({ bookingId: booking.id });
  }
  return { ok: true, id: sale.id, code, receipt };
}

/** Cobra una reserva de grupo (pasa a pagada y confirma la visita en la agenda). */
export async function payTicketSale(tenantId: string, id: string, method: string, userId: string) {
  // Una sola vez y en una transacción (lib/business/money-service.ts): dos clics no cobran dos veces.
  return payTicketSaleOnce(tenantId, id, method, userId, (s) => `Taquilla ${ticketCode(s.number)} · ${s.visitors} entradas · ${s.slot}`);
}

/** Anula: libera el aforo, anula el cobro (si entró a caja, la caja lo devuelve) y cancela la visita. */
export async function voidTicketSale(tenantId: string, id: string, reason: string, userId: string) {
  const s = await db.orm.public.TicketSale.where({ tenantId, id }).first();
  if (!s) return { ok: false as const, message: "La venta no existe." };
  if (s.status === "VOID") return { ok: false as const, message: "Ya estaba anulada." };
  await db.orm.public.TicketSale.where({ tenantId, id }).update({ status: "VOID" });
  if (s.paymentId) await voidPayment(tenantId, s.paymentId, `Taquilla ${ticketCode(s.number)}: ${reason}`.slice(0, 200), userId);
  if (s.bookingId) await db.orm.public.Booking.where({ tenantId, id: s.bookingId }).update({ status: "CANCELLED", updatedAt: instant(Date.now()) });
  return { ok: true as const };
}

/** Visitantes de un día (para el Inicio). */
export async function visitorsOn(tenantId: string, day: string): Promise<{ visitors: number; revenue: number }> {
  const sales = (await salesOn(tenantId, day)).filter((s) => s.status !== "VOID");
  return { visitors: sales.reduce((a, s) => a + s.visitors, 0), revenue: sales.filter((s) => s.status === "PAID").reduce((a, s) => a + s.total, 0) };
}
