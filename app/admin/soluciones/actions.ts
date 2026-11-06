"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { SOLUTION_IDS, SOLUTIONS, type SolutionId } from "@/lib/core/capabilities/solutions";
import { createAdminDb } from "@/lib/platform/admin/db";
import { setTenantSolution } from "@/lib/platform/admin/solutions-db";
import { requireStaff } from "@/lib/platform/team/access";

export type SolutionResult = { ok: true; message: string } | { ok: false; message: string };

/** Fija la solución de un negocio (`auto` = la de su rubro). Es la revisión manual de los negocios dudosos; queda en la bitácora. */
export async function setSolutionAction(tenantId: string, value: string): Promise<SolutionResult> {
  const staff = await requireStaff("accounts.modules");
  if (!staff) return { ok: false, message: "No tienes permisos para cambiar la solución de un negocio." };
  const solution = value === "auto" ? null : (SOLUTION_IDS as readonly string[]).includes(value) ? (value as SolutionId) : undefined;
  if (solution === undefined) return { ok: false, message: "Esa solución no existe." };
  const updated = await setTenantSolution(tenantId, solution);
  if (!updated) return { ok: false, message: "No se encontró el negocio." };
  try {
    const forwarded = (await headers()).get("x-forwarded-for");
    await createAdminDb().logAudit({ actorId: staff.clerkUserId, actorEmail: staff.email, action: "ACCOUNT_UPDATE", targetTenantId: tenantId, targetTenantName: updated.name, metadata: { solution: solution ?? "auto" }, ipAddress: forwarded?.split(",")[0]?.trim() ?? null, userAgent: null });
  } catch (error) {
    console.error("[admin] audit failed:", error);
  }
  revalidatePath("/admin/soluciones");
  return { ok: true, message: solution ? `${updated.name}: ${SOLUTIONS[solution].label}` : `${updated.name}: vuelve a la solución de su rubro` };
}
