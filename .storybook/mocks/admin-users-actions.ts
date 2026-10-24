/** Usuarios del Operations Center en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
export async function setUserLimitAction(_email: string, raw: string) {
  await wait();
  if (raw.trim() && !/^\d+$/.test(raw.trim())) return { ok: false as const, message: "Escribe un número entero o deja vacío para quitar el límite." };
  return { ok: true as const, message: raw.trim() ? `Límite fijado en ${raw.trim()}` : "Límite quitado" };
}
export async function createUserOrganizationAction(_email: string, name: string) {
  await wait();
  return name.trim().length < 3 ? { ok: false as const, message: "Ponle un nombre al negocio (mínimo 3 letras)." } : { ok: true as const, message: `Negocio «${name.trim()}» creado` };
}
