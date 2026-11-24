import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { db } from "@/prisma/db";
import { createManagedBusiness } from "@/lib/platform/admin/managed-business";
import { managedLifecycle, managedProvisioningStatus } from "@/lib/platform/admin/managed-lifecycle";
import { acceptInvitesFor } from "@/lib/core/tenancy/team-db";
import { homeTenantFor, isActiveMember, resolveTenantMembership } from "@/lib/core/tenancy/membership";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { getStaffContext } from "@/lib/platform/team/access";
import { verifiedEmailOf } from "@/lib/core/auth/session-email";
import { createTenantAction } from "@/app/admin/actions";
import { completeAdaptiveOnboardingAction } from "@/app/onboarding/actions";
import { deliverOwnerInvitation, retryOwnerInvitation } from "@/lib/platform/admin/owner-invitation-delivery";

const session = vi.hoisted(() => ({ userId: null as string | null, email: "public@example.com" }));
const provider = vi.hoisted(() => ({ send: vi.fn(), users: vi.fn(), invites: vi.fn(), create: vi.fn(), revoke: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: session.userId }),
  currentUser: async () => ({ primaryEmailAddress: { emailAddress: session.email, verification: { status: "verified" } }, fullName: "Test" }),
  clerkClient: async () => ({ users: { getUserList: provider.users }, invitations: { getInvitationList: provider.invites, createInvitation: provider.create, revokeInvitation: provider.revoke } }),
}));
vi.mock("@/lib/platform/inbox/inbox-providers", () => ({ sendEmail: provider.send }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/server", () => ({ after: vi.fn() }));

const TEST_URL = process.env.TEST_DATABASE_URL;
const actor = { userId: `staff_${randomUUID()}`, email: "admin@example.com" };
const owner = `owner-${randomUUID()}@example.com`;
const ownerId = `owner_${randomUUID()}`;
let tenantId = "";
let staffId = "";
let roleId = "";
const input = (extra = {}) => ({ name: "Managed Commerce", slug: `managed-${randomUUID().slice(0, 12)}`, ownerEmail: owner, provisioningKey: randomUUID(), ...extra });

describe.skipIf(!TEST_URL)("managed provisioning lifecycle", () => {
  beforeAll(async () => {
    if (process.env.DATABASE_URL !== TEST_URL) throw new Error("An isolated matching TEST_DATABASE_URL is required.");
    const role = await db.orm.public.StaffRole.create({ key: `test-${randomUUID()}`, name: "Provisioning test", permissions: ["accounts.create", "accounts.edit", "accounts.suspend"], system: false });
    roleId = role.id;
    staffId = (await db.orm.public.StaffMember.create({ clerkUserId: actor.userId, email: actor.email!, roleId: role.id })).id;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    provider.users.mockResolvedValue({ data: [] });
    provider.invites.mockResolvedValue({ data: [] });
    provider.create.mockResolvedValue({ id: "clerk_invite", url: "https://accounts.example.com/invited" });
    provider.send.mockResolvedValue({ delivery: "sent", externalId: "email_test" });
  });
  afterAll(async () => {
    if (staffId) await db.orm.public.StaffMember.where({ id: staffId }).deleteAll();
    if (roleId) await db.orm.public.StaffRole.where({ id: roleId }).deleteAll();
    await db.close();
  });

  test("public and signed-in nonstaff cannot create through either server entry point", async () => {
    const before = await db.orm.public.Tenant.aggregate((a) => ({ n: a.count() }));
    for (const userId of [null, "public_user"]) {
      session.userId = userId;
      expect((await createTenantAction({ status: "idle" }, new FormData())).status).toBe("error");
      expect((await completeAdaptiveOnboardingAction({} as never)).status).toBe("error");
    }
    expect((await db.orm.public.Tenant.aggregate((a) => ({ n: a.count() }))).n).toBe(before.n);
  });

  test("authorized admin creates a prepared Commerce identity without access or invitations", async () => {
    session.userId = actor.userId;
    const data = input({ ownerEmail: ` ${owner.toUpperCase()} ` });
    const form = new FormData();
    Object.entries(data).forEach(([key, value]) => form.set(key, value));
    expect((await createTenantAction({ status: "idle" }, form)).status).toBe("ok");
    const tenant = await db.orm.public.Tenant.where({ provisioningKey: data.provisioningKey }).first();
    tenantId = tenant!.id;
    expect(tenant).toMatchObject({ active: false, managedProvisioning: true, onboardingCompleted: false, ownerEmail: owner, vertical: "retail", activatedAt: null });
    expect(await db.orm.public.User.where({ tenantId }).first()).toBeNull();
    expect(await db.orm.public.TenantInvite.where({ tenantId }).first()).toBeNull();
    expect(await db.orm.public.AuditLog.where({ targetTenantId: tenantId, action: "CREATE_MANAGED_TENANT" }).first()).not.toBeNull();
  });

  test("creation retries serialize and duplicate slugs roll back", async () => {
    const data = input();
    const rows = await Promise.all([createManagedBusiness(data, actor), createManagedBusiness(data, actor)]);
    expect(rows[0].id).toBe(rows[1].id);
    await expect(createManagedBusiness({ ...data, name: "Changed request" }, actor)).rejects.toThrow("otros datos");
    await expect(createManagedBusiness({ ...data, provisioningKey: randomUUID() }, actor)).rejects.toThrow();
    expect((await db.orm.public.Tenant.where({ slug: data.slug }).aggregate((a) => ({ n: a.count() }))).n).toBe(1);
  });

  test("preparation blocks existing owner memberships and premature invitations", async () => {
    session.userId = ownerId;
    session.email = owner;
    expect(await requireTenantContext((await db.orm.public.Tenant.where({ id: tenantId }).first())!.slug)).toBeNull();
    await db.orm.public.TenantInvite.create({ tenantId, email: owner, role: "OWNER", expiresAt: Temporal.Instant.fromEpochMilliseconds(Date.now() + 60_000) });
    expect(await acceptInvitesFor(ownerId, owner, "Owner", tenantId)).toEqual([]);
    await expect(managedLifecycle(tenantId, "activate", actor)).rejects.toThrow("listo");
    expect(await db.orm.public.User.where({ tenantId }).first()).toBeNull();
  });

  test("readiness and concurrent activation create one usable owner invitation", async () => {
    await managedLifecycle(tenantId, "ready", actor);
    await Promise.all([managedLifecycle(tenantId, "activate", actor), managedLifecycle(tenantId, "activate", actor)]);
    const tenant = await db.orm.public.Tenant.where({ id: tenantId }).first();
    const firstDate = String(tenant!.activatedAt);
    await managedLifecycle(tenantId, "activate", actor);
    expect(String((await db.orm.public.Tenant.where({ id: tenantId }).first())!.activatedAt)).toBe(firstDate);
    const pending = await db.orm.public.TenantInvite.where({ tenantId }).where((i) => i.revokedAt.isNull()).where((i) => i.acceptedAt.isNull()).all();
    expect(pending).toHaveLength(1);
    expect(pending[0].deliveryStatus).toBe("PENDING");
  });

  test("wrong or unverified primary email cannot accept", async () => {
    const verifiedEmail = verifiedEmailOf({ primaryEmailAddress: { emailAddress: owner, verification: { status: "unverified" } } });
    expect(await resolveTenantMembership({ tenantId, clerkUserId: ownerId, identity: async () => ({ verifiedEmail, name: "Owner" }) })).toBeNull();
    expect(await acceptInvitesFor("stranger", `other-${owner}`, "Other", tenantId)).toEqual([]);
    expect(await db.orm.public.User.where({ tenantId }).first()).toBeNull();
  });

  test("concurrent delivery sends once and reuses the existing local invitation", async () => {
    const result = await Promise.all([deliverOwnerInvitation(tenantId, provider.send), deliverOwnerInvitation(tenantId, provider.send)]);
    expect(result).toContain("sent");
    expect(provider.create).toHaveBeenCalledTimes(1);
    expect(provider.send).toHaveBeenCalledTimes(1);
    expect((await managedProvisioningStatus(tenantId))?.invite?.delivery).toBe("SENT");
  });

  test("revoked and expired invitations never grant membership; renewal replaces history", async () => {
    await managedLifecycle(tenantId, "revoke", actor);
    expect(await acceptInvitesFor(ownerId, owner, "Owner", tenantId)).toEqual([]);
    await managedLifecycle(tenantId, "renew", actor);
    const invite = await db.orm.public.TenantInvite.where({ tenantId }).where((i) => i.revokedAt.isNull()).first();
    await db.orm.public.TenantInvite.where({ tenantId, id: invite!.id }).update({ expiresAt: Temporal.Instant.fromEpochMilliseconds(Date.now() - 1) });
    expect(await acceptInvitesFor(ownerId, owner, "Owner", tenantId)).toEqual([]);
    await managedLifecycle(tenantId, "renew", actor);
    expect((await db.orm.public.TenantInvite.where({ tenantId }).all()).length).toBeGreaterThan(2);
  });

  test("an existing Clerk identity receives login and failed delivery retries without creating identity", async () => {
    provider.create.mockClear();
    provider.users.mockResolvedValue({ data: [{ emailAddresses: [{ emailAddress: owner }] }] });
    provider.send.mockResolvedValueOnce({ delivery: "manual" });
    expect(await deliverOwnerInvitation(tenantId, provider.send)).toBe("failed");
    expect((await managedProvisioningStatus(tenantId))?.invite?.delivery).toBe("FAILED");
    await retryOwnerInvitation(tenantId, actor);
    expect(await deliverOwnerInvitation(tenantId, provider.send)).toBe("sent");
    expect(provider.create).not.toHaveBeenCalled();
    expect(provider.send.mock.calls.at(-1)?.[2]).toContain("https://app.example.com/sign-in");
  });

  test("concurrent acceptance creates exactly one owner; it cannot access admin or another tenant", async () => {
    await Promise.all([acceptInvitesFor(ownerId, owner, "Owner", tenantId), acceptInvitesFor(ownerId, owner, "Owner", tenantId)]);
    expect((await db.orm.public.User.where({ tenantId }).all())).toHaveLength(1);
    expect(await isActiveMember(tenantId, ownerId)).toBe(true);
    session.userId = ownerId;
    session.email = owner;
    expect(await getStaffContext()).toBeNull();
    const other = await createManagedBusiness(input(), actor);
    expect(await resolveTenantMembership({ tenantId: other.id, clerkUserId: "stranger", identity: async () => ({ verifiedEmail: "stranger@example.com", name: null }) })).toBeNull();
    expect(await isActiveMember(other.id, ownerId)).toBe(false);
  });

  test("suspension blocks operations and files; reactivation keeps membership and invitation count", async () => {
    const tenant = (await db.orm.public.Tenant.where({ id: tenantId }).first())!;
    const count = (await db.orm.public.TenantInvite.where({ tenantId }).all()).length;
    await managedLifecycle(tenantId, "suspend", actor, "Maintenance");
    expect(await requireTenantContext(tenant.slug)).toBeNull();
    expect(await isActiveMember(tenantId, ownerId)).toBe(false);
    expect((await homeTenantFor(ownerId))?.access).toBe("suspended");
    await managedLifecycle(tenantId, "activate", actor);
    expect(await isActiveMember(tenantId, ownerId)).toBe(true);
    expect((await db.orm.public.TenantInvite.where({ tenantId }).all())).toHaveLength(count);
  });

  test("legacy incomplete tenants retain existing data and authorized membership", async () => {
    const legacy = await db.orm.public.Tenant.create({ name: "Legacy data", slug: `legacy-${randomUUID().slice(0, 10)}`, vertical: "gym", onboardingCompleted: false });
    await db.orm.public.User.create({ tenantId: legacy.id, clerkUserId: ownerId, email: owner, role: "OWNER" });
    expect(await isActiveMember(legacy.id, ownerId)).toBe(true);
    expect((await db.orm.public.Tenant.where({ id: legacy.id }).first())?.name).toBe("Legacy data");
    await managedLifecycle(legacy.id, "suspend", actor, "Legacy suspension");
    await managedLifecycle(legacy.id, "activate", actor);
    expect(await isActiveMember(legacy.id, ownerId)).toBe(true);
  });

  test("production upgrade SQL preserves preexisting tenant and membership data", async () => {
    const client = new Client({ connectionString: TEST_URL });
    const schema = `upgrade_${randomUUID().replaceAll("-", "")}`;
    await client.connect();
    try {
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET search_path TO "${schema}"`);
      await client.query('CREATE TABLE "Tenant" (id text PRIMARY KEY, name text, slug text, active boolean, "onboardingCompleted" boolean); CREATE TABLE "TenantInvite" (id text PRIMARY KEY, "tenantId" text, email text, "acceptedAt" timestamptz, "revokedAt" timestamptz); CREATE TABLE "User" (id text PRIMARY KEY, "tenantId" text, role text, active boolean);');
      await client.query(`INSERT INTO "Tenant" VALUES ('legacy', 'Preserved', 'preserved', true, false); INSERT INTO "User" VALUES ('member', 'legacy', 'OWNER', true)`);
      await client.query(readFileSync("docs/08-operaciones/sql-produccion/2026-11-16-aprovisionamiento-administrado.sql", "utf8"));
      expect((await client.query('SELECT id, name, active, "onboardingCompleted", "managedProvisioning", "ownerEmail", "activatedAt" FROM "Tenant"')).rows).toEqual([{ id: "legacy", name: "Preserved", active: true, onboardingCompleted: false, managedProvisioning: false, ownerEmail: null, activatedAt: null }]);
      expect((await client.query('SELECT * FROM "User"')).rows).toEqual([{ id: "member", tenantId: "legacy", role: "OWNER", active: true }]);
    } finally {
      await client.query(`DROP SCHEMA "${schema}" CASCADE`);
      await client.end();
    }
  });
});
