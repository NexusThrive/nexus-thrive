/** Traslados y conteos (puro): consecutivos, validación y diferencias. */
export const transferCode = (n: number) => `TR-${String(n).padStart(4, "0")}`;
export const countCode = (n: number) => `CT-${String(n).padStart(4, "0")}`;

export type CountStatus = "DRAFT" | "COMPLETED" | "CANCELED";
export const COUNT_LABELS: Record<CountStatus, string> = { DRAFT: "En conteo", COMPLETED: "Cerrado", CANCELED: "Cancelado" };

export function validateTransfer(input: { fromWarehouseId: string; toWarehouseId: string; lines: readonly { productId: string; quantity: number }[] }): string | null {
  if (!input.fromWarehouseId || !input.toWarehouseId) return "Elige la bodega de origen y la de destino.";
  if (input.fromWarehouseId === input.toWarehouseId) return "El origen y el destino deben ser bodegas distintas.";
  if (input.lines.length === 0) return "Agrega al menos un producto.";
  if (input.lines.length > 100) return "Máximo 100 productos por traslado.";
  const seen = new Set<string>();
  for (const [i, l] of input.lines.entries()) {
    if (!l.productId) return `Línea ${i + 1}: elige el producto.`;
    if (seen.has(l.productId)) return `Línea ${i + 1}: el producto está repetido.`;
    seen.add(l.productId);
    if (!Number.isInteger(l.quantity) || l.quantity <= 0) return `Línea ${i + 1}: la cantidad debe ser un entero mayor que cero.`;
  }
  return null;
}

/** Diferencia de un conteo: contado − esperado (null si aún no se contó). */
export const countDifference = (line: { expected: number; counted: number | null }) => (line.counted === null ? null : line.counted - line.expected);

export function countSummary(lines: readonly { expected: number; counted: number | null }[]) {
  const counted = lines.filter((l) => l.counted !== null);
  const diffs = counted.map((l) => (l.counted as number) - l.expected).filter((d) => d !== 0);
  return { total: lines.length, counted: counted.length, withDifference: diffs.length, surplus: diffs.filter((d) => d > 0).reduce((s, d) => s + d, 0), shortage: -diffs.filter((d) => d < 0).reduce((s, d) => s + d, 0) };
}

export type ReorderInput = { stock: number; minStock: number; maxStock: number | null; reorderPoint: number | null; onOrder: number };

/** Punto en el que conviene pedir: el de reorden si existe; si no, el mínimo (si es mayor que cero). */
export const reorderThreshold = (p: Pick<ReorderInput, "minStock" | "reorderPoint">): number | null => p.reorderPoint ?? (p.minStock > 0 ? p.minStock : null);

/** Cuánto pedir para llegar al máximo (o al doble del punto de reorden), descontando lo ya pedido. 0 si no hace falta. */
export function suggestedOrder(p: ReorderInput): number {
  const threshold = reorderThreshold(p);
  if (threshold === null || p.stock > threshold) return 0;
  const target = p.maxStock ?? Math.max(threshold * 2, threshold + 1);
  return Math.max(0, target - p.stock - p.onOrder);
}

export function validateLevels(l: { minStock: number; maxStock: number | null; reorderPoint: number | null }): string | null {
  const ints = [l.minStock, l.maxStock, l.reorderPoint].filter((v): v is number => v !== null);
  if (ints.some((v) => !Number.isInteger(v) || v < 0)) return "Los niveles deben ser enteros de cero en adelante.";
  if (l.reorderPoint !== null && l.reorderPoint < l.minStock) return "El punto de reorden no puede ser menor que el mínimo.";
  if (l.maxStock !== null && l.maxStock < Math.max(l.minStock, l.reorderPoint ?? 0)) return "El máximo no puede ser menor que el mínimo ni que el punto de reorden.";
  return null;
}
