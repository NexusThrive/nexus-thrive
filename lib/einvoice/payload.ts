import { DOCUMENT_LABELS, type DocumentKind } from "@/lib/business/commercial-document";
import type { FiscalKind, FiscalParty, FiscalPayload } from "./port";

/** Tipo fiscal de un documento comercial, o `null` si no se factura (cotizaciones y pedidos no lo son). */
export function fiscalKindOf(kind: string): FiscalKind | null {
  switch (kind) {
    case "SALE":
    case "BILL":
    case "RECEIPT":
      return "INVOICE";
    case "CREDIT_NOTE":
      return "CREDIT_NOTE";
    case "DEBIT_NOTE":
      return "DEBIT_NOTE";
    default:
      return null;
  }
}

export function buildFiscalPayload(input: {
  kind: FiscalKind;
  documentKind: DocumentKind;
  code: string;
  number: number;
  prefix?: string | null;
  issueDate: string;
  issuer: FiscalParty;
  acquirer: FiscalParty;
  lines: FiscalPayload["lines"];
  totals: { subtotal: number; discountTotal: number; taxTotal: number; total: number };
  relatedCode?: string | null;
  notes?: string | null;
}): FiscalPayload {
  return {
    kind: input.kind,
    code: input.code,
    number: input.number,
    prefix: input.prefix ?? null,
    issueDate: input.issueDate,
    currency: "COP",
    issuer: input.issuer,
    acquirer: input.acquirer,
    lines: input.lines,
    ...input.totals,
    relatedCode: input.relatedCode ?? null,
    notes: input.notes ?? `${DOCUMENT_LABELS[input.documentKind]} ${input.code}`,
  };
}

/** Problemas de contenido que el proveedor rechazaría; se avisan antes de enviar para corregirlos. */
export function contentProblems(p: FiscalPayload): string[] {
  const out: string[] = [];
  if (!p.issuer.documentNumber) out.push("Falta el NIT del emisor (complétalo en Configuración → Perfil del negocio).");
  if (!p.acquirer.name.trim()) out.push("Falta el nombre del adquirente.");
  if (!p.lines.length) out.push("El documento no tiene líneas.");
  if (!(p.total > 0)) out.push("El total debe ser mayor que cero.");
  return out;
}
