/** Ficha del cliente en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
export async function duplicateCustomerAction() {
  await wait();
  return { ok: true as const, message: "Cliente duplicado", id: "c-copia" };
}
export async function deleteCustomerFromFichaAction() {
  await wait();
  return { ok: false as const, suggestArchive: true, message: "Este cliente tiene ventas, citas o facturas. Archívalo para conservar su historial." };
}
export async function attachCustomerFileAction() {
  await wait();
  return { ok: true as const, message: "Archivo adjuntado" };
}
