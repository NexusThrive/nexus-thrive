/** Pedidos en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
const TEXT: Record<string, string> = { CONFIRMED: "confirmado", IN_PRODUCTION: "en producción", READY: "listo", SHIPPED: "enviado", DELIVERED: "entregado", CANCELED: "cancelado" };
export async function advanceOrderAction(_s: string, _id: string, to: string) {
  await wait();
  return TEXT[to] ? { ok: true as const, message: `Pedido ${TEXT[to]}` } : { ok: false as const, message: "Ese estado no existe." };
}
export async function moveProductionAction(_s: string, _id: string, to: string) {
  await wait();
  return { ok: true as const, message: to === "DONE" ? "Terminada: el pedido quedó listo" : "Orden actualizada" };
}
export async function dispatchOrderAction(_s: string, _id: string, input: { method: string; carrier?: string; trackingCode?: string }) {
  await wait();
  if (input.method === "COURIER" && !input.trackingCode?.trim()) return { ok: false as const, message: "Revisa los datos de la entrega.", fields: { trackingCode: "Escribe el número de guía." } };
  return { ok: true as const, message: "Pedido enviado" };
}
export async function confirmDeliveryAction() { await wait(); return { ok: true as const, message: "Pedido entregado" }; }
