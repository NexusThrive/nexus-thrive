import { todayCO } from "@/lib/foundation/dates/plain-date";
import { db } from "@/prisma/db";
import { isTaskOverdue, sortTasks, validateTask, type TaskView } from "./tasks";

/** Tareas del negocio (HU-actividades-01). Todo por `tenantId`. */
export type TaskRow = { id: string; title: string; notes: string | null; dueDay: string | null; assigneeId: string | null; assigneeName: string | null; customerId: string | null; customerName: string | null; projectId: string | null; projectName: string | null; status: "OPEN" | "DONE"; overdue: boolean; createdAt: string };
type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

export async function createTask(tenantId: string, input: { title: string; notes?: string | null; dueDay?: string | null; assigneeId?: string | null; customerId?: string | null; opportunityId?: string | null; projectId?: string | null }, createdById: string): Promise<Result<{ id: string }>> {
  const problem = validateTask(input);
  if (problem) return { ok: false, message: problem };
  if (input.customerId && !(await db.orm.public.Customer.where({ tenantId, id: input.customerId }).select("id").first())) return { ok: false, message: "El contacto no existe en este negocio." };
  if (input.assigneeId && !(await db.orm.public.User.where({ id: input.assigneeId, tenantId }).select("id").first())) return { ok: false, message: "Esa persona no es del equipo de este negocio." };
  if (input.projectId && !(await db.orm.public.Project.where({ tenantId, id: input.projectId }).select("id").first())) return { ok: false, message: "El proyecto no existe en este negocio." };
  const t = await db.orm.public.Task.create({ tenantId, title: input.title.trim().slice(0, 200), notes: input.notes?.trim().slice(0, 500) || null, dueDay: input.dueDay || null, assigneeId: input.assigneeId ?? null, customerId: input.customerId ?? null, opportunityId: input.opportunityId ?? null, projectId: input.projectId ?? null, createdById });
  return { ok: true, id: t.id };
}

/** Completa o reabre una tarea. */
export async function setTaskDone(tenantId: string, id: string, done: boolean, userId: string): Promise<Result> {
  const plan = db.sql.public.Task.update(done ? { status: "DONE", doneAt: Temporal.Instant.fromEpochMilliseconds(Date.now()), doneById: userId } : { status: "OPEN", doneAt: null, doneById: null })
    .where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.tenantId, tenantId), fns.eq(f.status, done ? "OPEN" : "DONE")))
    .returning("id")
    .build();
  return (await db.transaction((tx) => tx.query(plan))).length ? { ok: true } : { ok: false, message: done ? "La tarea ya estaba completada o no existe." : "La tarea ya estaba abierta o no existe." };
}

/** Reasigna o cambia la fecha de una tarea abierta. */
export async function updateTask(tenantId: string, id: string, patch: { dueDay?: string | null; assigneeId?: string | null }): Promise<Result> {
  if (patch.dueDay && !/^\d{4}-\d{2}-\d{2}$/.test(patch.dueDay)) return { ok: false, message: "La fecha no es válida." };
  if (patch.assigneeId && !(await db.orm.public.User.where({ id: patch.assigneeId, tenantId }).select("id").first())) return { ok: false, message: "Esa persona no es del equipo de este negocio." };
  const task = await db.orm.public.Task.where({ tenantId, id }).first();
  if (!task || task.status !== "OPEN") return { ok: false, message: "La tarea ya está completada o no existe." };
  await db.orm.public.Task.where({ tenantId, id }).update({ ...(patch.dueDay !== undefined ? { dueDay: patch.dueDay } : {}), ...(patch.assigneeId !== undefined ? { assigneeId: patch.assigneeId } : {}) });
  return { ok: true };
}

/** Tareas según la vista: «mine» = asignadas a mí (abiertas), «overdue» = vencidas de todo el equipo, «all» = todas las abiertas. */
export async function listTasks(tenantId: string, view: TaskView, memberId: string, today = todayCO(), limit = 300): Promise<TaskRow[]> {
  const open = await db.orm.public.Task.where({ tenantId, status: "OPEN" }).orderBy((t) => t.createdAt.desc()).limit(1000).all();
  const picked = open.filter((t) => (view === "mine" ? t.assigneeId === memberId : view === "overdue" ? isTaskOverdue(t, today) : true)).slice(0, limit);
  const customerIds = [...new Set(picked.map((t) => t.customerId).filter((x): x is string => Boolean(x)))];
  const assigneeIds = [...new Set(picked.map((t) => t.assigneeId).filter((x): x is string => Boolean(x)))];
  const projectIds = [...new Set(picked.map((t) => t.projectId).filter((x): x is string => Boolean(x)))];
  const [projects, customers, users] = await Promise.all([
    projectIds.length ? db.orm.public.Project.where({ tenantId }).where((p) => p.id.in(projectIds)).select("id", "name").all() : Promise.resolve([]),
    customerIds.length ? db.orm.public.Customer.where({ tenantId }).where((c) => c.id.in(customerIds)).select("id", "name").all() : Promise.resolve([]),
    assigneeIds.length ? db.orm.public.User.where({ tenantId }).where((u) => u.id.in(assigneeIds)).select("id", "name").all() : Promise.resolve([]),
  ]);
  const pn = new Map(projects.map((p) => [p.id, p.name]));
  const cn = new Map(customers.map((c) => [c.id, c.name]));
  const un = new Map(users.map((u) => [u.id, u.name]));
  return sortTasks(picked.map((t) => ({ id: t.id, title: t.title, notes: t.notes, dueDay: t.dueDay, assigneeId: t.assigneeId, assigneeName: t.assigneeId ? (un.get(t.assigneeId) ?? null) : null, customerId: t.customerId, customerName: t.customerId ? (cn.get(t.customerId) ?? null) : null, projectId: t.projectId, projectName: t.projectId ? (pn.get(t.projectId) ?? null) : null, status: "OPEN" as const, overdue: isTaskOverdue(t, today), createdAt: String(t.createdAt) })));
}

/** Cuántas tareas abiertas y vencidas tiene asignadas una persona (la campana avisa). */
export async function overdueCountFor(tenantId: string, memberId: string, today = todayCO()): Promise<number> {
  const mine = await db.orm.public.Task.where({ tenantId, assigneeId: memberId, status: "OPEN" }).select("dueDay", "status").limit(1000).all();
  return mine.filter((t) => isTaskOverdue({ status: t.status, dueDay: t.dueDay }, today)).length;
}

/** Miembros del equipo para asignar (id y nombre). */
export async function teamOptions(tenantId: string): Promise<{ id: string; name: string }[]> {
  const users = await db.orm.public.User.where({ tenantId }).select("id", "name").limit(200).all();
  return users.map((u) => ({ id: u.id, name: u.name ?? "Integrante" })).sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Proyectos del negocio para ligar tareas (id y nombre), los más recientes primero. */
export async function projectOptions(tenantId: string): Promise<{ id: string; name: string }[]> {
  return (await db.orm.public.Project.where({ tenantId }).orderBy((p) => p.createdAt.desc()).select("id", "name").limit(200).all()).map((p) => ({ id: p.id, name: p.name }));
}
