/** Entregables en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
export async function createDeliverableAction(_s: string, input: { title: string }) {
  await wait();
  return input.title.trim().length < 3 ? { ok: false as const, message: "Ponle un nombre al entregable.", field: "title" } : { ok: true as const, message: "Entregable creado" };
}
export async function uploadDeliverableFileAction() { await wait(); return { ok: true as const, message: "Archivo agregado" }; }
export async function sendDeliverableAction() { await wait(); return { ok: true as const, message: "Listo para enviar al cliente", link: "https://app.nexusthrive.com.co/entregable/AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde" }; }
export async function decideDeliverableAction(_t: string, input: { decision: string; name: string; comment: string }) {
  await wait();
  if (input.name.trim().length < 2) return { ok: false as const, message: "Escribe tu nombre para dejar constancia.", field: "name" };
  if (input.decision === "CHANGES_REQUESTED" && input.comment.trim().length < 5) return { ok: false as const, message: "Cuéntanos qué hay que cambiar.", field: "comment" };
  return { ok: true as const, message: input.decision === "APPROVED" ? "¡Gracias! Quedó aprobado." : "¡Gracias! Enviamos tus cambios." };
}
