import { db } from "@/prisma/db";
import type { TenantContext } from "./context";

/**
 * Bitácora de lo que pasa dentro de un negocio (SEC-11 en
 * docs/nexus-architecture/security-audit.md): anular dinero, borrar clientes,
 * cambiar roles, retirar personas, activar módulos o borrar el negocio.
 *
 * Las acciones de este tipo son la parte `BIZ_*` del tipo `AuditAction` del panel (`lib/admin/db.ts`), que lo compone con las suyas:
 * Core define las de los negocios y la plataforma las importa, nunca al revés.
 *
 * Usa el mismo `AuditLog` que el panel, con el negocio como destino, así que
 * el equipo de NEXUS lo ve en Auditoría. Nunca rompe la acción: si escribir la
 * bitácora falla, se registra en el log del servidor y la acción sigue.
 */
export type TenantAuditAction =
  | "BIZ_PAYMENT_VOID"
  | "BIZ_EXPENSE_VOID"
  | "BIZ_INVOICE_VOID"
  | "BIZ_TICKETS_VOID"
  | "BIZ_CUSTOMER_ARCHIVE"
  | "BIZ_CUSTOMER_RESTORE"
  | "BIZ_CUSTOMERS_DELETE"
  | "BIZ_MEMBER_INVITE"
  | "BIZ_INVITE_REVOKE"
  | "BIZ_MEMBER_ROLE"
  | "BIZ_MEMBER_ACTIVE"
  | "BIZ_MODULE_TOGGLE"
  | "BIZ_API_KEY_CREATE"
  | "BIZ_API_KEY_REVOKE"
  | "BIZ_API_OPERATION"
  | "BIZ_PROFILE_UPDATE"
  | "BIZ_GROWTH"
  | "BIZ_GOOGLE"
  | "BIZ_STORE_ORDER"
  | "BIZ_SITE"
  | "BIZ_ACCOUNTING"
  | "BIZ_EINVOICE"
  | "BIZ_ONLINE_PAYMENT"
  | "BIZ_INVOICE_NOTE"
  | "BIZ_POS_TURN"
  | "BIZ_CARTERA_PAYMENT"
  | "BIZ_TAX_CHANGE"
  | "BIZ_NUMBERING_CHANGE"
  | "BIZ_DATA_IMPORT"
  | "BIZ_DATA_EXPORT"
  | "BIZ_STOCK_TRANSFER"
  | "BIZ_STOCK_COUNT"
  | "BIZ_WAREHOUSE_CREATE"
  | "BIZ_PURCHASE_CREATE"
  | "BIZ_PURCHASE_RECEIVE"
  | "BIZ_PURCHASE_CANCEL"
  | "BIZ_SUPPLIER_CREATE"
  | "BIZ_TENANT_DELETE";

/**
 * Anota en la bitácora una acción sensible de un negocio (ver arriba). Si escribir falla, lo deja en el registro del servidor y no interrumpe la acción.
 */
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
