import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { getOnboardingPrefill } from "@/lib/onboarding/prefill";
import { deleteTenantCompletely } from "./deletion";
import { businessesOfMember, homeTenantFor, isActiveMember, rememberBusiness } from "./membership";

/**
 * Una cuenta, varias organizaciones: la relación usuario ↔ organización es de muchos a
 * muchos (una membresía por organización, con su propio rol) y ninguna da acceso a otra.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe.skipIf(!TEST_URL)("varias organizaciones por cuenta (integración)", () => {
  const suffix = Date.now().toString(36);
  const me = `user_multi_${suffix}`;
  const other = `user_otro_${suffix}`;
  let a = "";
  let b = "";
  let c = "";
  const slugs = { a: `org-a-${suffix}`, b: `org-b-${suffix}`, c: `org-c-${suffix}` };

  const make = async (name: string, slug: string) => {
    const t = await createAdminDb().createTenant({ name, slug, vertical: "general", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    await db.orm.public.Tenant.where({ id: String(t.id) }).update({ onboardingCompleted: true });
    return String(t.id);
  };
  const join = (tenantId: string, clerkUserId: string, role: "OWNER" | "STAFF") => db.orm.public.User.create({ clerkUserId, email: `${clerkUserId}@ejemplo.com`, name: clerkUserId, role, tenantId });

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    a = await make("Org Alfa", slugs.a);
    b = await make("Org Beta", slugs.b);
    c = await make("Org Gamma", slugs.c);
    await join(a, me, "OWNER");
    await wait(15);
    await join(b, me, "STAFF"); // otra organización, otro rol
    await join(c, other, "OWNER"); // una organización de otra persona
  });
  afterAll(async () => {
    for (const id of [a, b, c]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("la cuenta ve sus dos organizaciones con rol propio en cada una, y no la de otra persona", async () => {
    expect((await businessesOfMember(me)).map((x) => x.slug).sort()).toEqual([slugs.a, slugs.b].sort());
    const roles = await db.orm.public.User.where({ clerkUserId: me }).select("tenantId", "role").all();
    expect(Object.fromEntries(roles.map((r) => [r.tenantId, r.role]))).toEqual({ [a]: "OWNER", [b]: "STAFF" });
    expect(await isActiveMember(c, me)).toBe(false); // manipular el identificador no da acceso
    expect(await isActiveMember(a, me)).toBe(true);
  });

  test("entra a la última organización usada y recordar otra cambia a dónde vuelve", async () => {
    expect((await homeTenantFor(me))?.slug).toBe(slugs.b); // la membresía más reciente
    await wait(15);
    expect(await rememberBusiness(me, a)).toBe(true);
    expect((await homeTenantFor(me))?.slug).toBe(slugs.a);
    await wait(15);
    expect(await rememberBusiness(me, b)).toBe(true);
    expect((await homeTenantFor(me))?.slug).toBe(slugs.b);
  });

  test("no se puede recordar una organización ajena ni cambiar la sesión de otra persona", async () => {
    expect(await rememberBusiness(me, c)).toBe(false);
    expect(await rememberBusiness(other, a)).toBe(false);
    expect((await homeTenantFor(other))?.slug).toBe(slugs.c);
  });

  test("quien ya tiene organizaciones puede pedir crear otra; sin pedirlo va a la suya", async () => {
    expect(await getOnboardingPrefill(me)).toMatchObject({ mode: "done" });
    expect(await getOnboardingPrefill(me, undefined, true)).toMatchObject({ mode: "create" });
  });

  test("retirar a la persona de una organización no toca las otras", async () => {
    await db.orm.public.User.where({ clerkUserId: me, tenantId: b }).update({ active: false });
    expect((await businessesOfMember(me)).map((x) => x.slug)).toEqual([slugs.a]);
    expect((await homeTenantFor(me))?.slug).toBe(slugs.a);
    expect(await isActiveMember(b, me)).toBe(false);
  });
});
