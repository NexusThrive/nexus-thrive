/**
 * Conversión de fechas de Prisma 8. Las columnas `DateTime` llegan como
 * Temporal (Instant/DateTime), no como `Date`; `new Date(temporal)` falla.
 * Se lee `epochMilliseconds` cuando existe y se normalizan los nanosegundos
 * del ISO impreso como último recurso.
 */
export function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "epochMilliseconds" in value) {
    return new Date((value as { epochMilliseconds: number }).epochMilliseconds).toISOString();
  }
  const raw = String(value).replace(/\.(\d{3})\d*(Z|[+-])/, ".$1$2");
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
