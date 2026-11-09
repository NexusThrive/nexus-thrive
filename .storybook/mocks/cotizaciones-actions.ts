/** Cotizaciones en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
export async function createQuoteAction(_s: string, input: { title: string }) {
  await wait();
  return input.title.trim().length < 3 ? { ok: false as const, message: "Escribe de qué trata la cotización." } : { ok: true as const, message: "Cotización COT-0004 creada" };
}
export async function sendQuoteAction() { await wait(); return { ok: true as const, message: "Cotización marcada como enviada" }; }
export async function approveQuoteAction() { await wait(); return { ok: true as const, message: "Aprobada: nació el pedido con un anticipo de 800.000 pendiente" }; }
export async function rejectQuoteAction(_s: string, _id: string, note: string) {
  await wait();
  return note.trim().length < 3 ? { ok: false as const, message: "Escribe por qué la rechazó el cliente." } : { ok: true as const, message: "Cotización rechazada" };
}
