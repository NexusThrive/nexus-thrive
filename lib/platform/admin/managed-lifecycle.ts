import { db } from "@/prisma/db";
import { lockTenant } from "@/lib/core/tenancy/locking";
import { canOperateTenant } from "@/lib/core/tenancy/access-policy";
import { auditProvisioning, ProvisioningError, type ProvisioningActor } from "./managed-business";

export type ManagedCommand = "ready" | "activate" | "renew" | "revoke" | "suspend";
const instant = () => Temporal.Instant.fromEpochMilliseconds(Date.now());

export async function managedLifecycle(tenantId: string, command: ManagedCommand, actor: ProvisioningActor, reason = "") {
  return db.transaction(async (tx) => {
    const tenant = await lockTenant(tx, tenantId);
    if (!tenant) throw new ProvisioningError("El negocio no existe.");
    if (command === "suspend") {
      if (!reason.trim()) throw new ProvisioningError("Escribe el motivo de suspensión.");
      if (tenant.active) {
        await tx.orm.public.Tenant.where({ id: tenantId }).update({ active: false, suspendedAt: instant(), suspendedReason: reason.trim().slice(0, 500) });
        await auditProvisioning(tx, actor, "SUSPEND_TENANT", tenantId, { reason: reason.trim().slice(0, 500) });
      }
      return;
    }
    if (!tenant.managedProvisioning) {
      if (command !== "activate") throw new ProvisioningError("Este negocio conserva su alta anterior.");
      if (!tenant.active) {
        await tx.orm.public.Tenant.where({ id: tenantId }).update({ active: true });
        await auditProvisioning(tx, actor, "ACTIVATE_TENANT", tenantId);
      }
      return;
    }
    if (command === "ready") {
      if (tenant.activatedAt || tenant.onboardingCompleted) return;
      if (!tenant.ownerEmail) throw new ProvisioningError("Falta el correo autorizado del propietario.");
      const dashboard = await tx.orm.public.TenantModule.where({ tenantId, moduleName: "dashboard", active: true }).first();
      if (!dashboard) throw new ProvisioningError("Completa la configuración inicial antes de marcarlo listo.");
      await tx.orm.public.Tenant.where({ id: tenantId }).update({ onboardingCompleted: true });
      await auditProvisioning(tx, actor, "MANAGED_TENANT_READY", tenantId);
      return;
    }
    if (command === "revoke") {
      const rows = await tx.orm.public.TenantInvite.where({ tenantId, role: "OWNER", email: tenant.ownerEmail ?? "" }).where((i) => i.acceptedAt.isNull()).where((i) => i.revokedAt.isNull()).all();
      for (const row of rows) await tx.orm.public.TenantInvite.where({ tenantId, id: row.id }).update({ revokedAt: instant(), deliveryStatus: "CANCELLED", deliveryLeaseToken: null, deliveryLeaseUntil: null });
      if (rows.length) await auditProvisioning(tx, actor, "REVOKE_OWNER_INVITE", tenantId);
      return;
    }
    if (!tenant.onboardingCompleted || !tenant.ownerEmail) throw new ProvisioningError("El negocio debe estar listo antes de activarlo.");
    const firstActivation = !tenant.activatedAt;
    if (command === "activate" && !firstActivation) {
      if (!tenant.active) {
        await tx.orm.public.Tenant.where({ id: tenantId }).update({ active: true });
        await auditProvisioning(tx, actor, "REACTIVATE_MANAGED_TENANT", tenantId);
      }
      return;
    }
    if (command === "renew" && !canOperateTenant(tenant)) throw new ProvisioningError("Activa el negocio antes de renovar la invitación.");
    const owner = await tx.orm.public.User.where({ tenantId, role: "OWNER", active: true }).first();
    if (command === "renew" && owner) throw new ProvisioningError("El propietario ya tiene una membresía activa.");
    const pending = await tx.orm.public.TenantInvite.where({ tenantId, role: "OWNER", email: tenant.ownerEmail }).where((i) => i.acceptedAt.isNull()).where((i) => i.revokedAt.isNull()).first();
    if (command === "renew" && pending && pending.expiresAt.epochMilliseconds > Date.now()) throw new ProvisioningError("La invitación sigue vigente. Reintenta su entrega o revócala antes de renovarla.");
    if (pending) await tx.orm.public.TenantInvite.where({ tenantId, id: pending.id }).update({ revokedAt: instant(), deliveryStatus: "CANCELLED" });
    if (firstActivation) await tx.orm.public.Tenant.where({ id: tenantId }).update({ activatedAt: instant(), active: true });
    if (!owner) await tx.orm.public.TenantInvite.create({ tenantId, email: tenant.ownerEmail, role: "OWNER", invitedById: actor.userId, expiresAt: Temporal.Instant.fromEpochMilliseconds(Date.now() + 14 * 86_400_000), deliveryStatus: "PENDING", deliveryNextAttemptAt: instant() });
    await auditProvisioning(tx, actor, firstActivation ? "ACTIVATE_MANAGED_TENANT" : "RENEW_OWNER_INVITE", tenantId);
  });
}

export async function managedProvisioningStatus(tenantId: string) {
  const tenant = await db.orm.public.Tenant.where({ id: tenantId }).first();
  if (!tenant?.managedProvisioning) return null;
  const invite = await db.orm.public.TenantInvite.where({ tenantId, role: "OWNER", email: tenant.ownerEmail ?? "" }).orderBy((i) => i.createdAt.desc()).first();
  return {
    tenantId, ownerEmail: tenant.ownerEmail, active: tenant.active, ready: tenant.onboardingCompleted,
    activated: Boolean(tenant.activatedAt),
    invite: invite ? { id: invite.id, status: invite.acceptedAt ? "ACCEPTED" : invite.revokedAt ? "REVOKED" : invite.expiresAt.epochMilliseconds <= Date.now() ? "EXPIRED" : "PENDING", expiresAt: String(invite.expiresAt), delivery: invite.deliveryStatus, deliveryError: invite.deliveryError, attempts: invite.deliveryAttempts } : null,
  };
}

export type ManagedProvisioningStatus = NonNullable<Awaited<ReturnType<typeof managedProvisioningStatus>>>;
