/** Inventario (puro): saldo de stock y alertas de mínimo. */

export type StockKind = "IN" | "OUT" | "SALE" | "ADJUST";

export const STOCK_KIND_LABELS: Record<StockKind, string> = { IN: "Entrada", OUT: "Salida", SALE: "Venta", ADJUST: "Ajuste" };

/** Cambio de stock que produce un movimiento (ADJUST = nuevo conteo absoluto). */
export function applyStock(current: number, kind: StockKind, quantity: number): number {
  if (kind === "ADJUST") return quantity;
  return kind === "IN" ? current + quantity : current - quantity;
}

export function validateStockMove(current: number, kind: StockKind, quantity: number): string | null {
  if (!Number.isInteger(quantity) || quantity < 0 || (kind !== "ADJUST" && quantity === 0)) return "La cantidad debe ser un número entero mayor que cero.";
  if ((kind === "OUT" || kind === "SALE") && quantity > current) return `Solo hay ${current} en inventario.`;
  return null;
}

export function stockLevel(p: { trackStock: boolean; stock: number; minStock: number }): "ok" | "low" | "out" | "untracked" {
  if (!p.trackStock) return "untracked";
  if (p.stock <= 0) return "out";
  return p.stock <= p.minStock ? "low" : "ok";
}

/** Margen bruto en % (null sin costo). */
export function margin(price: number, cost: number | null): number | null {
  if (cost == null || price <= 0) return null;
  return Math.round(((price - cost) / price) * 1000) / 10;
}
