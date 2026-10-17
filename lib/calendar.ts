/**
 * Calendario de la agenda con días como claves "YYYY-MM-DD" (Bogotá). La
 * aritmética se hace a mediodía UTC: sumar días nunca cruza de fecha por
 * horario de verano ni por la zona del navegador. Semanas de lunes a domingo.
 */

const DAY_MS = 86_400_000;

const toDate = (key: string) => new Date(`${key}T12:00:00Z`);
const toKey = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(key: string, n: number): string {
  return toKey(new Date(toDate(key).getTime() + n * DAY_MS));
}

/** Lunes de la semana del día. */
export function weekStart(key: string): string {
  const wd = (toDate(key).getUTCDay() + 6) % 7;
  return addDays(key, -wd);
}

export function weekDays(key: string): string[] {
  const start = weekStart(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** 6 × 7 días desde el lunes de la semana del día 1 del mes. */
export function monthGrid(key: string): string[] {
  const first = `${key.slice(0, 7)}-01`;
  const start = weekStart(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function sameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function addMonths(key: string, n: number): string {
  const d = toDate(`${key.slice(0, 7)}-01`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return toKey(d);
}

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", ...o });
const weekdayShort = fmt({ weekday: "short" });
const weekdayLong = fmt({ weekday: "long", day: "numeric", month: "long" });
const monthYear = fmt({ month: "long", year: "numeric" });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const dayNumber = (key: string) => toDate(key).getUTCDate();
export const weekdayLabel = (key: string) => weekdayShort.format(toDate(key)).replace(".", "");
export const monthLabel = (key: string) => cap(monthYear.format(toDate(key)));

/** "Hoy", "Mañana", "Ayer" o "Jueves, 16 de octubre". */
export function dayTitle(key: string, today: string): string {
  if (key === today) return "Hoy";
  if (key === addDays(today, 1)) return "Mañana";
  if (key === addDays(today, -1)) return "Ayer";
  return cap(weekdayLong.format(toDate(key)));
}

/** Semanas completas entre dos lunes (para deslizar semana a semana). */
export function weeksBetween(a: string, b: string): number {
  return Math.round((toDate(weekStart(b)).getTime() - toDate(weekStart(a)).getTime()) / (7 * DAY_MS));
}
