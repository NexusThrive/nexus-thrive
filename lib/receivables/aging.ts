/**
 * Cartera: saldos y antigüedad. Reglas puras (sin base de datos).
 * Una cuenta por cobrar o por pagar tiene total, abonado y vencimiento; el
 * saldo es lo que falta y la antigüedad cuenta los días pasados del vencimiento.
 */
export const BUCKETS = ["current", "d1_30", "d31_60", "d61_90", "d90"] as const;
export type Bucket = (typeof BUCKETS)[number];
export const BUCKET_LABELS: Record<Bucket, string> = { current: "Al día", d1_30: "1–30 días", d31_60: "31–60 días", d61_90: "61–90 días", d90: "Más de 90 días" };

const round2 = (n: number) => Math.round(n * 100) / 100;
const MS_DAY = 86_400_000;

export const balanceOf = (total: number, paid: number): number => Math.max(0, round2(total - paid));

/** Días de mora (0 si no ha vencido o no tiene vencimiento). Fechas AAAA-MM-DD. */
export function daysOverdue(dueDate: string | null, today: string): number {
  if (!dueDate) return 0;
  const d = Math.round((Date.parse(`${today.slice(0, 10)}T00:00:00Z`) - Date.parse(`${dueDate.slice(0, 10)}T00:00:00Z`)) / MS_DAY);
  return Math.max(0, d);
}

export function bucketOf(dueDate: string | null, today: string): Bucket {
  const d = daysOverdue(dueDate, today);
  if (d === 0) return "current";
  if (d <= 30) return "d1_30";
  if (d <= 60) return "d31_60";
  if (d <= 90) return "d61_90";
  return "d90";
}

export type AgingItem = { balance: number; dueDate: string | null };
export type Aging = { total: number; count: number; buckets: Record<Bucket, { amount: number; count: number }> };

/** Suma la cartera por antigüedad; ignora lo que ya no tiene saldo. */
export function ageItems(items: readonly AgingItem[], today: string): Aging {
  const buckets = Object.fromEntries(BUCKETS.map((b) => [b, { amount: 0, count: 0 }])) as Aging["buckets"];
  let total = 0;
  let count = 0;
  for (const i of items) {
    if (!(i.balance > 0)) continue;
    const b = buckets[bucketOf(i.dueDate, today)];
    b.amount = round2(b.amount + i.balance);
    b.count += 1;
    total = round2(total + i.balance);
    count += 1;
  }
  return { total, count, buckets };
}

/** Valida un abono contra el saldo. Devuelve el problema legible o `null`. */
export function validatePayment(amount: number, balance: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return "Escribe un valor mayor que cero.";
  if (round2(amount) > round2(balance)) return "El abono no puede ser mayor que el saldo.";
  return null;
}
