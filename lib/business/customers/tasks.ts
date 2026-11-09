/**
 * Tareas (HU-actividades-01), reglas puras: un paso concreto con fecha y responsable. «Vencida» es una tarea abierta cuyo día ya pasó
 * (hoy no está vencida). Los días son «AAAA-MM-DD» en hora de Bogotá.
 */
export type TaskView = "mine" | "overdue" | "all";

export function validateTask(t: { title: string; dueDay?: string | null }): string | null {
  if (t.title.trim().length < 3) return "Escribe qué hay que hacer.";
  if (t.title.trim().length > 200) return "El título es muy largo (máximo 200 caracteres).";
  if (t.dueDay && !/^\d{4}-\d{2}-\d{2}$/.test(t.dueDay)) return "La fecha no es válida.";
  return null;
}

export const isTaskOverdue = (task: { status: string; dueDay: string | null }, today: string) => task.status === "OPEN" && task.dueDay !== null && task.dueDay < today;

/** Orden de trabajo: primero las vencidas (la más atrasada arriba), luego por fecha y al final las sin fecha. */
export function sortTasks<T extends { dueDay: string | null; createdAt: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => (a.dueDay ?? "9999-99-99").localeCompare(b.dueDay ?? "9999-99-99") || b.createdAt.localeCompare(a.createdAt));
}
