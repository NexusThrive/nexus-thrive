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
