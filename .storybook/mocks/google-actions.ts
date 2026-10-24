/** Ficha de Google en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
export async function connectGoogleAction(_s: string, placeId: string) { await wait(); return placeId.startsWith("ChIJ") ? { ok: true as const, message: "Ficha conectada y sincronizada" } : { ok: false as const, message: "El ID de lugar no parece válido (empieza por «ChIJ»)." }; }
export async function syncGoogleAction() { await wait(); return { ok: true as const, message: "Ficha sincronizada" }; }
export async function disconnectGoogleAction() { await wait(); return { ok: true as const, message: "Ficha desconectada" }; }
