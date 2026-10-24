/** Campañas y reseñas en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
export async function createLinkAction(_s: string, input: { name: string; utmSource: string }) {
  await wait();
  return input.name.trim().length < 3 ? { ok: false as const, message: "Ponle un nombre a la campaña." } : { ok: true as const, message: "Enlace de campaña creado" };
}
export async function toggleLinkAction(_s: string, _id: string, active: boolean) { await wait(); return { ok: true as const, message: active ? "Enlace activado" : "Enlace apagado" }; }
export async function handleReviewAction() { await wait(); return { ok: true as const, message: "Reseña marcada como atendida" }; }
