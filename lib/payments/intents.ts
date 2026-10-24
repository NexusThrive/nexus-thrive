import { randomBytes } from "node:crypto";

/**
 * Cobros en línea (reglas puras): código del enlace, estado efectivo, validación y
 * conciliación contra el reporte del proveedor.
 */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // sin letras que se confunden (i, l, o, 0, 1)

/** Código público del enlace: 14 caracteres al azar (≈ 70 bits), no se adivina ni se enumera. */
export function newReference(): string {
  const bytes = randomBytes(14);
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}

export type IntentStatus = "PENDING" | "PAID" | "EXPIRED" | "FAILED" | "CANCELED";
export const STATUS_LABELS: Record<IntentStatus, string> = { PENDING: "Pendiente", PAID: "Pagado", EXPIRED: "Vencido", FAILED: "Fallido", CANCELED: "Cancelado" };

/** Un enlace pendiente cuyo plazo pasó se ve como vencido. */
export function effectiveStatus(status: string, expiresAt: string | number, now: number = Date.now()): IntentStatus {
  const s = status as IntentStatus;
  if (s === "PENDING" && new Date(expiresAt).getTime() < now) return "EXPIRED";
  return s;
}

export function validateIntent(input: { amount: number; description: string; expiresInHours: number }): string | null {
  if (!(input.amount >= 1000)) return "El valor mínimo de un cobro es $ 1.000.";
  if (input.amount > 50_000_000) return "El valor máximo por enlace es $ 50.000.000.";
  if (input.description.trim().length < 3) return "Escribe qué se está cobrando.";
  if (!(input.expiresInHours >= 1 && input.expiresInHours <= 24 * 30)) return "La vigencia va de 1 hora a 30 días.";
  return null;
}

export type ReportRow = { externalId: string; amount: number };
export type Difference = { kind: "missing_in_nexus" | "missing_in_provider" | "amount_mismatch"; externalId: string; expected: number | null; reported: number | null };
export type Reconciliation = { expectedTotal: number; reportedTotal: number; matched: number; differences: Difference[] };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Compara lo que NEXUS confirmó (`ours`) con lo que reporta el proveedor (`reported`) por id externo. */
export function reconcile(ours: readonly ReportRow[], reported: readonly ReportRow[]): Reconciliation {
  const mine = new Map(ours.map((r) => [r.externalId, r.amount]));
  const theirs = new Map(reported.map((r) => [r.externalId, r.amount]));
  const differences: Difference[] = [];
  let matched = 0;
  for (const [id, amount] of mine) {
    const other = theirs.get(id);
    if (other === undefined) differences.push({ kind: "missing_in_provider", externalId: id, expected: amount, reported: null });
    else if (round2(other) !== round2(amount)) differences.push({ kind: "amount_mismatch", externalId: id, expected: amount, reported: other });
    else matched++;
  }
  for (const [id, amount] of theirs) if (!mine.has(id)) differences.push({ kind: "missing_in_nexus", externalId: id, expected: null, reported: amount });
  return { expectedTotal: round2([...mine.values()].reduce((s, v) => s + v, 0)), reportedTotal: round2([...theirs.values()].reduce((s, v) => s + v, 0)), matched, differences };
}

/** Lee el reporte pegado («id,valor» por línea, con o sin encabezado). Devuelve las filas y las líneas que no se entienden. */
export function parseReport(text: string): { rows: ReportRow[]; bad: number[] } {
  const rows: ReportRow[] = [];
  const bad: number[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const [id, amountRaw] = line.split(/[,;\t]/).map((p) => p.trim());
    const amount = Number((amountRaw ?? "").replace(/[$\s]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
    if (!id || !amountRaw || !Number.isFinite(amount)) {
      if (i > 0) bad.push(i + 1); // la primera línea puede ser el encabezado
      return;
    }
    rows.push({ externalId: id, amount });
  });
  return { rows, bad };
}

/** Código HTML del botón de pago para pegar en una página web. */
export const payButtonHtml = (url: string, label = "Pagar ahora") => `<a href="${url}" style="display:inline-block;padding:12px 22px;background:#000;color:#fff;border-radius:6px;font-family:sans-serif;font-weight:600;text-decoration:none">${label}</a>`;
