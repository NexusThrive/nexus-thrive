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

/** Nombre que se guarda cuando la cuenta no trae ninguno: no es un nombre de persona. */
const PLACEHOLDER_NAMES = new Set(["usuario", "user", "hola"]);

/** Primera palabra de un nombre, o `null` si está vacío o es el nombre de relleno («Usuario»). */
function firstWord(name?: string | null): string | null {
  const word = name?.trim().split(/\s+/)[0];
  return word && !PLACEHOLDER_NAMES.has(word.toLowerCase()) ? word : null;
}

/** «juan.perez@correo.com» → «Juan» (la primera parte del correo, con inicial en mayúscula). */
export function nameFromEmail(email?: string | null): string | null {
  const part = email?.split("@")[0]?.split(/[._\-+\d]+/).find(Boolean);
  return part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : null;
}

/**
 * Nombre para el saludo del inicio: el de la cuenta (si cambia, se refleja al instante), luego el del equipo (Ajustes →
 * Equipo) y por último el del correo. El nombre de relleno «Usuario» no cuenta como nombre.
 */
export function greetingName(input: { accountFirstName?: string | null; accountUsername?: string | null; teamName?: string | null; email?: string | null }): string {
  return firstWord(input.accountFirstName) ?? firstWord(input.accountUsername) ?? firstWord(input.teamName) ?? nameFromEmail(input.email) ?? "Hola";
}

/** Saludo según la hora de Bogotá. */
export function greetingFor(now: Date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "numeric", hourCycle: "h23" }).format(now));
  return hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
}
