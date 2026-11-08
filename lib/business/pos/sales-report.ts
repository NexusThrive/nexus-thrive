/**
 * Informe de ventas (reglas puras): de un conjunto de ventas sale cuánto se vendió, el ticket promedio, los productos que más
 * se venden, quién vendió y con qué medio de pago. El periodo se cuenta en la hora de Bogotá.
 */
export type ReportSale = {
  id: string;
  total: number;
  tip: number;
  cashierId: string | null;
  lines: { productId: string | null; name: string; quantity: number; total: number }[];
  payments: { method: string; amount: number }[];
};

export type SalesReport = {
  count: number;
  total: number;
  tips: number;
  average: number;
  topProducts: { key: string; name: string; units: number; total: number }[];
  byCashier: { cashierId: string | null; count: number; total: number }[];
  byMethod: { method: string; total: number }[];
};

export function summarizeSales(sales: readonly ReportSale[], topN = 10): SalesReport {
  const products = new Map<string, { key: string; name: string; units: number; total: number }>();
  const cashiers = new Map<string, { cashierId: string | null; count: number; total: number }>();
  const methods = new Map<string, number>();
  for (const s of sales) {
    for (const l of s.lines) {
      const key = l.productId ?? `n:${l.name.toLowerCase()}`;
      const p = products.get(key) ?? { key, name: l.name, units: 0, total: 0 };
      p.units += l.quantity;
      p.total += l.total;
      products.set(key, p);
    }
    const ck = s.cashierId ?? "";
    const c = cashiers.get(ck) ?? { cashierId: s.cashierId, count: 0, total: 0 };
    c.count += 1;
    c.total += s.total;
    cashiers.set(ck, c);
    for (const p of s.payments) methods.set(p.method, (methods.get(p.method) ?? 0) + p.amount);
  }
  const total = sales.reduce((t, s) => t + s.total, 0);
  return {
    count: sales.length,
    total,
    tips: sales.reduce((t, s) => t + s.tip, 0),
    average: sales.length ? Math.round(total / sales.length) : 0,
    topProducts: [...products.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)).slice(0, topN),
    byCashier: [...cashiers.values()].sort((a, b) => b.total - a.total),
    byMethod: [...methods].map(([method, t]) => ({ method, total: t })).sort((a, b) => b.total - a.total),
  };
}

export type ReportPeriod = "hoy" | "7d" | "30d" | "mes";
export const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "mes", label: "Este mes" },
];
export const isPeriod = (v: string | undefined): v is ReportPeriod => PERIODS.some((p) => p.value === v);

const BOGOTA_OFFSET_H = 5; // Colombia no tiene horario de verano: UTC−5 todo el año.

/** Inicio del periodo (instante UTC) contado desde la medianoche de Bogotá. */
export function periodStart(period: ReportPeriod, now: Date = new Date()): Date {
  const local = new Date(now.getTime() - BOGOTA_OFFSET_H * 3_600_000);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const days = period === "hoy" ? 0 : period === "7d" ? 6 : period === "30d" ? 29 : local.getUTCDate() - 1;
  return new Date(midnight - days * 86_400_000 + BOGOTA_OFFSET_H * 3_600_000);
}
