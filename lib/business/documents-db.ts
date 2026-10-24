import { db } from "@/prisma/db";
import { toNumber } from "@/lib/format";
import { allocateNumber, commitNumber, withholdingsFor } from "@/lib/tax/tax-db";
import { todayCO } from "@/lib/tax/tax";
import {
  canConvert,
  documentTotals,
  lineAmounts,
  salesSummary,
  type DocumentKind,
  type DocumentLineInput,
} from "./commercial-document";

/**
 * Documento comercial unificado (servidor). Todo filtra por `tenantId`. Las
 * escrituras que van con dinero (venta al cobrar, nota crédito al anular) se
 * hacen dentro de la transacción del servicio de dinero, que reintenta si dos
 * documentos toman el mismo consecutivo.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Writer = Pick<Tx, "orm">;

const dec = (n: number) => n.toFixed(2);
const now = () => Temporal.Instant.fromEpochMilliseconds(Date.now());

export type NewDocument = {
  kind: DocumentKind;
  customerId: string | null;
  customerName: string;
  customerDoc?: string | null;
  issueDate?: Temporal.Instant;
  dueDate?: Temporal.Instant | null;
  status?: "ISSUED" | "PAID" | "VOID";
  notes?: string | null;
  projectId?: string | null;
  sourceDocumentId?: string | null;
  originType?: string | null;
  originId?: string | null;
  paymentId?: string | null;
  /** Retenciones que practica quien paga (códigos de `TaxRate`); se calculan con las vigentes a la fecha. */
  withholdingCodes?: readonly string[];
  /** Propina cobrada junto con la venta (no suma al total del documento). */
  tipTotal?: number;
  lines: readonly DocumentLineInput[];
};

/**
 * Crea un documento con su consecutivo por tipo (máximo + 1) y sus líneas,
 * dentro de `tx`. Si otro documento toma el mismo número a la vez, la
 * restricción única `Invoice_tenantId_kind_number_key` hace fallar la
 * transacción y quien la abrió la reintenta.
 */
export async function insertDocument(tx: Writer, tenantId: string, doc: NewDocument, userId: string | null) {
  const issueDate = doc.issueDate ?? now();
  // Con resolución de numeración el número sale de su rango; sin ella, máximo + 1 como siempre.
  const allocation = await allocateNumber(tx, tenantId, doc.kind, todayCO(issueDate.epochMilliseconds));
  const { top } = await tx.orm.public.Invoice.where({ tenantId, kind: doc.kind }).aggregate((a) => ({ top: a.max("number") }));
  const number = allocation ? allocation.number : (top ?? 0) + 1;
  const totals = documentTotals(doc.lines);
  const taxableTotal = Math.round((totals.subtotal - totals.discountTotal) * 100) / 100;
  const withholdings = await withholdingsFor(tx, tenantId, doc.withholdingCodes ?? [], { taxable: taxableTotal, tax: totals.taxTotal }, todayCO(issueDate.epochMilliseconds));
  const withheld = Math.round(withholdings.reduce((s, w) => s + w.amount, 0) * 100) / 100;
  const created = await tx.orm.public.Invoice.create({
    tenantId,
    kind: doc.kind,
    number,
    customerId: doc.customerId,
    customerName: doc.customerName.slice(0, 120),
    customerDoc: doc.customerDoc ?? null,
    issueDate,
    dueDate: doc.dueDate ?? null,
    status: doc.status ?? "ISSUED",
    notes: doc.notes ?? null,
    subtotal: dec(totals.subtotal),
    discountTotal: dec(totals.discountTotal),
    taxTotal: dec(totals.taxTotal),
    total: dec(totals.total),
    createdById: userId,
    projectId: doc.projectId ?? null,
    sourceDocumentId: doc.sourceDocumentId ?? null,
    originType: doc.originType ?? null,
    originId: doc.originId ?? null,
    paymentId: doc.paymentId ?? null,
    resolutionId: allocation?.resolutionId ?? null,
    prefix: allocation?.prefix || null,
    withholdingTotal: dec(withheld),
    tipTotal: dec(doc.tipTotal ?? 0),
    withholdings: withholdings.length ? (withholdings as never) : null,
  });
  if (allocation) await commitNumber(tx, tenantId, allocation);
  for (const l of doc.lines) {
    await tx.orm.public.InvoiceLine.create({
      invoiceId: created.id,
      productId: l.productId ?? null,
      description: l.description.slice(0, 200),
      quantity: dec(l.quantity),
      unitPrice: dec(l.unitPrice),
      discountPct: dec(l.discountPct ?? 0),
      taxRatePct: dec(l.taxRatePct ?? 0),
      total: dec(lineAmounts(l).total),
    });
  }
  return { id: created.id, number, total: totals.total };
}

