/** Compras (puro): consecutivo, totales y estados. */

export type OrderStatus = "DRAFT" | "ORDERED" | "PARTIAL" | "RECEIVED" | "CANCELED";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Borrador",
  ORDERED: "Pedida",
  PARTIAL: "Recibida en parte",
  RECEIVED: "Recibida",
  CANCELED: "Cancelada",
};

/** OC-0007 */
export const orderCode = (n: number) => `OC-${String(n).padStart(4, "0")}`;

export type LineAmounts = { quantity: number; unitCost: number; taxRatePct: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Subtotal (sin impuesto), impuesto y total de una orden. */
export function orderTotals(lines: readonly LineAmounts[]) {
  const subtotal = round2(lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0));
  const taxTotal = round2(lines.reduce((sum, l) => sum + (l.quantity * l.unitCost * l.taxRatePct) / 100, 0));
  return { subtotal, taxTotal, total: round2(subtotal + taxTotal) };
}

/** ¿Se puede recibir mercancía en este estado? (un borrador se puede recibir directo: compra de mostrador). */
export const canReceive = (status: OrderStatus) => status === "DRAFT" || status === "ORDERED" || status === "PARTIAL";
export const canCancel = (status: OrderStatus, receivedUnits: number) => (status === "DRAFT" || status === "ORDERED") && receivedUnits === 0;
export const canMarkOrdered = (status: OrderStatus) => status === "DRAFT";
/** Cerrar una orden recibida en parte cuando el proveedor no enviará el resto. */
export const canClose = (status: OrderStatus) => status === "PARTIAL";

export function nextStatus(lines: readonly { quantity: number; receivedQuantity: number }[]): "PARTIAL" | "RECEIVED" {
  return lines.every((l) => l.receivedQuantity >= l.quantity) ? "RECEIVED" : "PARTIAL";
}

export function validateLines(lines: readonly { productId: string; quantity: number; unitCost: number; taxRatePct: number }[]): string | null {
  if (lines.length === 0) return "Agrega al menos un producto.";
  if (lines.length > 100) return "Máximo 100 líneas por orden.";
  for (const [i, l] of lines.entries()) {
    const n = i + 1;
    if (!l.productId) return `Línea ${n}: elige el producto.`;
    if (!Number.isInteger(l.quantity) || l.quantity <= 0) return `Línea ${n}: la cantidad debe ser un entero mayor que cero.`;
    if (!Number.isFinite(l.unitCost) || l.unitCost < 0) return `Línea ${n}: el costo no es válido.`;
    if (!Number.isFinite(l.taxRatePct) || l.taxRatePct < 0 || l.taxRatePct > 100) return `Línea ${n}: el impuesto debe estar entre 0 y 100.`;
  }
  return null;
}
