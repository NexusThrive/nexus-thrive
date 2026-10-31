/** Las columnas de fecha del ORM son `Temporal.Instant` (`lib/temporal.d.ts`). */
export const toInstant = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms);
/** Milisegundos desde 1970 de un instante (Temporal) o de una fecha en texto; `null` si no hay valor. */
export const msOf = (value: unknown): number | null => {
  if (!value) return null;
  const v = value as { epochMilliseconds?: number };
  return typeof v.epochMilliseconds === "number" ? v.epochMilliseconds : new Date(value as string).getTime();
};
