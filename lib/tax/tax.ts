/**
 * Impuestos, retenciones y numeración por resolución: reglas puras (sin base
 * de datos). El IVA por línea ya lo calcula `lineAmounts`; aquí vive lo que lo
 * rodea: qué tarifa está vigente en una fecha, qué retenciones se practican y
 * cuánto, y si un rango de numeración se puede seguir usando.
 */

export const TAX_KINDS = ["IVA", "IMPOCONSUMO", "RETEFUENTE", "RETEIVA", "RETEICA"] as const;
export type TaxKind = (typeof TAX_KINDS)[number];
export const TAX_KIND_LABELS: Record<TaxKind, string> = {
  IVA: "IVA",
  IMPOCONSUMO: "Impoconsumo",
  RETEFUENTE: "Retención en la fuente",
  RETEIVA: "Retención de IVA",
  RETEICA: "Retención de ICA",
};
export const isWithholding = (kind: string): boolean => kind === "RETEFUENTE" || kind === "RETEIVA" || kind === "RETEICA";

export type TaxRateRow = { id: string; code: string; name: string; kind: TaxKind; ratePct: number; minBase: number; validFrom: string; validTo: string | null; active: boolean };

const round2 = (n: number) => Math.round(n * 100) / 100;
const day = (iso: string) => iso.slice(0, 10);

/** ¿La tarifa rige en esa fecha (AAAA-MM-DD)? Inclusive en ambos extremos. */
export function isInForce(rate: Pick<TaxRateRow, "active" | "validFrom" | "validTo">, date: string): boolean {
  const d = day(date);
  return rate.active && day(rate.validFrom) <= d && (rate.validTo === null || d <= day(rate.validTo));
}

/** La tarifa vigente de un código en una fecha; si hay varias, la que empezó más tarde. */
export function rateInForce<T extends Pick<TaxRateRow, "code" | "active" | "validFrom" | "validTo">>(rates: readonly T[], code: string, date: string): T | null {
  const inForce = rates.filter((r) => r.code === code && isInForce(r, date));
  return inForce.sort((a, b) => day(b.validFrom).localeCompare(day(a.validFrom)))[0] ?? null;
}

/** Valida una tarifa nueva. Devuelve el primer problema legible o `null`. */
export function validateTaxRate(input: { code: string; name: string; kind: string; ratePct: number; minBase: number; validFrom: string; validTo: string | null }): string | null {
  if (!/^[A-Z0-9_]{2,40}$/.test(input.code)) return "El código usa solo mayúsculas, números y guion bajo (ej. IVA_19).";
  if (input.name.trim().length < 2) return "Escribe el nombre del impuesto.";
  if (!(TAX_KINDS as readonly string[]).includes(input.kind)) return "Elige el tipo de impuesto.";
  if (!(input.ratePct >= 0 && input.ratePct <= 100)) return "La tarifa va de 0 % a 100 %.";
  if (!(input.minBase >= 0)) return "La base mínima no puede ser negativa.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.validFrom)) return "Indica desde cuándo rige.";
  if (input.validTo !== null && !/^\d{4}-\d{2}-\d{2}$/.test(input.validTo)) return "La fecha final no es válida.";
  if (input.validTo !== null && input.validTo < input.validFrom) return "Debe terminar después de empezar.";
  return null;
}

/** ¿Dos vigencias del mismo código se pisan? Dos tarifas distintas no pueden regir el mismo día. */
export function overlaps(a: { validFrom: string; validTo: string | null }, b: { validFrom: string; validTo: string | null }): boolean {
  const aEnd = a.validTo === null ? "9999-12-31" : day(a.validTo);
  const bEnd = b.validTo === null ? "9999-12-31" : day(b.validTo);
  return day(a.validFrom) <= bEnd && day(b.validFrom) <= aEnd;
}

export type Withholding = { code: string; name: string; kind: TaxKind; ratePct: number; base: number; amount: number };

/**
 * Retenciones de un documento. La base es la que corresponde a cada tipo:
 * retefuente y reteICA sobre la base gravable (sin IVA); reteIVA sobre el IVA.
 * Si la base no llega a la base mínima de la tarifa, no se practica.
 */
export function computeWithholdings(totals: { taxable: number; tax: number }, rates: readonly Pick<TaxRateRow, "code" | "name" | "kind" | "ratePct" | "minBase">[]): Withholding[] {
  const out: Withholding[] = [];
  for (const r of rates) {
    if (!isWithholding(r.kind)) continue;
    const base = r.kind === "RETEIVA" ? totals.tax : totals.taxable;
    if (base <= 0 || base < r.minBase) continue;
    out.push({ code: r.code, name: r.name, kind: r.kind, ratePct: r.ratePct, base: round2(base), amount: round2((base * r.ratePct) / 100) });
  }
  return out;
}

/** Lo que realmente se recibe: el total del documento menos lo que retiene quien paga. */
export const netPayable = (total: number, withholdings: readonly { amount: number }[]): number => round2(total - withholdings.reduce((s, w) => s + w.amount, 0));

/** Resumen por tarifa de IVA (para la declaración): base e impuesto agrupados. */
export function taxBreakdown(lines: readonly { taxable: number; taxRatePct: number; tax: number }[]): { ratePct: number; base: number; tax: number }[] {
  const map = new Map<number, { base: number; tax: number }>();
  for (const l of lines) {
    const e = map.get(l.taxRatePct) ?? { base: 0, tax: 0 };
    e.base += l.taxable;
    e.tax += l.tax;
    map.set(l.taxRatePct, e);
  }
  return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([ratePct, v]) => ({ ratePct, base: round2(v.base), tax: round2(v.tax) }));
}

