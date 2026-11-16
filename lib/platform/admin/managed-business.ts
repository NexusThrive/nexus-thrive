import { createHash, randomUUID } from "node:crypto";
import { db } from "@/prisma/db";
import type { DbTransaction } from "@/lib/foundation/db/db-transaction";
import { getOnboardingModulePreset } from "@/lib/core/tenancy/onboarding/presets";
import { tenantProvisioningPort } from "@/lib/core/tenancy/provisioning-port";
import { managedBusinessInput, type ManagedBusinessInput } from "./managed-validation";
import { limitProblem } from "./account-limits";

export type ProvisioningActor = { userId: string; email: string | null };
export class ProvisioningError extends Error {}

export async function auditProvisioning(tx: DbTransaction, actor: ProvisioningActor, action: string, tenantId: string, metadata: Record<string, string | boolean> = {}) {
  await tx.orm.public.AuditLog.create({ actorId: actor.userId, actorEmail: actor.email, action, targetTenantId: tenantId, metadata });
}

/** Both authorized administrative entry points use this transaction. */
export async function createManagedBusiness(raw: ManagedBusinessInput, actor: ProvisioningActor) {
  const input = managedBusinessInput.parse(raw);
  const hash = createHash("sha256").update(JSON.stringify({ ...input, actor: actor.userId })).digest("hex");
  const modules = getOnboardingModulePreset({ vertical: "retail", tenantType: "COMPANY" });
  return db.transaction(async (tx) => {
    // Serialize quota checks and retries for this intended owner across processes.
    await tx.query(db.raw.sql`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${input.ownerEmail}, 0))`.returnsRow({ locked: "pg/int4@1" }).build());
    const replay = await tx.orm.public.Tenant.where({ provisioningKey: input.provisioningKey }).first();
    if (replay) {
      if (replay.provisioningRequestHash !== hash) throw new ProvisioningError("La solicitud ya se usó con otros datos. Abre un formulario nuevo.");
      return replay;
    }
    const limit = await tx.orm.public.AccountLimit.where({ email: input.ownerEmail }).first();
    if (limit) {
      const owned = await tx.orm.public.User.where({ email: input.ownerEmail, role: "OWNER", active: true }).all();
      const prepared = await tx.orm.public.Tenant.where({ ownerEmail: input.ownerEmail, managedProvisioning: true }).all();
      const invited = await tx.orm.public.TenantInvite.where({ email: input.ownerEmail, role: "OWNER" }).where((i) => i.acceptedAt.isNull()).where((i) => i.revokedAt.isNull()).where((i) => i.expiresAt.gt(Temporal.Instant.fromEpochMilliseconds(Date.now()))).all();
      const ids = new Set([...owned.filter((u) => !u.removedAt).map((u) => u.tenantId), ...prepared.map((t) => t.id), ...invited.map((i) => i.tenantId)]);
      const problem = limitProblem(ids.size, limit.maxOrganizations);
      if (problem) throw new ProvisioningError(problem);
    }
    const tenant = await tx.orm.public.Tenant.create({ id: randomUUID(), name: input.name, slug: input.slug, ownerEmail: input.ownerEmail, provisioningKey: input.provisioningKey, provisioningRequestHash: hash, managedProvisioning: true, active: false, onboardingCompleted: false, vertical: "retail", tenantType: "COMPANY", accountStage: "ONBOARDING" });
    for (const moduleName of modules) await tx.orm.public.TenantModule.create({ tenantId: tenant.id, moduleName });
    await tenantProvisioningPort.use().onCreated(tx, tenant.id);
    await auditProvisioning(tx, actor, "CREATE_MANAGED_TENANT", tenant.id, { slug: tenant.slug, state: "PREPARING" });
    return tenant;
  });
}

export function provisioningErrorMessage(error: unknown): string {
  if (error instanceof ProvisioningError) return error.message;
  if (error instanceof Error && /unique|Tenant_slug|23505/i.test(error.message)) return "Ese slug ya está en uso. Elige otro.";
  return "No se pudo guardar el negocio. Inténtalo de nuevo con la misma solicitud.";
}
