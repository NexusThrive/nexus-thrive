/** Cartera en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

export async function receivePaymentAction(_slug: string, _id: string, input: { amount: number }) {
  await wait();
  return input.amount >= 1_000_000 ? { ok: true as const, message: "Cuenta saldada · R-000045" } : { ok: true as const, message: "Abono registrado · R-000045. Saldo $ 600.000" };
}
export async function paySupplierAction(_slug: string, _id: string, input: { amount: number }) {
  await wait();
  if (input.amount === 13) return { ok: false as const, message: "La factura cambió mientras pagabas. Vuelve a intentarlo." };
  return { ok: true as const, message: "Pago registrado. Saldo $ 200.000" };
}
