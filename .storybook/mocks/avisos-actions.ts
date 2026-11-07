/** Plantillas y avisos en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
export async function saveTemplateAction(_s: string, input: { body: string }) {
  await wait();
  return input.body.trim().length < 5 ? { ok: false as const, message: "Escribe el texto del mensaje." } : { ok: true as const, message: "Plantilla guardada" };
}
export async function metaStatusAction(_s: string, _id: string, status: string, metaName: string) {
  await wait();
  return status === "APPROVED" && !metaName.trim() ? { ok: false as const, message: "Escribe el nombre exacto de la plantilla en Meta (minúsculas y guion bajo)." } : { ok: true as const, message: "Estado en Meta guardado" };
}
export async function sendPendingAction() { await wait(); return { ok: true as const, message: "1 enviados · 2 listos para enviar con un toque" }; }
