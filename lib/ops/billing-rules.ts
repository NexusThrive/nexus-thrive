/**
 * Reglas de facturación de NEXUS (puras). Fechas como YYYY-MM-DD.
 * - Un período mensual o anual empieza donde terminó el anterior.
 * - No se confirma un pago sin comprobante, método y fecha.
 * - Suspender por falta de pago exige: vencido más allá de la gracia, aviso
 *   enviado y que pasen los días del aviso. Nunca es automático.
 */

export type Cycle = "MONTHLY" | "ANNUAL";
export type BillingPolicyValues = { reminderDays: number[]; graceDays: number; noticeDays: number };

export const DEFAULT_POLICY: BillingPolicyValues = { reminderDays: [7, 3, 1], graceDays: 5, noticeDays: 3 };

export const PAYMENT_METHODS = ["Transferencia", "Nequi", "Daviplata", "PSE", "Tarjeta", "Efectivo", "Otro"] as const;

export const SUBSCRIPTION_STATUSES = [
  { value: "TRIAL", label: "Prueba", tone: "neutral" },
  { value: "ACTIVE", label: "Al día", tone: "success" },
  { value: "PAST_DUE", label: "En mora", tone: "warning" },
  { value: "SUSPENDED", label: "Suspendida", tone: "danger" },
  { value: "CANCELLED", label: "Cancelada", tone: "muted" },
] as const;
export type SubscriptionStatusValue = (typeof SUBSCRIPTION_STATUSES)[number]["value"];

export const CHARGE_STATUSES = [
  { value: "PENDING", label: "Pendiente" },
  { value: "PAID", label: "Pagado" },
  { value: "VOID", label: "Anulado" },
  { value: "REFUNDED", label: "Reembolsado" },
] as const;
export type ChargeStatusValue = (typeof CHARGE_STATUSES)[number]["value"];

const DAY = 86_400_000;
const toMs = (d: string) => Date.parse(`${d}T12:00:00Z`);
export const daysBetween = (from: string, to: string) => Math.round((toMs(to) - toMs(from)) / DAY);
export function addDays(d: string, n: number) {
  return new Date(toMs(d) + n * DAY).toISOString().slice(0, 10);
}

/** Suma meses respetando fin de mes (31 ene + 1 mes = 28/29 feb). */
export function addMonths(d: string, months: number) {
  const [y, m, day] = d.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1, 12));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12)).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return target.toISOString().slice(0, 10);
}

export function periodEnd(start: string, cycle: Cycle) {
  return addMonths(start, cycle === "ANNUAL" ? 12 : 1);
}

/** Valor del cobro del período (el precio guardado es mensual equivalente). */
export function periodAmount(monthlyCents: number, cycle: Cycle) {
  return cycle === "ANNUAL" ? monthlyCents * 12 : monthlyCents;
}


export type Dunning =
  | { stage: "paid" | "void" }
  | { stage: "upcoming"; days: number; remind: boolean }
  | { stage: "due_today" }
  | { stage: "grace"; overdue: number; graceLeft: number }
  | { stage: "notice_needed"; overdue: number }
  | { stage: "notice_running"; overdue: number; noticeLeft: number }
  | { stage: "suspend_eligible"; overdue: number };

/** En qué punto de la cobranza va un cobro, según la política. */
export function dunning(c: { status: ChargeStatusValue; dueDate: string; noticeDate: string | null }, policy: BillingPolicyValues, today: string): Dunning {
  if (c.status === "PAID" || c.status === "REFUNDED") return { stage: "paid" };
  if (c.status === "VOID") return { stage: "void" };
  const d = daysBetween(c.dueDate, today);
  if (d < 0) return { stage: "upcoming", days: -d, remind: policy.reminderDays.includes(-d) };
  if (d === 0) return { stage: "due_today" };
  if (d <= policy.graceDays) return { stage: "grace", overdue: d, graceLeft: policy.graceDays - d };
  if (!c.noticeDate) return { stage: "notice_needed", overdue: d };
  const since = daysBetween(c.noticeDate, today);
  if (since < policy.noticeDays) return { stage: "notice_running", overdue: d, noticeLeft: policy.noticeDays - since };
  return { stage: "suspend_eligible", overdue: d };
}

export function dunningLabel(x: Dunning): string {
  switch (x.stage) {
    case "paid":
      return "Pagado";
    case "void":
      return "Anulado";
    case "upcoming":
      return `Vence en ${x.days} ${x.days === 1 ? "día" : "días"}${x.remind ? " · enviar recordatorio" : ""}`;
    case "due_today":
      return "Vence hoy";
    case "grace":
      return `Vencido hace ${x.overdue} d · gracia ${x.graceLeft} d`;
    case "notice_needed":
      return `Vencido hace ${x.overdue} d · enviar aviso de suspensión`;
    case "notice_running":
      return `Aviso enviado · faltan ${x.noticeLeft} d para poder suspender`;
    case "suspend_eligible":
      return `Vencido hace ${x.overdue} d · se puede suspender`;
  }
}

/** ¿Se puede confirmar el pago? Exige comprobante, método y fecha. */
export function checkConfirm(c: { status: ChargeStatusValue; evidenceCount: number; method: string | null; paidDate: string | null }): { ok: true } | { ok: false; message: string } {
  if (c.status !== "PENDING") return { ok: false, message: "Solo se confirman cobros pendientes." };
  if (c.evidenceCount < 1) return { ok: false, message: "Sube el comprobante antes de confirmar el pago." };
  if (!c.method) return { ok: false, message: "Indica el método de pago." };
  if (!c.paidDate) return { ok: false, message: "Indica la fecha del pago." };
  return { ok: true };
}

export function validatePolicy(raw: BillingPolicyValues): { ok: true; value: BillingPolicyValues } | { ok: false; message: string } {
  const ints = (raw.reminderDays ?? []).map((n) => Math.round(Number(n))).filter((n) => Number.isFinite(n));
  const reminderDays = [...new Set(ints)].filter((n) => n >= 0 && n <= 30).sort((a, b) => b - a);
  const graceDays = Math.round(Number(raw.graceDays));
  const noticeDays = Math.round(Number(raw.noticeDays));
  if (!Number.isFinite(graceDays) || graceDays < 0 || graceDays > 60) return { ok: false, message: "Los días de gracia van de 0 a 60." };
  if (!Number.isFinite(noticeDays) || noticeDays < 1 || noticeDays > 30) return { ok: false, message: "El aviso previo va de 1 a 30 días." };
  return { ok: true, value: { reminderDays, graceDays, noticeDays } };
}

export const EVIDENCE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const EVIDENCE_MAX_BYTES = 8 * 1024 * 1024;

export function checkEvidence(file: { type: string; size: number }): string | null {
  if (!(EVIDENCE_TYPES as readonly string[]).includes(file.type)) return "El comprobante debe ser PDF, JPG, PNG o WEBP.";
  if (file.size <= 0) return "El archivo está vacío.";
  if (file.size > EVIDENCE_MAX_BYTES) return "El comprobante supera 8 MB.";
  return null;
}