const isNumberCollision = (e: unknown) => /Invoice_tenantId_kind_number|unique|duplicate/i.test(String((e as Error)?.message ?? e));

/** Crea un documento suelto (cotización, pedido, cuenta de cobro, recibo) en su propia transacción. */
export async function createDocument(tenantId: string, doc: NewDocument, userId: string | null) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.transaction((tx) => insertDocument(tx, tenantId, doc, userId));
    } catch (e) {
      if (attempt >= 5 || !isNumberCollision(e)) throw e;
    }
  }
}

/** Líneas de un documento del negocio, listas para copiar. */
async function documentLines(tx: Writer, invoiceId: string): Promise<DocumentLineInput[]> {
  const rows = await tx.orm.public.InvoiceLine.where({ invoiceId }).all();
  return rows.map((l) => ({
    description: l.description,
    quantity: toNumber(l.quantity),
    unitPrice: toNumber(l.unitPrice),
    productId: l.productId,
    discountPct: toNumber(l.discountPct),
    taxRatePct: toNumber(l.taxRatePct),
  }));
}

/**
 * Convierte un documento en el siguiente de la cadena (cotización → pedido →
 * cuenta de cobro o recibo): crea uno nuevo con las mismas líneas que apunta
 * al anterior. La nota crédito no se hace aquí: va con el dinero
 * (`issueCreditNote`).
 */
export async function convertDocument(tenantId: string, id: string, to: Exclude<DocumentKind, "CREDIT_NOTE" | "SALE">, userId: string) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        const from = await tx.orm.public.Invoice.where({ tenantId, id }).first();
        if (!from) return { ok: false as const, message: "El documento no existe." };
        if (from.status === "VOID") return { ok: false as const, message: "Un documento anulado no se convierte." };
        if (!canConvert(from.kind as DocumentKind, to)) return { ok: false as const, message: "Ese documento no se puede convertir en ese tipo." };
        const created = await insertDocument(
          tx,
          tenantId,
          {
            kind: to,
            customerId: from.customerId,
            customerName: from.customerName,
            customerDoc: from.customerDoc,
            notes: from.notes,
            projectId: from.projectId,
            sourceDocumentId: from.id,
            lines: await documentLines(tx, from.id),
          },
          userId,
        );
        return { ok: true as const, ...created };
      });
    } catch (e) {
      if (attempt >= 5 || !isNumberCollision(e)) throw e;
    }
  }
}

/**
 * Nota crédito de un documento de venta, dentro de la transacción de quien
 * anula el cobro. Copia las líneas, apunta al original y lo marca anulado
 * (el original no se borra: el informe resta la nota crédito). Devuelve
 * `null` si no había documento o ya estaba anulado.
 */
export async function issueCreditNote(tx: Writer, tenantId: string, documentId: string, reason: string, userId: string) {
  const original = await tx.orm.public.Invoice.where({ tenantId, id: documentId }).first();
  if (!original || original.status === "VOID" || !canConvert(original.kind as DocumentKind, "CREDIT_NOTE")) return null;
  const note = await insertDocument(
    tx,
    tenantId,
    {
      kind: "CREDIT_NOTE",
      customerId: original.customerId,
      customerName: original.customerName,
      customerDoc: original.customerDoc,
      status: "ISSUED",
      notes: reason,
      sourceDocumentId: original.id,
      originType: "VOID",
      originId: original.paymentId,
      lines: await documentLines(tx, original.id),
    },
    userId,
  );
  await tx.orm.public.Invoice.where({ tenantId, id: original.id }).update({ status: "VOID", voidReason: reason });
  return note;
}

/** Documento de venta generado por un cobro (para anularlo). */
export async function saleDocumentOfPayment(tx: Writer, tenantId: string, paymentId: string) {
  return tx.orm.public.Invoice.where({ tenantId, paymentId, kind: "SALE" }).select("id").first();
}

/**
 * Ventas de un día de Bogotá (UTC−5) a partir de los documentos: lo vendido
 * menos las notas crédito. Una sola tabla para mostrador, taquilla,
 * membresías y cuentas de cobro pagadas.
 */
export async function salesOfDay(tenantId: string, day: string) {
  const start = Temporal.Instant.from(`${day}T05:00:00Z`);
  const end = Temporal.Instant.fromEpochMilliseconds(start.epochMilliseconds + 86_400_000);
  const rows = await db.orm.public.Invoice.where({ tenantId })
    .where((d) => d.issueDate.gte(start))
    .where((d) => d.issueDate.lt(end))
    .select("kind", "status", "total")
    .all();
  return salesSummary(rows.map((r) => ({ kind: r.kind as DocumentKind, status: String(r.status), total: toNumber(r.total) })));
}
