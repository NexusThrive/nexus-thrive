"use server";

import { revalidatePath } from "next/cache";
import { canGovernBudget, requireTenantContext } from "@/lib/tenant/context";
import type { FollowUpTypeValue } from "@/lib/construction/project-quotes";

export type QuoteActionResult = { ok: true; message: string } | { ok: false; message: string };

const FOLLOW_UP_TYPES: FollowUpTypeValue[] = ["NOTE", "CALL", "EMAIL", "MEETING", "VISIT"];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function revalidateProject(tenantSlug: string, projectId: string) {
  revalidatePath(`/${tenantSlug}/projects/${projectId}`);
  revalidatePath(`/${tenantSlug}/quotes`);
}

function quoteErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  switch (code) {
    case "NOT_FOUND":
      return "No se encontró la obra o la cotización en este negocio.";
    case "PROJECT_NOT_QUOTABLE":
      return "La obra ya está contratada o cerrada: no admite nuevas cotizaciones.";
    case "EMPTY_BUDGET":
      return "El presupuesto no tiene partidas con valor. Agrega partidas antes de cotizar.";
    case "STALE_REVISION":
      return "El presupuesto cambió mientras emitías la cotización. Recarga e inténtalo de nuevo.";
    case "NOT_PENDING":
      return "Esta versión ya no está pendiente de respuesta (fue reemplazada o ya se decidió).";
    case "BUDGET_CHANGED":
      return "El presupuesto cambió después de emitir esta versión. Emite una nueva versión para que el cliente apruebe lo que se va a ejecutar.";
    default:
      return "No se pudo completar la acción. Inténtalo de nuevo.";
  }
}

async function memberName(context: NonNullable<Awaited<ReturnType<typeof requireTenantContext>>>) {
  const member = await context.tenantDb.users.findByClerkUserId(context.userId);
  return member?.name?.trim() || member?.email || "Usuario";
}

/** Emite una nueva versión desde el presupuesto actual. OWNER / SUPERADMIN. */
export async function emitQuoteAction(
  tenantSlug: string,
  projectId: string,
  expectedRevision: number,
  formData: FormData,
): Promise<QuoteActionResult> {
  const context = await requireTenantContext(tenantSlug);
  if (!context) return { ok: false, message: "No tienes acceso a este negocio." };
  if (!canGovernBudget(context.role)) {
    return { ok: false, message: "Solo el dueño del negocio puede emitir cotizaciones." };
  }
  const validUntilRaw = String(formData.get("validUntil") ?? "").trim();
  if (validUntilRaw && !ISO_DAY.test(validUntilRaw)) {
    return { ok: false, message: "La fecha de validez no es válida." };
  }
  try {
    const { version } = await context.tenantDb.projectQuotes.emit(
      projectId,
      { validUntil: validUntilRaw || null, showApuDetail: formData.get("showApuDetail") === "on" },
      expectedRevision,
    );
    revalidateProject(tenantSlug, projectId);
    return { ok: true, message: `Versión ${version} emitida.` };
  } catch (error) {
    return { ok: false, message: quoteErrorMessage(error) };
  }
}

/** Registra la respuesta del cliente. Aprobar contrata la obra. OWNER / SUPERADMIN. */
export async function decideQuoteAction(
  tenantSlug: string,
  projectId: string,
  quoteId: string,
  decision: "APPROVE" | "REJECT",
  formData: FormData,
): Promise<QuoteActionResult> {
  const context = await requireTenantContext(tenantSlug);
  if (!context) return { ok: false, message: "No tienes acceso a este negocio." };
  if (!canGovernBudget(context.role)) {
    return { ok: false, message: "Solo el dueño del negocio puede registrar la respuesta del cliente." };
  }
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  try {
    const result = await context.tenantDb.projectQuotes.decide(quoteId, {
      decision,
      note,
      userId: context.userId,
      userName: await memberName(context),
    });
    revalidateProject(tenantSlug, projectId);
    return {
      ok: true,
      message:
        result.status === "APPROVED"
          ? `Cotización aprobada: la obra quedó contratada con la línea base v${result.baselineVersion} y el presupuesto bloqueado.`
          : "Cotización marcada como rechazada.",
    };
  } catch (error) {
    return { ok: false, message: quoteErrorMessage(error) };
  }
}

/** Registra un seguimiento comercial (cualquier miembro). */
export async function createFollowUpAction(
  tenantSlug: string,
  projectId: string,
  formData: FormData,
): Promise<QuoteActionResult> {
  const context = await requireTenantContext(tenantSlug);
  if (!context) return { ok: false, message: "No tienes acceso a este negocio." };
  const type = String(formData.get("type") ?? "NOTE") as FollowUpTypeValue;
  const note = String(formData.get("note") ?? "").trim();
  const scheduledFor = String(formData.get("scheduledFor") ?? "").trim();
  const quoteId = String(formData.get("quoteId") ?? "").trim();
  if (!FOLLOW_UP_TYPES.includes(type)) return { ok: false, message: "Tipo de seguimiento no válido." };
  if (note.length < 3) return { ok: false, message: "Escribe qué pasó o qué hay que hacer." };
  if (note.length > 1000) return { ok: false, message: "El seguimiento admite hasta 1.000 caracteres." };
  if (scheduledFor && !ISO_DAY.test(scheduledFor)) return { ok: false, message: "La fecha no es válida." };
  try {
    await context.tenantDb.projectQuotes.createFollowUp(projectId, {
      type,
      note,
      quoteId: quoteId || null,
      scheduledFor: scheduledFor || null,
      authorName: await memberName(context),
    });
    revalidateProject(tenantSlug, projectId);
    return { ok: true, message: scheduledFor ? "Seguimiento programado." : "Seguimiento registrado." };
  } catch (error) {
    return { ok: false, message: quoteErrorMessage(error) };
  }
}

export async function completeFollowUpAction(
  tenantSlug: string,
  projectId: string,
  followUpId: string,
): Promise<QuoteActionResult> {
  const context = await requireTenantContext(tenantSlug);
  if (!context) return { ok: false, message: "No tienes acceso a este negocio." };
  await context.tenantDb.projectQuotes.completeFollowUp(followUpId);
  revalidateProject(tenantSlug, projectId);
  return { ok: true, message: "Seguimiento marcado como hecho." };
}

export async function deleteFollowUpAction(
  tenantSlug: string,
  projectId: string,
  followUpId: string,
): Promise<QuoteActionResult> {
  const context = await requireTenantContext(tenantSlug);
  if (!context) return { ok: false, message: "No tienes acceso a este negocio." };
  await context.tenantDb.projectQuotes.deleteFollowUp(followUpId);
  revalidateProject(tenantSlug, projectId);
  return { ok: true, message: "Seguimiento eliminado." };
}
