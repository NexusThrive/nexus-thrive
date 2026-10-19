/**
 * Caja menor (pura). El saldo esperado de un turno es la apertura más lo que
 * entró menos lo que salió; el arqueo compara contra lo contado.
 */

export type CashKind = "OPENING" | "INCOME" | "EXPENSE" | "VOUCHER" | "REPLENISH" | "ADJUST";

export const CASH_KIND_LABELS: Record<CashKind, string> = {
  OPENING: "Apertura",
  INCOME: "Ingreso en efectivo",
  EXPENSE: "Gasto",
  VOUCHER: "Vale",
  REPLENISH: "Reposición",
  ADJUST: "Ajuste",
};

/** Signo de cada movimiento sobre el efectivo de la caja. */
export const CASH_SIGN: Record<CashKind, 1 | -1> = { OPENING: 1, INCOME: 1, REPLENISH: 1, ADJUST: 1, EXPENSE: -1, VOUCHER: -1 };

/** ADJUST lleva su propio signo en el monto; el resto siempre es positivo. */
export function expectedCash(movements: { kind: CashKind; amount: number }[]): number {
  const total = movements.reduce((s, m) => s + (m.kind === "ADJUST" ? m.amount : CASH_SIGN[m.kind] * Math.abs(m.amount)), 0);
  return Math.round(total * 100) / 100;
}

export type Arqueo = { expected: number; counted: number; difference: number; status: "cuadra" | "sobra" | "falta" };

/** Tolerancia de redondeo: diferencias menores a $1 se consideran cuadre. */
export function arqueo(expected: number, counted: number): Arqueo {
  const difference = Math.round((counted - expected) * 100) / 100;
  return { expected, counted, difference, status: Math.abs(difference) < 1 ? "cuadra" : difference > 0 ? "sobra" : "falta" };
}

/** Cuánto hay que reponer para volver al fondo fijo. */
export function replenishNeeded(fund: number, current: number): number {
  return Math.max(0, Math.round((fund - current) * 100) / 100);
}

export function validateCashMovement(m: { kind: string; amount: number | null; description: string; beneficiary?: string | null }, available: number): string | null {
  if (!["INCOME", "EXPENSE", "VOUCHER", "REPLENISH", "ADJUST"].includes(m.kind)) return "Tipo de movimiento no válido.";
  if (m.amount == null || !Number.isFinite(m.amount) || m.amount === 0) return "Escribe el monto.";
  if (m.kind !== "ADJUST" && m.amount < 0) return "El monto debe ser positivo.";
  if (m.description.trim().length < 3) return "Describe el movimiento.";
  if (m.kind === "VOUCHER" && !(m.beneficiary ?? "").trim()) return "Indica a quién se le entrega el vale.";
  if ((m.kind === "EXPENSE" || m.kind === "VOUCHER") && m.amount > available) return "No hay suficiente efectivo en la caja para ese movimiento.";
  return null;
}
