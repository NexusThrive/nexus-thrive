import { db } from "@/prisma/db";
import type { OperationContext, OperationDefinition } from "./types";

/**
 * Deja en la bitácora QUIÉN hizo una acción por API, MCP o automatización
 * (`actorType`, `apiKeyId`, `requestId`). Las lecturas no se auditan (quedan en
 * el registro de uso); las demás sí. Del cuerpo solo se guardan los nombres de
 * los campos, nunca sus valores. No rompe la acción si falla.
 */
export async function auditOperation(ctx: OperationContext, op: Pick<OperationDefinition, "id" | "risk">, input: unknown, tenantName?: string | null): Promise<void> {
  try {
    await db.orm.public.AuditLog.create({
      actorId: `${ctx.actor.type.toLowerCase()}:${ctx.actor.id}`,
      actorEmail: null,
      action: "BIZ_API_OPERATION",
      targetTenantId: ctx.tenantId,
      targetTenantName: tenantName ?? null,
      metadata: { operationId: op.id, risk: op.risk, role: ctx.role, fields: input && typeof input === "object" ? Object.keys(input) : [] } as never,
      ipAddress: null,
      userAgent: null,
      actorType: ctx.actor.type,
      apiKeyId: ctx.actor.type === "API_KEY" ? ctx.actor.id : null,
      requestId: ctx.requestId ?? null,
    });
  } catch (error) {
    console.error(`[audit] ${op.id} no se pudo registrar:`, error);
  }
}
