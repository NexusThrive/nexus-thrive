/**
 * Agenda (pura): cuadrícula del mes, semanas, ocupación por día, horario de
 * Bogotá (UTC−5, sin horario de verano), choques por responsable y cupo.
 */

export const TZ_OFFSET_MIN = -300; // Bogotá
const DAY = 86_400_000;

export type DayKey = string; // YYYY-MM-DD

/** Instante (ms) → día y hora en Bogotá. */
export function bogotaParts(ms: number) {
  const d = new Date(ms + TZ_OFFSET_MIN * 60_000);
  return { day: d.toISOString().slice(0, 10), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

/** "2026-10-17" + "15:30" (hora Bogotá) → ms. */
export function bogotaToMs(day: DayKey, time: string): number {
  return Date.parse(`${day}T${time.length === 5 ? time : "00:00"}:00-05:00`);
}

export function addDaysKey(day: DayKey, n: number): DayKey {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
}

/** Lunes de la semana del día. */
export function weekStart(day: DayKey): DayKey {
  const dow = new Date(`${day}T12:00:00Z`).getUTCDay(); // 0 domingo
  return addDaysKey(day, -((dow + 6) % 7));
}

/** Semanas (lunes a domingo) que cubren el mes, con marca de si el día es del mes. */
export function monthGrid(year: number, month: number): { day: DayKey; inMonth: boolean }[][] {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const start = weekStart(first);
  const weeks: { day: DayKey; inMonth: boolean }[][] = [];
  let cursor = start;
  for (let w = 0; w < 6; w++) {
    const week = Array.from({ length: 7 }, (_, i) => {
      const day = addDaysKey(cursor, i);
      return { day, inMonth: day.slice(0, 7) === first.slice(0, 7) };
    });
    if (w > 3 && !week.some((d) => d.inMonth)) break;
    weeks.push(week);
    cursor = addDaysKey(cursor, 7);
  }
  return weeks;
}

/** Nivel de ocupación del día (0 libre … 3 lleno) frente a la capacidad diaria. */
export function occupancy(count: number, dailyCapacity: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0;
  const r = count / Math.max(1, dailyCapacity);
  return r >= 1 ? 3 : r >= 0.6 ? 2 : 1;
}

export type Slot = { id?: string; start: number; end: number; staffUserId?: string | null; productId?: string | null; partySize?: number; status?: string };

const live = (s: Slot) => s.status !== "CANCELLED";
const overlaps = (a: Slot, b: Slot) => a.start < b.end && b.start < a.end;

/** ¿Choca con otra cita del mismo responsable? */
export function staffConflict(candidate: Slot, existing: Slot[]): Slot | null {
  if (!candidate.staffUserId) return null;
  return existing.find((e) => live(e) && e.id !== candidate.id && e.staffUserId === candidate.staffUserId && overlaps(candidate, e)) ?? null;
}

/** Personas ya reservadas en el mismo servicio y horario + las nuevas, frente al cupo. */
export function capacityLeft(candidate: Slot, existing: Slot[], capacity: number | null): number | null {
  if (!capacity || !candidate.productId) return null;
  const used = existing.filter((e) => live(e) && e.id !== candidate.id && e.productId === candidate.productId && overlaps(candidate, e)).reduce((s, e) => s + (e.partySize ?? 1), 0);
  return capacity - used - (candidate.partySize ?? 1);
}

/** Posición vertical en la vista semanal (minutos desde la hora inicial). */
export function slotPosition(start: number, end: number, firstHour: number) {
  const s = bogotaParts(start);
  const e = bogotaParts(end);
  const top = (s.hour - firstHour) * 60 + s.minute;
  const endMin = (e.day === s.day ? e.hour : 24) * 60 + (e.day === s.day ? e.minute : 0) - firstHour * 60;
  return { top, height: Math.max(20, endMin - top) };
}

export function reminderText(b: { customer: string; service: string; start: number; business: string }) {
  const p = bogotaParts(b.start);
  const date = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${p.day}T12:00:00Z`));
  const time = `${p.hour % 12 || 12}:${String(p.minute).padStart(2, "0")} ${p.hour < 12 ? "a. m." : "p. m."}`;
  return `Hola ${b.customer.split(" ")[0]}, te recordamos tu cita de ${b.service} el ${date} a las ${time} en ${b.business}. Si no puedes asistir, avísanos por aquí. ¡Te esperamos!`;
}
