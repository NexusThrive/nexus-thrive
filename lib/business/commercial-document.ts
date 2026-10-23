/**
 * Documento comercial unificado (Bloque B, paso 2) — reglas puras.
 *
 * Una sola forma de documento para toda la cadena de una venta:
 * cotización → pedido → cuenta de cobro o recibo (o venta registrada al
 * cobrar) → nota crédito. Vive en la tabla `Invoice` (el `kind` dice cuál es)
 * con sus líneas en `InvoiceLine`. Sin base de datos: se prueba aparte.
 */

export const DOCUMENT_KINDS = ["QUOTE", "ORDER", "BILL", "RECEIPT", "SALE", "CREDIT_NOTE"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  QUOTE: "Cotización",
  ORDER: "Pedido",
  BILL: "Cuenta de cobro",
  RECEIPT: "Recibo",
  SALE: "Venta",
  CREDIT_NOTE: "Nota crédito",
};

const PREFIX: Record<DocumentKind, string> = { QUOTE: "C", ORDER: "P", BILL: "CC", RECEIPT: "R", SALE: "V", CREDIT_NOTE: "NC" };

/** Código legible: "V-000042", "NC-000003". Cada tipo lleva su consecutivo. */
export function documentCode(kind: DocumentKind, n: number): string {
  return `${PREFIX[kind]}-${String(n).padStart(6, "0")}`;
}

export function isDocumentKind(value: string): value is DocumentKind {
  return (DOCUMENT_KINDS as readonly string[]).includes(value);
}

/**
 * A qué se puede convertir cada documento. Convertir crea uno nuevo que
 * apunta al anterior (`sourceDocumentId`); el anterior no se modifica.
 * Una venta, recibo o cuenta de cobro solo se corrige con nota crédito.
 */
const NEXT: Record<DocumentKind, readonly DocumentKind[]> = {
  QUOTE: ["ORDER", "BILL", "RECEIPT"],
  ORDER: ["BILL", "RECEIPT"],
  BILL: ["CREDIT_NOTE"],
  RECEIPT: ["CREDIT_NOTE"],
  SALE: ["CREDIT_NOTE"],
  CREDIT_NOTE: [],
};

export function canConvert(from: DocumentKind, to: DocumentKind): boolean {
  return NEXT[from].includes(to);
}

/** Tipos que cuentan como venta en el informe del día. */
export const SALE_KINDS: readonly DocumentKind[] = ["SALE", "BILL", "RECEIPT"];

export type DocumentLineInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  productId?: string | null;
  /** Descuento de la línea en % (0–100). */
  discountPct?: number;
  /** Impuesto de la línea en % (IVA 19, 5 o 0; impoconsumo 8…). */
  taxRatePct?: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Valores de una línea: base (cantidad × precio), descuento, base gravable,
 * impuesto y total. Se redondea a centavos en cada paso, como en un documento
 * impreso.
 */
export function lineAmounts(l: DocumentLineInput) {
  const base = round2(l.quantity * l.unitPrice);
  const discount = round2((base * (l.discountPct ?? 0)) / 100);
  const taxable = round2(base - discount);
  const tax = round2((taxable * (l.taxRatePct ?? 0)) / 100);
  return { base, discount, taxable, tax, total: round2(taxable + tax) };
}

/** Totales del documento: suma de líneas ya redondeadas. */
export function documentTotals(lines: readonly DocumentLineInput[]) {
  const sum = (pick: (a: ReturnType<typeof lineAmounts>) => number) => round2(lines.reduce((s, l) => s + pick(lineAmounts(l)), 0));
  return {
    subtotal: sum((a) => a.base),
    discountTotal: sum((a) => a.discount),
    taxTotal: sum((a) => a.tax),
    total: sum((a) => a.total),
  };
}

/** Error legible del primer problema de las líneas, o `null`. */
export function validateDocumentLines(lines: readonly DocumentLineInput[]): string | null {
  if (!lines.length) return "Agrega al menos un concepto.";
  for (const [i, l] of lines.entries()) {
    const n = i + 1;
    if (l.description.trim().length < 2) return `Concepto ${n}: escribe la descripción.`;
    if (!(l.quantity > 0)) return `Concepto ${n}: la cantidad debe ser mayor que cero.`;
    if (!(l.unitPrice >= 0)) return `Concepto ${n}: el valor no puede ser negativo.`;
    const d = l.discountPct ?? 0;
    if (!(d >= 0 && d <= 100)) return `Concepto ${n}: el descuento va de 0 % a 100 %.`;
    const t = l.taxRatePct ?? 0;
    if (!(t >= 0 && t <= 100)) return `Concepto ${n}: el impuesto va de 0 % a 100 %.`;
  }
  return null;
}

/**
 * Informe de ventas a partir de documentos: lo vendido (venta, recibo o
 * cuenta de cobro pagada) menos las notas crédito emitidas en el periodo.
 */
export function salesSummary(docs: readonly { kind: DocumentKind; status: string; total: number }[]) {
  let gross = 0;
  let credits = 0;
  let count = 0;
  for (const d of docs) {
    if (d.kind === "CREDIT_NOTE") credits += d.total;
    else if (d.kind === "SALE" || ((d.kind === "BILL" || d.kind === "RECEIPT") && d.status === "PAID")) {
      gross += d.total;
      count += 1;
    }
  }
  return { gross: round2(gross), credits: round2(credits), net: round2(gross - credits), documents: count };
}
