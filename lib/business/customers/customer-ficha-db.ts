import { toNumber } from "@/lib/foundation/format";
import { createTenantDb } from "@/lib/core/tenancy/db";
import { db } from "@/prisma/db";
import { customerAgendaSummary } from "./customer-agenda";

/**
 * Datos de la ficha del cliente que no trae la vista 360: identidad fiscal (tercero), citas, facturas, saldo y la posición del
 * cliente en la lista de la que vino. Solo lectura, por `tenantId`.
 */
export type FichaBooking = { id: string; start: string; title: string; status: string };
export type FichaInvoice = { id: string; number: string; issueDate: string; total: number; status: string };
export type CustomerFichaData = {
  kind: "PERSON" | "COMPANY";
  documentType: string | null;
  documentNumber: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string;
  source: string | null;
  tags: string[];
  photoId: string | null;
  createdAt: string;
  bookings: FichaBooking[];
  bookingsCount: number;
  invoices: FichaInvoice[];
  invoicedTotal: number;
  owed: number;
};

export async function customerFicha(tenantId: string, customerId: string): Promise<CustomerFichaData | null> {
  const customer = await db.orm.public.Customer.where({ tenantId, id: customerId }).first();
  if (!customer) return null;
  const [party, bookings, bookingsCount, invoices, agenda] = await Promise.all([
    customer.partyId ? db.orm.public.Party.where({ tenantId, id: customer.partyId }).first() : Promise.resolve(null),
    db.orm.public.Booking.where({ tenantId, customerId }).orderBy((b) => b.startDate.desc()).limit(30).select("id", "startDate", "serviceName", "status").all(),
    db.orm.public.Booking.where({ tenantId, customerId }).aggregate((a) => ({ n: a.count() })),
    db.orm.public.Invoice.where({ tenantId, customerId }).orderBy((i) => i.issueDate.desc()).limit(200).select("id", "number", "prefix", "issueDate", "total", "status").all(),
    customerAgendaSummary(tenantId, [customerId]),
  ]);
  const live = invoices.filter((i) => i.status !== "VOID");
  return {
    kind: party?.kind === "COMPANY" ? "COMPANY" : "PERSON",
    documentType: party?.documentType ?? null,
    documentNumber: customer.documentId ?? party?.documentNumber ?? null,
    address: party?.addressLine ?? null,
    city: customer.city ?? party?.city ?? null,
    region: party?.region ?? null,
    country: party?.countryCode ?? "CO",
    source: customer.source && customer.source !== "MANUAL" ? customer.source : null,
    tags: [...(customer.tags ?? [])],
    photoId: customer.photoId ?? null,
    createdAt: String(customer.createdAt),
    bookings: bookings.map((b) => ({ id: b.id, start: String(b.startDate), title: b.serviceName, status: String(b.status) })),
    bookingsCount: Number(bookingsCount.n ?? 0),
    invoices: invoices.slice(0, 30).map((i) => ({ id: i.id, number: `${i.prefix ?? ""}${i.number}`, issueDate: String(i.issueDate), total: toNumber(i.total), status: String(i.status) })),
    invoicedTotal: Math.round(live.reduce((sum, i) => sum + toNumber(i.total), 0) * 100) / 100,
    owed: agenda.get(customerId)?.owed ?? 0,
  };
}

/**
 * Posición del cliente en la lista de la que vino (mismo texto, estado y orden) para el paginador «‹ 1 / 5 ›». Usa la misma
 * búsqueda que la lista: no repite su lógica. Si no está en la lista, `null`.
 */
export async function customerNeighbors(
  tenantId: string,
  customerId: string,
  list: { q?: string; status?: "active" | "archived"; sort?: "recent" | "name_asc" | "name_desc" },
): Promise<{ index: number; total: number; prev: string | null; next: string | null } | null> {
  const result = await createTenantDb(tenantId).customers.search({ ...list, page: 1, pageSize: 1000 });
  const ids = result.rows.map((r) => r.id);
  const index = ids.indexOf(customerId);
  if (index === -1) return null;
  return { index: index + 1, total: Math.min(result.total, ids.length), prev: ids[index - 1] ?? null, next: ids[index + 1] ?? null };
}
