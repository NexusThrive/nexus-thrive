/**
 * Lo que compra una persona (reglas puras): qué productos, cuánto gastó, cuándo fue la primera y la última compra y cada cuánto
 * vuelve. Con eso el negocio sabe qué ofrecerle y cuándo.
 */
export type PurchaseLine = { productId: string | null; name: string; quantity: number; total: number; date: string };

export type PurchasedProduct = { key: string; name: string; units: number; spent: number; times: number; lastDate: string };

export type PurchaseSummary = {
  products: PurchasedProduct[];
  orders: number;
  spent: number;
  firstDate: string | null;
  lastDate: string | null;
  /** Días promedio entre compras (con dos o más fechas distintas). */
  averageGapDays: number | null;
  /** Fecha estimada de la próxima compra: la última más el promedio. */
  nextExpected: string | null;
};

const DAY = 86_400_000;
const day = (iso: string) => iso.slice(0, 10);

/** Resume las líneas de compra: productos por gasto, fechas y el ritmo de recompra. */
export function summarizePurchases(lines: readonly PurchaseLine[]): PurchaseSummary {
  const byProduct = new Map<string, PurchasedProduct & { dates: Set<string> }>();
  for (const l of lines) {
    const key = l.productId ?? `n:${l.name.toLowerCase()}`;
    const row = byProduct.get(key) ?? { key, name: l.name, units: 0, spent: 0, times: 0, lastDate: l.date, dates: new Set<string>() };
    row.units += l.quantity;
    row.spent += l.total;
    row.dates.add(day(l.date));
    if (l.date > row.lastDate) row.lastDate = l.date;
    byProduct.set(key, row);
  }
  const products = [...byProduct.values()].map(({ dates, ...p }) => ({ ...p, times: dates.size })).sort((a, b) => b.spent - a.spent || a.name.localeCompare(b.name));
  const days = [...new Set(lines.map((l) => day(l.date)))].sort();
  const averageGapDays = days.length >= 2 ? Math.round((Date.parse(days[days.length - 1]!) - Date.parse(days[0]!)) / DAY / (days.length - 1)) : null;
  const lastDate = days.length ? days[days.length - 1]! : null;
  const nextExpected = lastDate && averageGapDays !== null ? new Date(Date.parse(lastDate) + averageGapDays * DAY).toISOString().slice(0, 10) : null;
  return { products, orders: days.length, spent: lines.reduce((s, l) => s + l.total, 0), firstDate: days[0] ?? null, lastDate, averageGapDays, nextExpected };
}
