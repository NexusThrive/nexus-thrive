/**
 * Rangos de mes en horario de Bogotá.
 *
 * Utilidad de Foundation: la comparten las métricas de finanzas (Core) y las de
 * membresías (gimnasio). Antes eran funciones privadas de `lib/core/tenancy/db.ts`.
 */

/**
 * Rango del mes en horario de Bogotá (UTC−5): inicio del mes y del
 * siguiente, como `Temporal.Instant` (codec obligatorio del driver).
 * Los registros se comparan con `>= start` y `< end`.
 */
export function monthRangeBogota(year: number, month: number): {
  start: Temporal.Instant;
  end: Temporal.Instant;
} {
  // 05:00 UTC del día 1 = 00:00 en Bogotá (UTC−5). JS normaliza el
  // overflow: mes 12 → enero del año siguiente.
  const start = Temporal.Instant.fromEpochMilliseconds(
    Date.UTC(year, month - 1, 1, 5, 0, 0),
  );
  const end = Temporal.Instant.fromEpochMilliseconds(
    Date.UTC(year, month, 1, 5, 0, 0),
  );
  return { start, end };
}

/** Valida y normaliza un mes/año; por defecto usa el mes actual (Bogotá). */
export function resolveMonthYear(month?: number, year?: number) {
  const now = new Date();
  // El día actual en Bogotá: DateTimeFormat con timeZone para no depender
  // de la zona horaria del servidor.
  const bogotaParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    month: "numeric",
    year: "numeric",
  }).formatToParts(now);
  const bogotaMonth = Number(
    bogotaParts.find((part) => part.type === "month")?.value,
  );
  const bogotaYear = Number(
    bogotaParts.find((part) => part.type === "year")?.value,
  );

  const resolvedMonth = month ?? bogotaMonth;
  const resolvedYear = year ?? bogotaYear;

  if (
    !Number.isInteger(resolvedMonth) ||
    resolvedMonth < 1 ||
    resolvedMonth > 12
  ) {
    throw new Error("Mes inválido para las métricas financieras.");
  }
  if (!Number.isInteger(resolvedYear) || resolvedYear < 2000 || resolvedYear > 2100) {
    throw new Error("Año inválido para las métricas financieras.");
  }

  return { month: resolvedMonth, year: resolvedYear };
}
