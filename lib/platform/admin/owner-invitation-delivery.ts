import { randomUUID } from "node:crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { or } from "@prisma/orm-postgres/orm-client";
import { db } from "@/prisma/db";
import { canOperateTenant } from "@/lib/core/tenancy/access-policy";
import { lockTenant } from "@/lib/core/tenancy/locking";
import { sendEmail } from "@/lib/platform/inbox/inbox-providers";
import { auditProvisioning, ProvisioningError, type ProvisioningActor } from "./managed-business";

const now = () => Temporal.Instant.fromEpochMilliseconds(Date.now());
const at = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms);
const MAX_ATTEMPTS = 6;

function applicationOrigin() {
  const url = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "");
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("Invalid application origin");
  return url.origin;
}

/** Identity invitations are application-wide; no tenant role comes from Clerk metadata. */
export async function applicationInvitationDestination(email: string) {
  const origin = applicationOrigin();
  const client = await clerkClient();
  const users = await client.users.getUserList({ emailAddress: [email], limit: 2 });
  if (users.data.some((u) => u.emailAddresses.some((e) => e.emailAddress.toLowerCase() === email))) {
    return { url: `${origin}/sign-in`, providerId: null };
  }
  const pending = await client.invitations.getInvitationList({ query: email, status: "pending", limit: 100 });
  for (const invite of pending.data.filter((i) => i.emailAddress.toLowerCase() === email)) {
    const expiry = invite.publicMetadata?.nexusIdentityExpiresAt;
    // Only retire an invitation we created whose registration ticket is already expired.
    if (typeof expiry === "number" && expiry <= Date.now()) {
      await client.invitations.revokeInvitation(invite.id);
      continue;
    }
    if (!invite.url) throw new Error("Invitation URL unavailable");
    return { url: invite.url, providerId: invite.id };
  }
  const invite = await client.invitations.createInvitation({ emailAddress: email, redirectUrl: `${origin}/sign-up`, expiresInDays: 30, notify: false, publicMetadata: { nexusIdentityExpiresAt: Date.now() + 30 * 86_400_000 } });
  if (!invite.url) throw new Error("Invitation URL unavailable");
  return { url: invite.url, providerId: invite.id };
}

export async function deliverOwnerInvitation(tenantId: string): Promise<"sent" | "failed" | "skipped"> {
  const token = randomUUID();
  const claimed = await db.transaction(async (tx) => {
    const tenant = await lockTenant(tx, tenantId);
    if (!tenant?.managedProvisioning || !canOperateTenant(tenant) || !tenant.ownerEmail) return null;
    const invite = await tx.orm.public.TenantInvite.where({ tenantId, email: tenant.ownerEmail, role: "OWNER" }).where((i) => i.acceptedAt.isNull()).where((i) => i.revokedAt.isNull()).first();
    if (!invite || invite.expiresAt.epochMilliseconds <= Date.now() || invite.deliveryStatus === "SENT" || invite.deliveryStatus === "CANCELLED" || invite.deliveryAttempts >= MAX_ATTEMPTS) return null;
    if (invite.deliveryLeaseUntil && invite.deliveryLeaseUntil.epochMilliseconds > Date.now()) return null;
    if (invite.deliveryNextAttemptAt && invite.deliveryNextAttemptAt.epochMilliseconds > Date.now()) return null;
    await tx.orm.public.TenantInvite.where({ tenantId, id: invite.id }).update({ deliveryStatus: "SENDING", deliveryLeaseToken: token, deliveryLeaseUntil: at(Date.now() + 120_000), deliveryAttempts: invite.deliveryAttempts + 1 });
    return { id: invite.id, email: invite.email };
  });
  if (!claimed) return "skipped";
  try {
    const sent = await db.transaction(async (tx) => {
      // Coordinate application-wide identity invitations across tenants and workers.
      await tx.query(db.raw.sql`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${claimed.email}, 0))`.returnsRow({ locked: "pg/int4@1" }).build());
      const tenant = await lockTenant(tx, tenantId);
      const invite = await tx.orm.public.TenantInvite.where({ tenantId, id: claimed.id }).first();
      if (!tenant || !canOperateTenant(tenant) || !invite || invite.revokedAt || invite.acceptedAt || invite.expiresAt.epochMilliseconds <= Date.now() || invite.deliveryLeaseToken !== token) return false;
      const destination = await applicationInvitationDestination(claimed.email);
      const result = await sendEmail(claimed.email, "Tu acceso a NexusThrive está listo", `NexusThrive ha activado ${tenant.name}.\n\nEntra con ${claimed.email} para aceptar tu invitación de propietario:\n${destination.url}\n\nLa invitación al negocio vence el ${String(invite.expiresAt)}. Solo tu correo principal verificado puede aceptarla.`, { idempotencyKey: `owner-invite/${invite.id}` });
      if (result.delivery !== "sent") throw new Error("Email provider unavailable or delivery unresolved");
      await tx.orm.public.TenantInvite.where({ tenantId, id: invite.id, deliveryLeaseToken: token }).update({ deliveryStatus: "SENT", deliveryProviderId: destination.providerId ?? result.externalId, deliveryError: null, deliveredAt: now(), deliveryLeaseToken: null, deliveryLeaseUntil: null, deliveryNextAttemptAt: null });
      await auditProvisioning(tx, { userId: "SYSTEM", email: null }, "OWNER_INVITE_DELIVERY_ACCEPTED", tenantId, { inviteId: invite.id });
      return true;
    });
    return sent ? "sent" : "skipped";
  } catch {
    // A retry reconciles Clerk first and reuses the provider's idempotency key.
    await db.transaction(async (tx) => {
      await lockTenant(tx, tenantId);
      const invite = await tx.orm.public.TenantInvite.where({ tenantId, id: claimed.id, deliveryLeaseToken: token }).first();
      if (!invite || invite.acceptedAt || invite.revokedAt) return;
      await tx.orm.public.TenantInvite.where({ tenantId, id: invite.id }).update({ deliveryStatus: "FAILED", deliveryError: "No se pudo confirmar la entrega. Revisa Clerk, la URL de la aplicación y el proveedor de correo; puedes reintentar sin crear otra invitación.", deliveryLeaseToken: null, deliveryLeaseUntil: null, deliveryNextAttemptAt: at(Date.now() + Math.min(3600, 30 * 2 ** invite.deliveryAttempts) * 1000) });
    });
    return "failed";
  }
}

