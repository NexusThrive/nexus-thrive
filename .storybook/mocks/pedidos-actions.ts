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
