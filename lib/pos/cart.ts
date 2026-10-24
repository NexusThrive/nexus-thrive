import { documentTotals, lineAmounts, type DocumentLineInput } from "@/lib/business/commercial-document";

/**
 * Carrito del punto de venta (reglas puras). Las líneas llevan precio, descuento
 * e impuesto; el servidor vuelve a calcularlo todo con el precio de la base: lo
 * que mande el navegador nunca fija un valor.
 */
const round2 = (n: number) => Math.round(n * 100) / 100;

export type CartTotals = { subtotal: number; discountTotal: number; taxTotal: number; total: number };

export function cartTotals(lines: readonly DocumentLineInput[]): CartTotals {
  return documentTotals(lines);
}

export function lineTotal(line: DocumentLineInput): number {
  return lineAmounts(line).total;
}

/** Propina: porcentaje de la base antes de impuestos o valor fijo; nunca negativa. */
export function tipFor(input: { pct?: number; fixed?: number }, totals: CartTotals): number {
  if (input.fixed !== undefined) return Math.max(0, round2(input.fixed));
  return Math.max(0, round2(((totals.subtotal - totals.discountTotal) * (input.pct ?? 0)) / 100));
}

export type PaymentInput = { method: string; amount: number };
export type Settlement = { applied: PaymentInput[]; change: number; paid: number };

/**
 * Reparte lo que se debe (venta + propina) entre los pagos. Solo el efectivo puede
 * pasarse: el sobrante es el cambio y se descuenta del efectivo. Devuelve el error
 * legible si falta plata o si un medio distinto del efectivo se pasa del valor.
 */
export function settlePayments(due: number, payments: readonly PaymentInput[]): Settlement | { error: string } {
  const clean = payments.filter((p) => p.amount > 0);
  if (!clean.length) return { error: "Agrega al menos un pago." };
  if (clean.some((p) => !Number.isFinite(p.amount))) return { error: "Revisa los valores de pago." };
  const paid = round2(clean.reduce((s, p) => s + p.amount, 0));
  const target = round2(due);
  if (paid < target) return { error: `Faltan ${round2(target - paid).toLocaleString("es-CO")} para completar el pago.` };
  const over = round2(paid - target);
  if (over === 0) return { applied: clean.map((p) => ({ ...p })), change: 0, paid };
  const cash = round2(clean.filter((p) => p.method === "CASH").reduce((s, p) => s + p.amount, 0));
  if (cash < over) return { error: "Solo el efectivo puede pasarse del valor (el sobrante es el cambio)." };
  // El cambio sale del efectivo, empezando por el último pago en efectivo.
  const applied = clean.map((p) => ({ ...p }));
  let left = over;
  for (let i = applied.length - 1; i >= 0 && left > 0; i--) {
    if (applied[i]!.method !== "CASH") continue;
    const take = Math.min(left, applied[i]!.amount);
    applied[i]!.amount = round2(applied[i]!.amount - take);
    left = round2(left - take);
  }
  return { applied: applied.filter((p) => p.amount > 0), change: over, paid };
}
