/**
 * Facturación electrónica detrás de un PUERTO. NEXUS arma el contenido del documento
 * fiscal (emisor, adquirente, líneas, impuestos) y se lo entrega a un proveedor
 * tecnológico autorizado; NEXUS no firma XML ni habla con la DIAN por su cuenta.
 * Cada proveedor real (cuando se elija, PR-20) es un adaptador que cumple `EInvoicePort`.
 */
export type FiscalKind = "INVOICE" | "CREDIT_NOTE" | "DEBIT_NOTE" | "SUPPORT_DOCUMENT";
export const FISCAL_LABELS: Record<FiscalKind, string> = { INVOICE: "Factura electrónica", CREDIT_NOTE: "Nota crédito electrónica", DEBIT_NOTE: "Nota débito electrónica", SUPPORT_DOCUMENT: "Documento soporte" };

export type FiscalParty = { name: string; legalName?: string | null; documentType?: string | null; documentNumber?: string | null; address?: string | null; city?: string | null; email?: string | null; phone?: string | null };
export type FiscalLine = { description: string; quantity: number; unitPrice: number; discountPct: number; taxRatePct: number; total: number };
export type FiscalPayload = {
  kind: FiscalKind;
  /** Código interno legible (V-000042, NC-000003…). */
  code: string;
  number: number;
  prefix: string | null;
  issueDate: string;
  currency: "COP";
  issuer: FiscalParty;
  acquirer: FiscalParty;
  lines: FiscalLine[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  /** Documento al que afecta (notas) o que originó el soporte. */
  relatedCode?: string | null;
  notes?: string | null;
};

export type SubmitResult =
  | { status: "ACCEPTED"; providerRef: string; cufe: string }
  | { status: "REJECTED"; reason: string }
  | { status: "SUBMITTED"; providerRef: string };

export type EInvoicePort = {
  provider: string;
  label: string;
  /** Entrega el documento. Debe ser idempotente por `payload.code`. */
  submit(payload: FiscalPayload): Promise<SubmitResult>;
};