/* -------------------------- Numeración -------------------------- */

export type ResolutionState = { prefix: string; rangeFrom: number; rangeTo: number; nextNumber: number; validFrom: string; validTo: string; active: boolean };
export type ResolutionStatus =
  | { state: "ok"; remaining: number; daysLeft: number; warnings: string[] }
  | { state: "inactive" | "not_started" | "expired" | "exhausted"; remaining: number; daysLeft: number; warnings: string[]; message: string };

const MS_DAY = 86_400_000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${day(to)}T00:00:00Z`) - Date.parse(`${day(from)}T00:00:00Z`)) / MS_DAY);

/** Aviso cuando queda poco: el 10 % del rango o 20 números, lo que sea mayor; o 30 días de vigencia. */
export function warnThreshold(r: Pick<ResolutionState, "rangeFrom" | "rangeTo">): number {
  return Math.max(20, Math.ceil((r.rangeTo - r.rangeFrom + 1) * 0.1));
}

export function resolutionStatus(r: ResolutionState, today: string): ResolutionStatus {
  const remaining = Math.max(0, r.rangeTo - r.nextNumber + 1);
  const daysLeft = daysBetween(today, r.validTo);
  const base = { remaining, daysLeft, warnings: [] as string[] };
  if (!r.active) return { state: "inactive", ...base, message: "La resolución está desactivada." };
  if (day(today) < day(r.validFrom)) return { state: "not_started", ...base, message: `La resolución rige desde ${day(r.validFrom)}.` };
  if (day(today) > day(r.validTo)) return { state: "expired", ...base, message: `La resolución venció el ${day(r.validTo)}. Pide una nueva a la DIAN.` };
  if (remaining === 0) return { state: "exhausted", ...base, message: `Se agotó el rango ${r.rangeFrom}–${r.rangeTo}. Registra la nueva resolución.` };
  const warnings: string[] = [];
  if (remaining <= warnThreshold(r)) warnings.push(`Quedan ${remaining} números del rango.`);
  if (daysLeft <= 30) warnings.push(daysLeft === 0 ? "La resolución vence hoy." : `La resolución vence en ${daysLeft} días.`);
  return { state: "ok", remaining, daysLeft, warnings };
}

/** Valida una resolución nueva. */
export function validateResolution(input: { documentKind: string; prefix: string; resolutionNumber: string; rangeFrom: number; rangeTo: number; validFrom: string; validTo: string }, kinds: readonly string[]): string | null {
  if (!kinds.includes(input.documentKind)) return "Elige el tipo de documento.";
  if (!/^[A-Za-z0-9]{0,6}$/.test(input.prefix)) return "El prefijo tiene hasta 6 letras o números.";
  if (input.resolutionNumber.trim().length < 3) return "Escribe el número de la resolución.";
  if (!Number.isInteger(input.rangeFrom) || !Number.isInteger(input.rangeTo) || input.rangeFrom < 1) return "El rango debe ser de números enteros desde 1.";
  if (input.rangeTo < input.rangeFrom) return "El número final debe ser mayor o igual que el inicial.";
  if (input.rangeTo > 999_999_999) return "El rango es demasiado grande.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.validFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(input.validTo)) return "Indica la vigencia de la resolución.";
  if (input.validTo < input.validFrom) return "La vigencia debe terminar después de empezar.";
  return null;
}

/** Código impreso de un documento con resolución: prefijo + número ("SETP990000123"). */
export const fiscalCode = (prefix: string, n: number): string => `${prefix}${n}`;

/** Tipos de documento que se numeran con resolución (cotizaciones y pedidos llevan consecutivo interno). */
export const NUMBERED_KINDS = ["SALE", "BILL", "RECEIPT", "CREDIT_NOTE", "DEBIT_NOTE"] as const;

/** Fecha de hoy en Colombia (UTC−5) como AAAA-MM-DD: la vigencia se mide por día calendario local. */
export const todayCO = (now: number = Date.now()): string => new Date(now - 5 * 3_600_000).toISOString().slice(0, 10);

/** Tarifas habituales en Colombia para arrancar; el negocio las ajusta (bases mínimas con su contador). */
export const DEFAULT_TAX_RATES: readonly { code: string; name: string; kind: TaxKind; ratePct: number }[] = [
  { code: "IVA_19", name: "IVA 19 %", kind: "IVA", ratePct: 19 },
  { code: "IVA_5", name: "IVA 5 %", kind: "IVA", ratePct: 5 },
  { code: "IVA_0", name: "IVA 0 % (exento)", kind: "IVA", ratePct: 0 },
  { code: "IMPOCONSUMO_8", name: "Impoconsumo 8 %", kind: "IMPOCONSUMO", ratePct: 8 },
  { code: "RETEFUENTE_COMPRAS", name: "Retefuente compras 2,5 %", kind: "RETEFUENTE", ratePct: 2.5 },
  { code: "RETEFUENTE_SERVICIOS", name: "Retefuente servicios 4 %", kind: "RETEFUENTE", ratePct: 4 },
  { code: "RETEFUENTE_HONORARIOS", name: "Retefuente honorarios 10 %", kind: "RETEFUENTE", ratePct: 10 },
  { code: "RETEIVA", name: "ReteIVA 15 %", kind: "RETEIVA", ratePct: 15 },
];
