/**
 * Formato de dinero y fechas (Colombia).
 *
 * Todos los montos se formatean como COP con `Intl.NumberFormat("es-CO")`
 * una sola vez (el formateador se reutiliza entre llamadas).
 */

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Bogota",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

/** Convierte un monto (number, string, Decimal) a número seguro. */
export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

/** $ 250.000 — COP redondeado a pesos. */
export function formatCurrency(
  value: number | string | null | undefined,
): string {
  return currencyFormatter.format(toNumber(value));
}

/** Normaliza Temporal.Instant / Date / string ISO a un Date de JS. */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }
  const raw = String(value);
  // JS Date solo acepta 3 fracciones (ms); Temporal imprime nanos.
  const iso = raw.replace(/\.(\d{3})\d*(Z|[+-])/, ".$1$2");
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 07 oct 2026 */
export function formatDate(value: unknown): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : "—";
}

/** 07 oct 2026, 10:30 */
export function formatDateTime(value: unknown): string {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : "—";
}

/**
 * Etiqueta relativa corta para actividad reciente:
 * "Ahora", "Hace 5 min", "Hace 3 h", "Ayer", o la fecha corta.
 */
export function formatRelativeTime(value: unknown, now: Date = new Date()): string {
  const date = toDate(value);
  if (!date) {
    return "—";
  }

  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 45_000) {
    return "Ahora";
  }
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) {
    return `Hace ${minutes} min`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `Hace ${hours} h`;
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayDiff = Math.round(
    (todayStart.getTime() - dateStart.getTime()) / 86_400_000,
  );
  if (dayDiff === 1) {
    return "Ayer";
  }

  return dateFormatter.format(date);
}