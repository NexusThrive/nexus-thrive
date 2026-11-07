/**
 * Cotización comercial compartida (HU-cotizacion-01), reglas puras: validación, el reparto en anticipo y saldo, y el vencimiento.
 * Las cotizaciones de obra (con APU) siguen en `lib/industry/construction`; esta es la de cualquier solución, con el catálogo.
 */
export type QuoteStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED";
export const QUOTE_STATUS_TEXT: Record<QuoteStatus, string> = { DRAFT: "Borrador", SENT: "Enviada", APPROVED: "Aprobada", REJECTED: "Rechazada" };

const round2 = (n: number) => Math.round(n * 100) / 100;

export type QuoteDraft = { title: string; depositPct: number; validUntil?: string | null; lines: { productId: string; quantity: number; unitPrice: number }[] };

/** Problema legible de una cotización, o `null`. */
export function validateQuote(d: QuoteDraft): string | null {
  if (d.title.trim().length < 3) return "Escribe de qué trata la cotización.";
  if (d.title.trim().length > 160) return "El título es muy largo (máximo 160 caracteres).";
  if (!Number.isFinite(d.depositPct) || d.depositPct < 0 || d.depositPct > 100) return "El anticipo va de 0 % a 100 %.";
  if (d.validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(d.validUntil)) return "La fecha de vigencia no es válida.";
  if (!d.lines.length) return "Agrega al menos un producto o servicio.";
  if (d.lines.length > 60) return "Una cotización admite hasta 60 conceptos.";
  for (const [i, l] of d.lines.entries()) {
    if (!l.productId) return `Concepto ${i + 1}: elige un producto o servicio del catálogo.`;
    if (!Number.isInteger(l.quantity) || l.quantity <= 0 || l.quantity > 10_000) return `Concepto ${i + 1}: la cantidad debe ser un entero mayor que cero.`;
    if (!Number.isFinite(l.unitPrice) || l.unitPrice < 0) return `Concepto ${i + 1}: el valor no puede ser negativo.`;
  }
  return null;
}

/** Anticipo y saldo de un total: suman exactamente el total, sin perder centavos. */
export function splitDeposit(total: number, depositPct: number): { deposit: number; balance: number } {
  const deposit = round2((total * Math.min(100, Math.max(0, depositPct))) / 100);
  return { deposit, balance: round2(total - deposit) };
}

/** ¿La cotización ya no se puede aprobar? Vence DESPUÉS de su último día. */
export const isQuoteExpired = (validUntil: string | null, today: string) => validUntil !== null && validUntil < today;

/** Código visible: COT-0042. */
export const quoteCode = (n: number) => `COT-${String(n).padStart(4, "0")}`;
