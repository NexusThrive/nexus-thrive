/** Las columnas de fecha del ORM son `Temporal.Instant` (`lib/temporal.d.ts`). */
export const toInstant = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms);
export const msOf = (value: unknown): number | null => {
  if (!value) return null;
  const v = value as { epochMilliseconds?: number };
  return typeof v.epochMilliseconds === "number" ? v.epochMilliseconds : new Date(value as string).getTime();
};
