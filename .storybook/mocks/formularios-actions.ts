/** Formularios web en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
export async function createFormAction(_s: string, input: { name: string; origins: string }) {
  await wait();
  if (input.name.trim().length < 3) return { ok: false as const, message: "Ponle un nombre al formulario (por ejemplo «Landing de camisetas»)." };
  if (!/^https?:\/\//.test(input.origins.trim())) return { ok: false as const, message: `«${input.origins.trim()}» no es un dominio válido. Escríbelo así: https://mitienda.com` };
  return { ok: true as const, message: "Formulario creado: copia el código y pégalo en tu web" };
}
export async function toggleFormAction(_s: string, _id: string, enabled: boolean) { await wait(); return { ok: true as const, message: enabled ? "Formulario encendido" : "Formulario apagado: rechaza todo envío" }; }
export async function rotateKeyAction() { await wait(); return { ok: true as const, message: "Clave cambiada: actualiza el código en tu web, la anterior ya no funciona" }; }
