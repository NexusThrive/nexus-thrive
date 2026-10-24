/** Tienda y pedidos en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
export async function placeOrderAction(_s: string, customer: { name: string; phone: string }) {
  await wait();
  if (customer.name.trim().length < 3) return { ok: false as const, message: "Revisa los datos marcados.", fields: { name: "Escribe tu nombre completo." } };
  return { ok: true as const, code: "T-0007", reference: "abcd2345efgh67", total: 278_000, business: "Simplapp Gym", whatsapp: "+57 300 123 4567", whatsappText: "Hola Simplapp Gym, hice el pedido T-0007" };
}
export async function cancelOrderAction() { await wait(); return { ok: true as const, message: "Pedido cancelado" }; }
export async function createLeadAction(_s: string, input: { name: string; phone: string }) {
  await wait();
  if (input.name.trim().length < 3) return { ok: false as const, message: "Revisa los datos marcados.", fields: { name: "Escribe tu nombre." } };
  return { ok: true as const };
}
export async function createReviewAction(_s: string, input: { rating: number }) {
  await wait();
  return { ok: true as const, low: input.rating <= 2, googleReviewUrl: input.rating >= 4 ? "https://search.google.com/local/writereview?placeid=ChIJdemo" : null };
}
