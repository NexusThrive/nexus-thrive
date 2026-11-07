/** Conversaciones en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
export async function replyAction(_s: string, _id: string, body: string) {
  await wait();
  if (!body.trim()) return { ok: false as const, message: "Escribe el mensaje." };
  return body.includes("tarde") ? { ok: true as const, delivery: "manual" as const, link: "https://wa.me/573001112233?text=tarde", message: "Pasaron más de 24 h desde su último mensaje: queda listo para enviarlo con un toque." } : { ok: true as const, delivery: "sent" as const, message: "Mensaje enviado" };
}
