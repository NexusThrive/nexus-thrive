"use server";

import { revalidatePath } from "next/cache";
import { createTask, setTaskDone, updateTask } from "@/lib/business/customers/tasks-db";
import { requireTenantContext } from "@/lib/core/tenancy/context";

export type TaskResult = { ok: true; message: string } | { ok: false; message: string };
const refresh = (slug: string) => {
  revalidatePath(`/${slug}/tareas`);
  revalidatePath(`/${slug}`, "layout");
};
const NO_ACCESS: TaskResult = { ok: false, message: "No tienes acceso a este negocio." };

export async function createTaskAction(slug: string, input: { title: string; dueDay: string; assigneeId: string; customerId: string; notes: string }): Promise<TaskResult> {
  const ctx = await requireTenantContext(slug, "/tareas");
  if (!ctx) return NO_ACCESS;
  const r = await createTask(ctx.tenantId, { title: input.title, notes: input.notes, dueDay: input.dueDay || null, assigneeId: input.assigneeId || null, customerId: input.customerId || null }, ctx.memberId);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: "Tarea creada" };
}

export async function completeTaskAction(slug: string, id: string): Promise<TaskResult> {
  const ctx = await requireTenantContext(slug, "/tareas");
  if (!ctx) return NO_ACCESS;
  const r = await setTaskDone(ctx.tenantId, id, true, ctx.memberId);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: "Tarea completada" };
}

export async function rescheduleTaskAction(slug: string, id: string, dueDay: string, assigneeId: string): Promise<TaskResult> {
  const ctx = await requireTenantContext(slug, "/tareas");
  if (!ctx) return NO_ACCESS;
  const r = await updateTask(ctx.tenantId, id, { dueDay: dueDay || null, assigneeId: assigneeId || null });
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: "Tarea actualizada" };
}
