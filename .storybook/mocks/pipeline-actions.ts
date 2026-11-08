/** Pipeline del CRM en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
const ok = (message: string) => ({ ok: true as const, message });
const CUSTOMERS = [
  { id: "c1", name: "María Pérez", phone: "323 835 7780", email: "maria@gmail.com", kind: "PERSON" as const, document: null },
  { id: "c2", name: "Mariana Gómez", phone: "310 456 1122", email: null, kind: "PERSON" as const, document: null },
  { id: "c3", name: "Tienda Moda Centro", phone: null, email: null, kind: "COMPANY" as const, document: "900.123.456" },
];
export async function searchContactsAction(_slug: string, q: string) {
  await wait(60);
  const t = q.trim().toLowerCase();
  return CUSTOMERS.filter((c) => c.name.toLowerCase().includes(t));
}
export async function quickCreateAction() {
  await wait();
  return { ...ok("Oportunidad creada"), id: "o-nueva" };
}
export async function moveStageAction() {
  await wait();
  return { ...ok("Etapa actualizada"), orderId: null };
}
export async function winAction() {
  await wait();
  return { ...ok("¡Ganada! Se creó el pedido en Ventas y cobros"), orderId: "p1" };
}
export async function loseAction() {
  await wait();
  return ok("Oportunidad perdida: quedó el motivo");
}
export async function reopenAction() {
  await wait();
  return ok("Oportunidad reabierta");
}
export async function reorderAction() {
  await wait(80);
  return { ok: true as const };
}
export async function updateOpportunityAction() {
  await wait();
  return ok("Cambios guardados");
}
export async function scheduleActivityAction() {
  await wait();
  return ok("Actividad programada");
}
export async function completeActivityAction() {
  await wait();
  return { ...ok("Actividad hecha"), opportunityId: "o1" };
}
export async function rescheduleActivityAction() {
  await wait();
  return ok("Actividad reprogramada");
}
export async function addNoteAction() {
  await wait();
  return ok("Nota registrada");
}
export async function duplicateOpportunityAction() {
  await wait();
  return { ...ok("Oportunidad duplicada"), id: "o-copia" };
}
export async function deleteOpportunityAction() {
  await wait();
  return ok("Oportunidad eliminada");
}
export async function attachOpportunityFileAction() {
  await wait();
  return ok("Archivo adjuntado");
}
