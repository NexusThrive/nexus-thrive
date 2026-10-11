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

const shortDateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "2-digit",
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

/**
 * Formatea un monto en micro-unidades (`BigInt`, 6 decimales: 1_000_000 =
 * 1 COP) SIN perder precisión: convierte a pesos con redondeo half-up usando
 * `BigInt` y solo entonces usa `Intl.NumberFormat`.
 *
 * El resultado en pesos se pasa a `Number` únicamente para formatear; es
 * seguro para cualquier presupuesto real (enteros < 2^53 ≈ 9,0e15 COP).
 */
export function formatMoneyMicro(
  micro: bigint | string | null | undefined,
): string {
  if (micro === null || micro === undefined || micro === "") {
    return currencyFormatter.format(0);
  }
  let value: bigint;
  try {
    value = typeof micro === "bigint" ? micro : BigInt(micro);
  } catch {
    return currencyFormatter.format(0);
  }
  const negative = value < BigInt(0);
  const abs = negative ? -value : value;
  // half-up a peso entero: (abs + 500_000) / 1_000_000
  const pesos = (abs + BigInt(500_000)) / BigInt(1_000_000);
  const n = Number(pesos);
  return currencyFormatter.format(negative ? -n : n);
}

/**
 * Cantidad en micro-unidades → decimal legible sin ceros sobrantes
 * (1_000_000 → "1", 1_500_000 → "1.5", 250_000 → "0.25").
 */
export function formatQuantityMicro(
  micro: bigint | string | null | undefined,
): string {
  if (micro === null || micro === undefined || micro === "") {
    return "0";
  }
  let value: bigint;
  try {
    value = typeof micro === "bigint" ? micro : BigInt(micro);
  } catch {
    return "0";
  }
  const negative = value < BigInt(0);
  const abs = negative ? -value : value;
  const whole = abs / BigInt(1_000_000);
  const frac = (abs % BigInt(1_000_000))
    .toString()
    .padStart(6, "0")
    .replace(/0+$/, "");
  const text = frac ? `${whole}.${frac}` : `${whole}`;
  return negative ? `-${text}` : text;
}

/**
 * Porcentaje en micro-fracción → string con 1 decimal
 * (1_000_000 = 100 % → "100.0%", 100_000 = 10 % → "10.0%").
 */
export function formatPercentMicro(
  micro: bigint | string | null | undefined,
): string {
  if (micro === null || micro === undefined || micro === "") {
    return "0%";
  }
  try {
    const value = typeof micro === "bigint" ? micro : BigInt(micro);
    // 1_000_000 = 100 % → /10_000 = % con 2 decimales de precisión interna.
    const percent = Number(value) / 10_000;
    return `${percent.toFixed(1)}%`;
  } catch {
    return "0%";
  }
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

/** 07/10/2026 — fecha calendario en America/Bogota (sin corrimiento UTC). */
export function formatDateShort(value: unknown): string {
  const date = toDate(value);
  return date ? shortDateFormatter.format(date) : "—";
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