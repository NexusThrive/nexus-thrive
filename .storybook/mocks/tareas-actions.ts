/** Tareas en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
export async function createTaskAction(_s: string, input: { title: string }) {
  await wait();
  return input.title.trim().length < 3 ? { ok: false as const, message: "Escribe qué hay que hacer." } : { ok: true as const, message: "Tarea creada" };
}
export async function completeTaskAction() { await wait(); return { ok: true as const, message: "Tarea completada" }; }
export async function rescheduleTaskAction() { await wait(); return { ok: true as const, message: "Tarea actualizada" }; }
