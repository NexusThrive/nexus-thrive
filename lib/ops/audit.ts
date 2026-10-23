import { headers } from "next/headers";
import { createAdminDb, type AuditAction } from "@/lib/admin/db";
import type { StaffContext } from "./access";

/**
 * Bitácora del Operations Center (tabla AuditLog). Nunca rompe la acción
 * principal: si falla, se registra en consola y se continúa.
 */
export async function logOps(
  ctx: StaffContext,
  action: AuditAction,
  entry: { targetTenantId?: string | null; targetTenantName?: string | null; metadata?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    const h = await headers();
    await createAdminDb().logAudit({
      actorId: ctx.clerkUserId,
      actorEmail: ctx.email,
      action,
      targetTenantId: entry.targetTenantId ?? null,
      targetTenantName: entry.targetTenantName ?? null,
      metadata: { staffId: ctx.staffId, role: ctx.roleKey, ...(entry.metadata ?? {}) },
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
      userAgent: h.get("user-agent") ?? null,
    });
  } catch (error) {
    console.error("[ops] audit failed:", error);
  }
}
