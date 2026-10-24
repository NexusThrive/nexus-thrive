/**
 * Límite de negocios por persona (reglas puras). Sin límite fijado, una persona puede tener los negocios que quiera;
 * el Operations Center fija un máximo por correo. Cuentan los negocios donde es dueña y las invitaciones de dueño abiertas.
 */
export const MAX_LIMIT = 500;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** `null` = sin límite. Devuelve el texto del problema, o null si puede crear uno más. */
export function limitProblem(owned: number, limit: number | null): string | null {
  if (limit === null) return null;
  if (owned >= limit) return `Esta cuenta ya tiene ${owned} ${owned === 1 ? "negocio" : "negocios"} y su límite es ${limit}. Pide al equipo de NEXUS que lo amplíe.`;
  return null;
}

/** Lo que escribió quien edita el límite: vacío = sin límite; si no, un entero entre 1 y MAX_LIMIT. */
export function parseLimit(raw: string): { ok: true; value: number | null } | { ok: false; message: string } {
  const text = raw.trim();
  if (!text) return { ok: true, value: null };
  if (!/^\d+$/.test(text)) return { ok: false, message: "Escribe un número entero o deja vacío para quitar el límite." };
  const n = Number(text);
  if (n < 1 || n > MAX_LIMIT) return { ok: false, message: `El límite va de 1 a ${MAX_LIMIT}.` };
  return { ok: true, value: n };
}

/** Un slug libre a partir del nombre: minúsculas, sin tildes, con guiones, y un sufijo si ya existe. */
export function slugFromName(name: string, taken: (slug: string) => boolean): string {
  const base = name.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "negocio";
  if (!taken(base)) return base;
  for (let i = 2; i < 1000; i++) if (!taken(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now().toString(36)}`;
}
