/** Cobros en línea en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
export async function createIntentAction(_s: string, input: { amount: number }) {
  await wait();
  return input.amount < 1000 ? { ok: false as const, message: "El valor mínimo de un cobro es $ 1.000." } : { ok: true as const, message: "Enlace de cobro creado" };
}
export async function cancelIntentAction() { await wait(); return { ok: true as const, message: "Cobro cancelado" }; }
export async function confirmManualAction(_s: string, _r: string, evidence: string) {
  await wait();
  return evidence.length < 4 ? { ok: false as const, message: "Escribe la referencia o evidencia de la transferencia." } : { ok: true as const, message: "Pago confirmado" };
}
export async function refundAction(_s: string, _id: string, amount: number) {
  await wait();
  return amount > 150000 ? { ok: false as const, message: "Solo se puede reembolsar 150.000." } : { ok: true as const, message: "Reembolso registrado. Quedan 0 cobrados" };
}
export async function reconcileAction() {
  await wait();
  return { ok: true as const, bad: [], result: { expectedTotal: 75_000, reportedTotal: 53_000, matched: 1, differences: [{ kind: "amount_mismatch" as const, externalId: "evt_dif", expected: 45_000, reported: 44_000 }, { kind: "missing_in_nexus" as const, externalId: "evt_extra", expected: null, reported: 9_000 }] } };
}
