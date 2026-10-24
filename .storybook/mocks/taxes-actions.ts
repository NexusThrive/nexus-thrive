/** Impuestos y numeración en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

export async function loadDefaultTaxesAction() {
  await wait();
  return { ok: true as const, message: "8 tarifas cargadas" };
}
export async function createTaxRateAction(_slug: string, input: { code: string; ratePct: string }) {
  await wait();
  if (input.code === "IVA_19") return { ok: false as const, message: "Ya hay una tarifa IVA_19 vigente en esas fechas (2017-01-01 a sin fin). Termina esa vigencia antes de crear la nueva." };
  return { ok: true as const, message: "Tarifa creada" };
}
export async function updateTaxRateAction() {
  await wait();
  return { ok: true as const, message: "Tarifa actualizada" };
}
export async function createResolutionAction(_slug: string, input: { rangeFrom: string; rangeTo: string }) {
  await wait();
  if (Number(input.rangeTo) < Number(input.rangeFrom)) return { ok: false as const, message: "El número final debe ser mayor o igual que el inicial." };
  return { ok: true as const, message: `Resolución registrada: el próximo número es el ${input.rangeFrom}` };
}
export async function toggleResolutionAction(_slug: string, _id: string, active: boolean) {
  await wait();
  return { ok: true as const, message: active ? "Resolución activada" : "Resolución desactivada" };
}
