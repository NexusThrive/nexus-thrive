/**
 * Dominio de Membresías: constantes, fechas en zona horaria de Colombia y
 * cálculo dinámico del estado.
 *
 * Convención de fechas:
 * - `startDate` se persiste como inicio de día en Bogotá (00:00 → 05:00 UTC).
 * - `endDate` se persiste como FIN de día en Bogotá (23:59:59.999 → 04:59:59Z
 *   del día siguiente): "vence el 30/10" significa válido durante todo el 30.
 * - La persistencia es UTC (Temporal.Instant del codec de Prisma 8); la
 *   presentación y las reglas de negocio usan America/Bogota.
 */

export const MEMBERSHIP_TYPES = [
  { value: "mensual", label: "Mensual", months: 1 },
  { value: "trimestral", label: "Trimestral", months: 3 },
  { value: "anual", label: "Anual", months: 12 },
] as const;

export type MembershipTypeValue = (typeof MEMBERSHIP_TYPES)[number]["value"];

export const MEMBERSHIP_STATUSES = [
  { value: "active", label: "Activa" },
  { value: "expiring", label: "Por vencer" },
  { value: "expired", label: "Vencida" },
] as const;

export type MembershipStatusValue =
  (typeof MEMBERSHIP_STATUSES)[number]["value"];

/** Días de anticipación en que una membresía pasa a estado "por vencer". */
export const EXPIRING_WINDOW_DAYS = 3;

/** Fecha calendario (no instantánea) en horario de Bogotá. */
export type PlainDate = { year: number; month: number; day: number };

/** Duración del plan en meses. */
export function typeMonths(type: MembershipTypeValue): number {
  return MEMBERSHIP_TYPES.find((option) => option.value === type)?.months ?? 1;
}

export function typeLabel(type: MembershipTypeValue): string {
  return MEMBERSHIP_TYPES.find((option) => option.value === type)?.label ?? type;
}

/** Interpreta `YYYY-MM-DD` como fecha calendario; `null` si no es válida. */
export function parsePlainDate(input: string): PlainDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  // Verifica que el día exista en ese mes/año (evita 2026-02-31).
  const probe = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function plainToInputDate(plain: PlainDate): string {
  const month = String(plain.month).padStart(2, "0");
  const day = String(plain.day).padStart(2, "0");
  return `${plain.year}-${month}-${day}`;
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

/** 00:00:00.000 de `plain` en Bogotá (05:00 UTC). */
export function bogotaStartOfDay(plain: PlainDate): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(
    Date.UTC(plain.year, plain.month - 1, plain.day, 5, 0, 0, 0),
  );
}

/** 23:59:59.999 de `plain` en Bogotá (04:59:59.999Z del día siguiente). */
export function bogotaEndOfDay(plain: PlainDate): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(
    Date.UTC(plain.year, plain.month - 1, plain.day + 1, 4, 59, 59, 999),
  );
}

/** Fecha calendario de hoy en America/Bogota. */
export function bogotaToday(): PlainDate {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const parsed = parsePlainDate(formatted);
  if (parsed) {
    return parsed;
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** Fecha calendario (Bogotá) de un instant persistido. */
export function plainFromInstant(value: unknown): PlainDate {
  const raw = String(value);
  const iso = raw.replace(/\.(\d{3})\d*(Z|[+-])/, ".$1$2");
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return bogotaToday();
  }
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const parsed = parsePlainDate(formatted);
  return parsed ?? bogotaToday();
}

/**
 * Estado dinámico calculado desde `endDate` (nunca desde el valor
 * persistido, que puede estar desactualizado):
 *   - `expired`:  endDate <= ahora
 *   - `expiring`: ahora < endDate <= ahora + 3 días
 *   - `active`:   endDate > ahora + 3 días
 */
export function computeMembershipStatus(
  endDate: unknown,
  now: Temporal.Instant = Temporal.Instant.fromEpochMilliseconds(Date.now()),
): MembershipStatusValue {
  let endInstant: Temporal.Instant;
  try {
    endInstant =
      endDate instanceof Temporal.Instant
        ? endDate
        : Temporal.Instant.from(String(endDate));
  } catch {
    return "expired";
  }

  const windowEnd = Temporal.Instant.fromEpochMilliseconds(
    now.epochMilliseconds + EXPIRING_WINDOW_DAYS * 86_400_000,
  );

  if (endInstant.epochMilliseconds <= now.epochMilliseconds) {
    return "expired";
  }
  if (endInstant.epochMilliseconds <= windowEnd.epochMilliseconds) {
    return "expiring";
  }
  return "active";
}

/** Suma de días para un instant (usado en rangos de estado). */
export function plusDays(instant: Temporal.Instant, days: number): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(
    instant.epochMilliseconds + days * 86_400_000,
  );
}

/**
 * Un cobro del historial de una membresía. Sale de `Payment` (la única fuente
 * del dinero, DATA-02): refleja anulaciones. La columna Json
 * `Membership.payments` se retiró (migración `restricciones_negocio_y_rls`).
 */
export type MembershipPaymentEntry = {
  paymentId: string;
  kind: "inicial" | "renovacion";
  date: string;
  amount: string;
  provider: string;
  status: string;
  receiptNumber: number | null;
};

/**
 * Normaliza un teléfono a formato wa.me internacional (sin '+').
 * Colombia: 0-prefijo → 57; móvil corto → 57; ya 57+ se conserva.
 */
export function normalizeWhatsAppPhone(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  if (digits.startsWith("57") && digits.length >= 12) {
    return digits;
  }
  if (digits.startsWith("0")) {
    return `57${digits.slice(1)}`;
  }
  if (digits.length <= 10) {
    return `57${digits}`;
  }
  return digits;
}

/**
 * Mensaje de recordatorio de vencimiento (solo previsualización; no se
 * envía nada automáticamente en esta fase).
 */
export function expiryReminderMessage(
  customerName: string,
  endPlain: PlainDate,
): string {
  const fecha = `${String(endPlain.day).padStart(2, "0")}/${String(endPlain.month).padStart(2, "0")}/${endPlain.year}`;
  return `Hola ${customerName}, tu membresía vence el ${fecha}. Te invitamos a renovarla para continuar disfrutando del servicio.`;
}

/** Enlace wa.me con el mensaje pre-cargado. */
export function whatsappReminderLink(
  phone: string | null | undefined,
  message: string,
): string {
  const normalized = normalizeWhatsAppPhone(phone);
  const text = encodeURIComponent(message);
  return normalized
    ? `https://wa.me/${normalized}?text=${text}`
    : `https://wa.me/?text=${text}`;
}