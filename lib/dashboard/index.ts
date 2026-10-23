/** Mes y año (1–12) del mes anterior al actual en Bogotá. */
export function previousBogotaMonth(now: Date = new Date()): { month: number; year: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", month: "numeric", year: "numeric" }).formatToParts(now);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  return month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
}

/** Variación porcentual redondeada; `null` si no hay base con qué comparar. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

/** Saludo según la hora de Bogotá. */
export function greetingFor(now: Date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "numeric", hourCycle: "h23" }).format(now));
  return hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
}
