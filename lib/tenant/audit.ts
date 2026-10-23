import { db } from "@/prisma/db";
import type { AuditAction } from "@/lib/admin/db";
import type { TenantContext } from "./context";

/**
 * Bitácora de lo que pasa dentro de un negocio (SEC-11 en
 * docs/nexus-architecture/security-audit.md): anular dinero, borrar clientes,
 * cambiar roles, retirar personas, activar módulos o borrar el negocio.
 *
 * Usa el mismo `AuditLog` que el panel, con el negocio como destino, así que
 * el equipo de NEXUS lo ve en Auditoría. Nunca rompe la acción: si escribir la
 * bitácora falla, se registra en el log del servidor y la acción sigue.
 */
export type TenantAuditAction = Extract<AuditAction, `BIZ_${string}`>;

export async function logTenantAction(
  ctx: Pick<TenantContext, "userId" | "tenantId" | "memberId" | "role" | "tenant">,
  action: TenantAuditAction,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.orm.public.AuditLog.create({
      actorId: ctx.userId,
      // Quién: `actorId` (Clerk) y `memberId` en metadata identifican al autor.
      actorEmail: null,
      action,
      targetTenantId: ctx.tenantId,
      targetTenantName: ctx.tenant.name,
      metadata: { ...metadata, memberId: ctx.memberId, role: ctx.role } as never,
      ipAddress: null,
      userAgent: null,
    });
  } catch (error) {
    console.error(`[audit] ${action} no se pudo registrar:`, error);
  }
}
