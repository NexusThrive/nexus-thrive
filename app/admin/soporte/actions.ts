"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/ops/access";
import { logOps } from "@/lib/ops/audit";
import { checkTransition, isTicketPriority, isTicketStatus, statusMeta, TICKET_CATEGORIES, validateTicket, type TicketInput } from "@/lib/ops/support-rules";
import { addTicketMessage, createTicket, getTicket, markFirstResponse, setTicketStatus, updateTicketFields } from "@/lib/ops/tickets";

export type TicketResult = { ok: true; id: string; code?: string } | { ok: false; message: string; errors?: Partial<Record<keyof TicketInput, string>> };
const DENIED = { ok: false as const, message: "No tienes permiso para esta acción." };

function refresh(id?: string, tenantId?: string | null) {
  revalidatePath("/admin/soporte");
  revalidatePath("/admin");
  if (id) revalidatePath(`/admin/soporte/${id}`);
  if (tenantId) revalidatePath(`/admin/negocios/${tenantId}`);
}

export async function createTicketAction(input: TicketInput): Promise<TicketResult> {
  const ctx = await requireStaff("tickets.reply");
  if (!ctx) return DENIED;
  const v = validateTicket(input);
  if (!v.ok) return { ok: false, message: "Revisa los campos marcados.", errors: v.errors };
  if (v.value.assigneeId && v.value.assigneeId !== ctx.staffId && !ctx.permissions.includes("tickets.escalate")) {
    return { ok: false, message: "Solo puedes asignarte el ticket a ti; asignarlo a otra persona requiere escalar." };
  }
  const t = await createTicket(v.value);
  await logOps(ctx, "TICKET_SAVE", { targetTenantId: v.value.tenantId ?? undefined, metadata: { ticketId: t.id, code: t.code, created: true } });
  refresh(t.id, v.value.tenantId);
  return { ok: true, id: t.id, code: t.code };
}

/** Respuesta al cliente (cuenta como primera respuesta) o nota interna. */
export async function addTicketMessageAction(id: string, body: string, internal: boolean): Promise<TicketResult> {
  const ctx = await requireStaff("tickets.reply");
  if (!ctx) return DENIED;
  const text = body.trim().slice(0, 5000);
  if (text.length < 2) return { ok: false, message: "Escribe el mensaje." };
  const t = await getTicket(id);
  if (!t) return { ok: false, message: "El ticket no existe." };
  await addTicketMessage(id, text, internal, ctx);
  if (!internal) await markFirstResponse(id);
  refresh(id, t.tenantId);
  return { ok: true, id };
}

export async function setTicketStatusAction(id: string, status: string, solution?: string): Promise<TicketResult> {
  const ctx = await requireStaff(status === "ESCALATED" ? "tickets.escalate" : "tickets.reply");
  if (!ctx) return DENIED;
  if (!isTicketStatus(status)) return { ok: false, message: "Estado no válido." };
  const t = await getTicket(id);
  if (!t) return { ok: false, message: "El ticket no existe." };
  const sol = solution?.trim() ? solution.trim().slice(0, 5000) : t.solution;
  const check = checkTransition(t.status, status, sol);
  if (!check.ok) return { ok: false, message: check.message };
  await setTicketStatus(id, status, status === "RESOLVED" ? sol : null);
  await addTicketMessage(id, `Estado: ${statusMeta(t.status).label} → ${statusMeta(status).label}.${status === "RESOLVED" ? `\nSolución: ${sol}` : ""}`, true, ctx);
  await logOps(ctx, "TICKET_STATUS", { targetTenantId: t.tenantId ?? undefined, targetTenantName: t.tenantName ?? undefined, metadata: { ticketId: id, code: t.code, from: t.status, to: status } });
  refresh(id, t.tenantId);
  return { ok: true, id };
}

/** Asignar, cambiar prioridad, categoría o negocio. */
export async function updateTicketAction(id: string, fields: { assigneeId?: string | null; priority?: string; category?: string; tenantId?: string | null }): Promise<TicketResult> {
  const ctx = await requireStaff("tickets.reply");
  if (!ctx) return DENIED;
  const t = await getTicket(id);
  if (!t) return { ok: false, message: "El ticket no existe." };
  if (fields.priority !== undefined && !isTicketPriority(fields.priority)) return { ok: false, message: "Prioridad no válida." };
  if (fields.category !== undefined && !(TICKET_CATEGORIES as readonly string[]).includes(fields.category)) return { ok: false, message: "Categoría no válida." };
  if (fields.assigneeId !== undefined && fields.assigneeId !== ctx.staffId && fields.assigneeId !== null && !ctx.permissions.includes("tickets.escalate")) {
    return { ok: false, message: "Solo puedes tomar el ticket tú; asignarlo a otra persona requiere escalar." };
  }
  await updateTicketFields(id, fields as Parameters<typeof updateTicketFields>[1]);
  await logOps(ctx, "TICKET_SAVE", { targetTenantId: t.tenantId ?? undefined, metadata: { ticketId: id, code: t.code, ...fields } });
  refresh(id, t.tenantId);
  return { ok: true, id };
}
