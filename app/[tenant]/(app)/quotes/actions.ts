"use server";

import { revalidatePath } from "next/cache";
import { canGovernBudget, requireTenantContext } from "@/lib/tenant/context";
import { ensureProjectContainers } from "@/lib/construction/containers";

export type MigrateLegacyResult =
  | { ok: true; projectId: string; message: string }
  | { ok: false; message: string };

/**
 * Pasa una cotización anterior (sin obra) a una obra nueva, con su
 * presupuesto, partidas y APU. Si la cotización no tenía cliente, se usa el
 * elegido en el formulario. Si algo falla, la obra creada se elimina y la
 * cotización queda como estaba. Solo OWNER / SUPERADMIN.
 */
export async function migrateLegacyQuoteAction(
  tenantSlug: string,
  quoteId: string,
  formData: FormData,
): Promise<MigrateLegacyResult> {
  const context = await requireTenantContext(tenantSlug, "/quotes");
  if (!context) return { ok: false, message: "No tienes acceso a este negocio." };
  if (!canGovernBudget(context.role)) {
    return { ok: false, message: "Solo el dueño del negocio puede migrar cotizaciones." };
  }
  const { tenantDb } = context;
  const quote = await tenantDb.quotes.record(quoteId);
  if (!quote) return { ok: false, message: "No se encontró la cotización." };
  if (quote.projectId) return { ok: false, message: "Esta cotización ya pertenece a una obra." };

  const customerId = quote.customerId ?? String(formData.get("customerId") ?? "").trim();
  if (!customerId) {
    return { ok: false, message: "Elige el cliente de la obra: esta cotización no tenía cliente." };
  }

  let projectId: string | null = null;
  try {
    const project = await tenantDb.projects.create({ customerId, name: quote.title });
    projectId = project.id;
    await ensureProjectContainers(tenantDb, project.id);
    const member = await tenantDb.users.findByClerkUserId(context.userId);
    const result = await tenantDb.projectQuotes.adoptLegacyQuote(quoteId, project.id, {
      userId: context.userId,
      userName: member?.name?.trim() || member?.email || "Usuario",
    });
    revalidatePath(`/${tenantSlug}/quotes`);
    revalidatePath(`/${tenantSlug}/projects`);
    const differs = Math.abs(Number(result.newTotal) / 1_000_000 - Number(result.legacyTotal)) >= 0.01;
    return {
      ok: true,
      projectId: project.id,
      message: differs
        ? `Obra ${project.code} creada. El total recalculado difiere del original; revísalo en el presupuesto.`
        : `Obra ${project.code} creada con la cotización ${quote.code}.`,
    };
  } catch (error) {
    if (projectId) {
      await tenantDb.projects.delete(projectId);
    }
    console.error("[quotes] migrateLegacyQuoteAction", error);
    return {
      ok: false,
      message:
        error instanceof Error && error.message.includes("Cliente no encontrado")
          ? "El cliente elegido no existe en este negocio."
          : "No se pudo migrar la cotización. No se cambió nada.",
    };
  }
}
