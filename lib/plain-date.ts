/**
 * Fechas de calendario (sin hora ni zona) en America/Bogota.
 *
 * Utilidad de Foundation, sin dependencias de dominio ni de `Temporal`: la usan
 * el gimnasio (membresías), construcción (planificador Lean) y quien necesite
 * «el día de hoy en Bogotá». Antes existían dos copias (en
 * `lib/business/memberships.ts` y en `lib/construction/lean-engine.ts`).
 */

/** Zona horaria operativa. */
export const BOGOTA_TIME_ZONE = "America/Bogota";

/** Día de calendario (sin hora ni zona). */
export type PlainDate = { year: number; month: number; day: number };

const bogotaDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BOGOTA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Normaliza Date / string ISO (Temporal o JS) a `Date`; null si inválido. */
function toJsDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string") {
    return null;
  }
  // Temporal.Instant.toString() puede traer 9 dígitos fraccionarios; JS Date
  // solo acepta hasta 3.
  const normalized = value.replace(/(\.\d{3})\d+/, "$1");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Día de calendario Bogotá de un instante (por defecto, ahora). */
export function bogotaToday(instant?: unknown): PlainDate {
  const date = instant === undefined ? new Date() : toJsDate(instant);
  const safe = date ?? new Date();
  const iso = bogotaDayFormatter.format(safe); // "YYYY-MM-DD"
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

/** "YYYY-MM-DD" */
export function formatPlainDate(date: PlainDate): string {
  const mm = String(date.month).padStart(2, "0");
  const dd = String(date.day).padStart(2, "0");
  return `${date.year}-${mm}-${dd}`;
}

/** Parsea "YYYY-MM-DD"; null si no es una fecha válida (evita 2026-02-31). */
export function parsePlainDate(raw: unknown): PlainDate | null {
  if (typeof raw !== "string") {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() + 1 !== month ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Suma calendario de meses con clamping al último día del mes destino:
 * 31/01 + 1 mes → 28/02 (o 29 en bisiesto). No arrastra horas ni zonas.
 */
export function addMonths(plain: PlainDate, months: number): PlainDate {
  const total = plain.year * 12 + (plain.month - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const day = Math.min(plain.day, daysInMonth(year, month));
  return { year, month, day };
}
