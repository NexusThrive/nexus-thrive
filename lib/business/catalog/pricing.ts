/**
 * Precio de venta de un producto con listas (reglas puras). De menor a mayor prioridad: precio del producto → precio de la
 * lista → escalón por cantidad de la lista (el más alto que la cantidad alcance).
 */
export type PriceTierInput = { minQty: number; price: number };

export function tierPrice(base: number, listPrice: number | null | undefined, tiers: readonly PriceTierInput[] | undefined, quantity: number): number {
  const fallback = listPrice ?? base;
  if (!tiers?.length) return fallback;
  let best: PriceTierInput | null = null;
  for (const t of tiers) if (t.minQty <= quantity && (!best || t.minQty > best.minQty)) best = t;
  return best ? best.price : fallback;
}

/** Valida los escalones de un producto: cantidades enteras desde 2, sin repetir, y precios no negativos. Devuelve el error legible o null. */
export function validateTiers(tiers: readonly PriceTierInput[]): string | null {
  const seen = new Set<number>();
  for (const t of tiers) {
    if (!Number.isInteger(t.minQty) || t.minQty < 2) return "La cantidad mínima de un escalón es 2 o más.";
    if (!Number.isFinite(t.price) || t.price < 0) return "El precio de un escalón no puede ser negativo.";
    if (seen.has(t.minQty)) return `Hay dos escalones desde ${t.minQty} unidades.`;
    seen.add(t.minQty);
  }
  return tiers.length > 10 ? "Un producto admite hasta 10 escalones por lista." : null;
}
