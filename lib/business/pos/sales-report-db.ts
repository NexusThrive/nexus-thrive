import { db } from "@/prisma/db";
import { toNumber } from "@/lib/foundation/format";
import { periodStart, summarizeSales, type ReportPeriod, type ReportSale, type SalesReport } from "./sales-report";

export type SalesReportView = SalesReport & { period: ReportPeriod; since: string; cashiers: Record<string, string>; truncated: boolean };

const CAP = 2000;

/** Ventas del periodo (mostrador y cobros registrados, sin las anuladas), con sus líneas, medios de pago y quién las hizo. */
export async function salesReport(tenantId: string, period: ReportPeriod, now: Date = new Date()): Promise<SalesReportView> {
  const since = periodStart(period, now);
  const sinceInstant = Temporal.Instant.fromEpochMilliseconds(since.getTime());
  const invoices = await db.orm.public.Invoice.where({ tenantId, kind: "SALE" })
    .where((i) => i.status.neq("VOID"))
    .where((i) => i.createdAt.gte(sinceInstant))
    .select("id", "total", "tipTotal", "createdById")
    .orderBy((i) => i.createdAt.desc())
    .limit(CAP + 1)
    .all();
  const truncated = invoices.length > CAP;
  const sales = invoices.slice(0, CAP);
  const ids = sales.map((s) => s.id);
  const [lines, payments, members] = ids.length
    ? await Promise.all([
        db.orm.public.InvoiceLine.where((l) => l.invoiceId.in(ids)).select("invoiceId", "productId", "description", "quantity", "total").limit(20_000).all(),
        db.orm.public.Payment.where({ tenantId, sourceType: "POS" }).where((p) => p.sourceId.in(ids)).where((p) => p.status.eq("APPROVED")).select("sourceId", "provider", "amount", "notes").limit(10_000).all(),
        db.orm.public.User.where({ tenantId }).select("id", "name", "email").limit(500).all(),
      ])
    : [[], [], []];
  const linesBy = new Map<string, ReportSale["lines"]>();
  for (const l of lines) linesBy.set(l.invoiceId, [...(linesBy.get(l.invoiceId) ?? []), { productId: l.productId, name: l.description.split(" — ")[0] ?? l.description, quantity: toNumber(l.quantity), total: toNumber(l.total) }]);
  const paysBy = new Map<string, ReportSale["payments"]>();
  for (const p of payments) {
    if (!p.sourceId) continue;
    // El medio que eligió el negocio (Nequi…) queda en las notas; sin él, el tipo base.
    paysBy.set(p.sourceId, [...(paysBy.get(p.sourceId) ?? []), { method: p.notes?.trim() || (p.provider === "CASH" ? "Efectivo" : p.provider === "TRANSFER" ? "Transferencia" : String(p.provider)), amount: toNumber(p.amount) }]);
  }
  const report = summarizeSales(sales.map((s) => ({ id: s.id, total: toNumber(s.total), tip: toNumber(s.tipTotal), cashierId: s.createdById, lines: linesBy.get(s.id) ?? [], payments: paysBy.get(s.id) ?? [] })));
  return { ...report, period, since: since.toISOString(), truncated, cashiers: Object.fromEntries(members.map((m) => [m.id, m.name?.trim() || m.email])) };
}
