import { toNumber } from "@/lib/format";
import { MoneyError, moneyTransaction } from "@/lib/business/money-service";
import { todayCO } from "@/lib/tax/tax";
import { db } from "@/prisma/db";
import { ageItems, balanceOf, bucketOf, daysOverdue, validatePayment, type Aging, type Bucket } from "./aging";

/**
 * Cartera (servidor). Por cobrar: cuentas de cobro emitidas con saldo. Por pagar:
 * facturas de proveedor registradas con saldo. Todo con `tenantId`.
 */
export type CarteraRow = {
  id: string;
  /** Cliente o proveedor. */
  party: string;
  /** Número del documento (N.º de cuenta o el de la factura del proveedor). */
  number: string;
  dueDate: string | null;
  total: number;
  paid: number;
  balance: number;
  daysOverdue: number;
  bucket: Bucket;
};
export type Cartera = { rows: CarteraRow[]; aging: Aging };

const day = (v: unknown): string | null => (v ? String(v).slice(0, 10) : null);

function build(rows: Omit<CarteraRow, "balance" | "daysOverdue" | "bucket">[], today: string): Cartera {
  const full = rows
    .map((r) => ({ ...r, balance: balanceOf(r.total, r.paid), daysOverdue: daysOverdue(r.dueDate, today), bucket: bucketOf(r.dueDate, today) }))
    .filter((r) => r.balance > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  return { rows: full, aging: ageItems(full, today) };
}

export async function receivables(tenantId: string, today = todayCO()): Promise<Cartera> {
  const docs = await db.orm.public.Invoice.where({ tenantId, kind: "BILL", status: "ISSUED" }).all();
  return build(
    docs.map((d) => ({ id: d.id, party: d.customerName, number: `CC-${String(d.number).padStart(6, "0")}`, dueDate: day(d.dueDate), total: toNumber(d.total), paid: toNumber(d.paidTotal) })),
    today,
  );
}

export async function payables(tenantId: string, today = todayCO()): Promise<Cartera> {
  const docs = await db.orm.public.SupplierInvoice.where({ tenantId, status: "REGISTERED" }).all();
  const ids = [...new Set(docs.map((d) => d.supplierPartyId))];
  const parties = ids.length ? await db.orm.public.Party.where({ tenantId }).where((p) => p.id.in(ids)).select("id", "legalName").all() : [];
  const names = new Map(parties.map((p) => [p.id, p.legalName]));
  return build(
    docs.map((d) => ({ id: d.id, party: names.get(d.supplierPartyId) ?? "Proveedor", number: d.number, dueDate: day(d.dueDate), total: toNumber(d.total), paid: toNumber(d.paidTotal) })),
    today,
  );
}

/**
 * Pago o abono a una factura de proveedor: se guarda el pago y baja el saldo en la
 * misma transacción; si lo salda, la factura queda pagada. Dos pagos a la vez no se pisan.
 */
export async function paySupplierInvoice(
  tenantId: string,
  id: string,
  input: { amount: number; method: string; note?: string | null },
  userId: string,
): Promise<{ ok: true; balance: number; settled: boolean } | { ok: false; message: string }> {
  try {
    return await moneyTransaction(async (tx) => {
      const inv = await tx.orm.public.SupplierInvoice.where({ tenantId, id }).first();
      if (!inv || inv.status !== "REGISTERED") throw new MoneyError("Solo se pagan facturas de proveedor registradas.");
      const total = toNumber(inv.total);
      const paidBefore = toNumber(inv.paidTotal);
      const balance = balanceOf(total, paidBefore);
      const problem = validatePayment(input.amount, balance);
      if (problem) throw new MoneyError(problem);
      const paid = Math.round((paidBefore + input.amount) * 100) / 100;
      const settled = paid >= total;
      const plan = tx.sql.public.SupplierInvoice.update({ paidTotal: paid.toFixed(2), ...(settled ? { status: "PAID" } : {}) })
        .where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "REGISTERED"), fns.eq(f.paidTotal, paidBefore.toFixed(2))))
        .returning("id")
        .build();
      if ((await tx.query(plan)).length === 0) throw new MoneyError("La factura cambió mientras pagabas. Vuelve a intentarlo.");
      await tx.orm.public.SupplierPayment.create({ tenantId, supplierInvoiceId: id, amount: input.amount.toFixed(2), method: input.method.slice(0, 20), note: input.note?.slice(0, 200) || null, createdById: userId });
      return { ok: true as const, balance: Math.round((balance - input.amount) * 100) / 100, settled };
    });
  } catch (e) {
    if (e instanceof MoneyError) return { ok: false as const, message: e.message };
    throw e;
  }
}
