import { db } from "@/prisma/db";
import { toNumber } from "@/lib/foundation/format";
import { msOf } from "@/lib/core/events/instant";
import { summarizePurchases, type PurchaseLine, type PurchaseSummary } from "./purchases";

/** Lo que compró una persona: ventas registradas (mostrador, cobros y pedidos pagados) menos las anuladas, y lo que devolvió. */
export type CustomerPurchases = PurchaseSummary & { returns: { count: number; total: number } };

export async function customerPurchases(tenantId: string, customerId: string): Promise<CustomerPurchases> {
  const sales = await db.orm.public.Invoice.where({ tenantId, customerId, kind: "SALE" }).where((i) => i.status.neq("VOID")).select("id", "issueDate", "createdAt").orderBy((i) => i.createdAt.desc()).limit(500).all();
  const ids = sales.map((s) => s.id);
  const [lines, notes] = ids.length
    ? await Promise.all([
        db.orm.public.InvoiceLine.where((l) => l.invoiceId.in(ids)).select("invoiceId", "productId", "description", "quantity", "total").limit(5000).all(),
        db.orm.public.Invoice.where({ tenantId, kind: "CREDIT_NOTE" }).where((i) => i.sourceDocumentId.in(ids)).where((i) => i.status.neq("VOID")).select("total").limit(500).all(),
      ])
    : [[], []];
  const dateOf = new Map(sales.map((s) => [s.id, new Date(msOf(s.issueDate) ?? msOf(s.createdAt) ?? 0).toISOString()]));
  const purchaseLines: PurchaseLine[] = lines.map((l) => ({ productId: l.productId, name: l.description.split(" — ")[0] ?? l.description, quantity: toNumber(l.quantity), total: toNumber(l.total), date: dateOf.get(l.invoiceId) ?? "" })).filter((l) => l.date);
  return { ...summarizePurchases(purchaseLines), returns: { count: notes.length, total: notes.reduce((s, n) => s + toNumber(n.total), 0) } };
}
