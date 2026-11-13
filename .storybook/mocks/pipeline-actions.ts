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

/** Detalle de muestra para el panel lateral. */
export async function previewOpportunityAction(_slug: string, id: string) {
  await wait(500);
  const iso = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  return {
    ok: true as const,
    detail: {
      id,
      name: "Oportunidad de muestra",
      status: "OPEN" as const,
      value: 4_800_000,
      probability: 40,
      priority: 2,
      expectedClose: null,
      tags: [] as string[],
      description: "Pidieron cotización de 200 camisetas con el escudo bordado.",
      source: "Referido",
      lostReason: null,
      stageId: "s1",
      stageSince: iso(30),
      createdAt: iso(120),
      customer: { id: "c1", name: "Colegio San José", email: "compras@sanjose.edu.co", phone: "3015550101" },
      owner: { id: "u1", name: "Santiago Ortiz" },
      order: null,
      stages: [],
      activities: [{ id: "t1", kind: "CALL" as const, title: "Llamar para confirmar tallas", dueAt: iso(-20), done: false, assignee: "Santiago Ortiz", assigneeId: "u1" }],
      events: [
        { id: "e1", kind: "NOTE", data: { text: "Enviamos la propuesta con precios por talla. Plazo de entrega: 12 días hábiles." }, author: "Santiago Ortiz", at: iso(2) },
        { id: "e2", kind: "STAGE", data: { from: "Nuevo", to: "Calificado" }, author: "Santiago Ortiz", at: iso(30) },
        { id: "e3", kind: "CREATED", data: {}, author: "Santiago Ortiz", at: iso(120) },
      ],
      team: [],
      reasons: [],
      files: [],
    },
  };
}