export async function retryOwnerInvitation(tenantId: string, actor: ProvisioningActor) {
  await db.transaction(async (tx) => {
    const tenant = await lockTenant(tx, tenantId);
    if (!tenant?.managedProvisioning || !canOperateTenant(tenant)) throw new ProvisioningError("El negocio no está habilitado.");
    const invite = await tx.orm.public.TenantInvite.where({ tenantId, email: tenant.ownerEmail ?? "", role: "OWNER" }).where((i) => i.acceptedAt.isNull()).where((i) => i.revokedAt.isNull()).first();
    if (!invite || invite.expiresAt.epochMilliseconds <= Date.now()) throw new ProvisioningError("Renueva la invitación vencida o revocada.");
    if (invite.deliveryStatus === "SENT") throw new ProvisioningError("El proveedor ya aceptó este envío. Revisa el correo no deseado o renueva cuando venza.");
    if (invite.deliveryLeaseUntil && invite.deliveryLeaseUntil.epochMilliseconds > Date.now()) throw new ProvisioningError("La entrega está en curso. Espera un momento.");
    await tx.orm.public.TenantInvite.where({ tenantId, id: invite.id }).update({ deliveryStatus: "PENDING", deliveryAttempts: 0, deliveryNextAttemptAt: now(), deliveryLeaseToken: null, deliveryLeaseUntil: null });
    await auditProvisioning(tx, actor, "RETRY_OWNER_INVITE_DELIVERY", tenantId, { inviteId: invite.id });
  });
}

export async function dispatchOwnerInvitations() {
  const invites = await db.orm.public.TenantInvite.where({ role: "OWNER" }).where((i) => i.deliveryStatus.in(["PENDING", "FAILED", "SENDING"])).where((i) => i.acceptedAt.isNull()).where((i) => i.revokedAt.isNull()).where((i) => i.expiresAt.gt(now())).where((i) => i.deliveryAttempts.lt(MAX_ATTEMPTS)).where((i) => or(i.deliveryNextAttemptAt.isNull(), i.deliveryNextAttemptAt.lte(now()))).where((i) => or(i.deliveryLeaseUntil.isNull(), i.deliveryLeaseUntil.lte(now()))).orderBy((i) => i.createdAt.asc()).limit(5).all();
  const results: string[] = [];
  const deadline = Date.now() + 40_000;
  for (const invite of invites) {
    if (Date.now() >= deadline) break;
    results.push(await deliverOwnerInvitation(invite.tenantId));
  }
  return { sent: results.filter((r) => r === "sent").length, failed: results.filter((r) => r === "failed").length, skipped: results.filter((r) => r === "skipped").length };
}
