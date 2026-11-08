/**
 * Variantes que salen de los atributos de un producto (puro). Cada atributo que «crea variantes» aporta sus valores y la matriz es el
 * producto cartesiano de todos. Los atributos informativos y los personalizados no multiplican nada.
 */
export type AttributeLine = {
  attributeId: string;
  attributeName: string;
  /** ALWAYS = una variante por valor; NEVER = solo informativo; CUSTOM = valor libre al vender. */
  variantMode: "ALWAYS" | "NEVER" | "CUSTOM";
  values: { id: string; name: string }[];
};

export type VariantCombo = { name: string; attributes: Record<string, string> };

/** Tope de variantes por producto: más allá de esto el formulario se vuelve inmanejable (y la tienda también). */
export const MAX_VARIANTS = 100;

export function variantCombinations(productName: string, lines: AttributeLine[]): VariantCombo[] {
  const active = lines.filter((l) => l.variantMode === "ALWAYS" && l.values.length > 0);
  if (active.length === 0) return [];
  let combos: Record<string, string>[] = [{}];
  for (const line of active) {
    combos = combos.flatMap((combo) => line.values.map((value) => ({ ...combo, [line.attributeName]: value.name })));
  }
  return combos.map((attributes) => ({ attributes, name: `${productName} · ${Object.values(attributes).join(" / ")}` }));
}

/** Cuántas variantes saldrían (para avisar antes de generarlas). */
export function variantCount(lines: AttributeLine[]): number {
  const active = lines.filter((l) => l.variantMode === "ALWAYS" && l.values.length > 0);
  return active.length === 0 ? 0 : active.reduce((n, l) => n * l.values.length, 1);
}

const keyOf = (attributes: Record<string, string>) =>
  Object.entries(attributes).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("|");

/** De las combinaciones, las que todavía no existen como variante (se comparan por atributos, no por nombre). */
export function missingVariants(combos: VariantCombo[], existing: { attributes: Record<string, string> }[]): VariantCombo[] {
  const have = new Set(existing.map((v) => keyOf(v.attributes)));
  return combos.filter((c) => !have.has(keyOf(c.attributes)));
}
