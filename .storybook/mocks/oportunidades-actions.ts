/** Oportunidades en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
export async function createOpportunityAction(_s: string, input: { interest: string }) {
  await wait();
  return input.interest.trim().length < 3 ? { ok: false as const, message: "Escribe qué le interesa a la persona." } : { ok: true as const, message: "Oportunidad creada" };
}
export async function moveStageAction() { await wait(); return { ok: true as const, message: "Etapa actualizada" }; }
export async function nextActionAction(_s: string, _id: string, action: string) {
  await wait();
  return action.trim().length < 3 ? { ok: false as const, message: "Escribe cuál es el siguiente paso." } : { ok: true as const, message: "Siguiente paso guardado" };
}
export async function winAction() { await wait(); return { ok: true as const, message: "¡Ganada! El contacto pasa a cliente" }; }
export async function loseAction(_s: string, _id: string, reason: string) {
  await wait();
  return reason.trim().length < 3 ? { ok: false as const, message: "Escribe por qué se perdió." } : { ok: true as const, message: "Oportunidad perdida: quedó el motivo" };
}
