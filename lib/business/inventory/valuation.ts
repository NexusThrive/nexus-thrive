/** Valorización del inventario (reglas puras): cuánto vale lo que hay, por categoría y por producto. */
export type ValuationInput = { productId: string; name: string; category: string | null; units: number; value: number };

export type Valuation = {
  total: number;
  units: number;
  products: number;
  byCategory: { category: string; units: number; value: number; share: number }[];
  top: { productId: string; name: string; units: number; value: number; share: number }[];
};

const NONE = "Sin categoría";
const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0);

export function summarizeValuation(rows: readonly ValuationInput[], topN = 15): Valuation {
  const byProduct = new Map<string, ValuationInput>();
  for (const r of rows) {
    const p = byProduct.get(r.productId) ?? { ...r, units: 0, value: 0 };
    p.units += r.units;
    p.value += r.value;
    byProduct.set(r.productId, p);
  }
  const products = [...byProduct.values()].filter((p) => p.units > 0 || p.value > 0);
  const total = products.reduce((s, p) => s + p.value, 0);
  const cats = new Map<string, { category: string; units: number; value: number }>();
  for (const p of products) {
    const key = p.category?.trim() || NONE;
    const c = cats.get(key) ?? { category: key, units: 0, value: 0 };
    c.units += p.units;
    c.value += p.value;
    cats.set(key, c);
  }
  return {
    total,
    units: products.reduce((s, p) => s + p.units, 0),
    products: products.length,
    byCategory: [...cats.values()].sort((a, b) => b.value - a.value).map((c) => ({ ...c, share: pct(c.value, total) })),
    top: products.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)).slice(0, topN).map((p) => ({ productId: p.productId, name: p.name, units: p.units, value: p.value, share: pct(p.value, total) })),
  };
}
