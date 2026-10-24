import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { listPlatformUsers, organizationLimitProblem, ownedCountOf, setLimit } from "./users-db";

/** Personas y límite de negocios contra Postgres real. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("usuarios y límite de negocios (integración)", () => {
  const suffix = Date.now().toString(36);
  const email = `limite-${suffix}@ejemplo.com`;
  const ids: string[] = [];

  beforeAll(() => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
  });
  afterAll(async () => {
    for (const id of ids) await deleteTenantCompletely(id);
    await db.orm.public.AccountLimit.where({ email }).deleteAll();
    await db.close();
  });
  const make = async (n: number, owner = email) => {
    const t = await createAdminDb().createTenant({ name: `Neg ${n}`, slug: `lim-${n}-${suffix}`, vertical: "general", modules: ["crm"], tenantType: "COMPANY", ownerEmail: owner });
    ids.push(String(t.id));
    return String(t.id);
  };

  test("sin límite fijado no bloquea; la invitación de dueño abierta cuenta como negocio", async () => {
    expect(await organizationLimitProblem(email)).toBeNull();
    await make(1);
    expect(await ownedCountOf(email)).toBe(1);
    expect(await organizationLimitProblem(email)).toBeNull();
  });

  test("con límite 2: deja crear el segundo y bloquea el tercero, con mensaje claro", async () => {
    expect(await setLimit(email, "2")).toEqual({ ok: true, limit: 2 });
    expect(await organizationLimitProblem(email)).toBeNull(); // 1 de 2
    await make(2);
    expect(await organizationLimitProblem(email)).toContain("límite es 2");
  });

  test("la lista de personas junta sus negocios por correo, sin mezclar a otras", async () => {
    const other = `otra-${suffix}@ejemplo.com`;
    await make(3, other);
    const { users } = await listPlatformUsers({ q: `limite-${suffix}` });
    const mine = users.find((u) => u.email === email)!;
    expect(mine).toMatchObject({ owned: 2, limit: 2 });
    expect(mine.orgs.map((o) => o.name).sort()).toEqual(["Neg 1", "Neg 2"]);
    expect(users.find((u) => u.email === other)).toBeUndefined(); // el filtro no la trae
  });

  test("quitar el límite (vacío) lo elimina; un valor inválido se rechaza", async () => {
    expect(await setLimit(email, "0")).toMatchObject({ ok: false });
    expect(await setLimit("no-es-correo", "3")).toMatchObject({ ok: false });
    expect(await setLimit(email, "")).toEqual({ ok: true, limit: null });
    expect(await organizationLimitProblem(email)).toBeNull();
  });
});
