/** Punto de venta en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
export async function createTerminalAction() { await wait(); return { ok: true as const, message: "Terminal creada" }; }
export async function openTurnAction() { await wait(); return { ok: true as const, message: "Turno abierto" }; }
export async function closeTurnAction(_s: string, _id: string, counted: number) {
  await wait();
  return counted === 100 ? { ok: false as const, message: "Solo quien abrió el turno puede cerrarlo." } : { ok: true as const, message: "Turno cerrado · Faltan 200", difference: -200 };
}
export async function sellAction(_s: string, input: { lines: { quantity: number }[] }) {
  await wait();
  return { ok: true as const, documentId: "d1", number: 42, total: 34_000 * input.lines.length, tip: 0, change: 0, receipts: ["R-000001"] };
}
export async function scanBarcodeAction(_s: string, code: string) {
  await wait();
  return code === "7701234567890" ? { ok: true as const, productId: "p2", name: "Barra de proteína" } : { ok: false as const, message: "No hay un producto con ese código." };
}
export async function findSaleAction(_s: string, number: number) {
  await wait();
  if (number !== 42) return { ok: false as const, message: "No se encontró esa venta." };
  return { ok: true as const, sale: { documentId: "d42", number: 42, total: 215_000, issuedAt: "2026-10-24", lines: [{ productId: "p1", description: "Proteína whey 2 lb", sold: 2, returned: 0, remaining: 2, unitPrice: 100_000, discountPct: 0, taxRatePct: 19 }, { productId: "p2", description: "Barra de proteína", sold: 3, returned: 3, remaining: 0, unitPrice: 5_000, discountPct: 0, taxRatePct: 0 }] } };
}
export async function returnSaleAction(_s: string, input: { lines: { quantity: number }[] }) {
  await wait();
  return input.lines.some((l) => l.quantity > 0) ? { ok: true as const, message: "Devolución registrada · nota crédito N.º 5" } : { ok: false as const, message: "Elige qué se devuelve." };
}
