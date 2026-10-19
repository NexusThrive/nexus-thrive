/** Recibos y cuentas de cobro (puro): totales y numeración. */

export type InvoiceKind = "RECEIPT" | "BILL";

export const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = { RECEIPT: "Recibo", BILL: "Cuenta de cobro" };

export function invoiceCode(kind: InvoiceKind, n: number) {
  return `${kind === "RECEIPT" ? "R" : "CC"}-${String(n).padStart(6, "0")}`;
}

export function receiptCode(n: number) {
  return `R-${String(n).padStart(6, "0")}`;
}

export type LineInput = { description: string; quantity: number; unitPrice: number; productId?: string | null };

export function lineTotal(l: LineInput) {
  return Math.round(l.quantity * l.unitPrice * 100) / 100;
}

export function invoiceTotal(lines: LineInput[]) {
  return Math.round(lines.reduce((s, l) => s + lineTotal(l), 0) * 100) / 100;
}

export function validateLines(lines: LineInput[]): string | null {
  if (!lines.length) return "Agrega al menos un concepto.";
  for (const [i, l] of lines.entries()) {
    if (l.description.trim().length < 2) return `Concepto ${i + 1}: escribe la descripción.`;
    if (!(l.quantity > 0)) return `Concepto ${i + 1}: la cantidad debe ser mayor que cero.`;
    if (!(l.unitPrice >= 0)) return `Concepto ${i + 1}: el valor no puede ser negativo.`;
  }
  return null;
}

/** Monto en letras (COP) para la cuenta de cobro. */
export function amountInWords(n: number): string {
  const units = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
  const tens = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  const hundreds = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];
  const below1000 = (x: number): string => {
    if (x === 0) return "";
    if (x === 100) return "cien";
    const h = Math.floor(x / 100);
    const r = x % 100;
    const rest = r < 30 ? units[r] : `${tens[Math.floor(r / 10)]}${r % 10 ? ` y ${units[r % 10]}` : ""}`;
    return [hundreds[h], rest].filter(Boolean).join(" ");
  };
  // "uno" se apocopa delante de sustantivo: "un millón", "veintiún mil", "un pesos".
  const apocope = (w: string) => w.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");
  const int = Math.floor(Math.abs(n));
  if (int === 0) return "cero pesos";
  const millions = Math.floor(int / 1_000_000);
  const thousands = Math.floor((int % 1_000_000) / 1000);
  const rest = int % 1000;
  const parts: string[] = [];
  if (millions) parts.push(millions === 1 ? "un millón" : `${apocope(below1000(millions))} millones`);
  if (thousands) parts.push(thousands === 1 ? "mil" : `${apocope(below1000(thousands))} mil`);
  if (rest) parts.push(below1000(rest));
  const words = apocope(parts.join(" "));
  return `${words}${millions && !thousands && !rest ? " de" : ""} pesos`;
}
