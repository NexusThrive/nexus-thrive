import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { deleteTenantCompletely } from "./deletion";
import { checkModuleToggle } from "@/lib/plans/compat";
import { defaultPricingConfig } from "@/lib/plans/pricing";
import { updateBusinessContext } from "./settings-db";
import { tenantWithModules } from "./membership";

/** Una organización sin rubro cerrado, con modelo comercial, contra Postgres real y dos negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("perfil general y contexto del negocio (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string, vertical: string) => createAdminDb().createTenant({ name, slug, vertical: vertical as never, modules: ["crm"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Agencia A", `pg-a-${suffix}`, "general")).id);
    b = String((await make("Gym B", `pg-b-${suffix}`, "gym")).id);
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("se puede crear una organización con perfil general, sin rubro cerrado", async () => {
    const t = await tenantWithModules(a);
    expect(t?.vertical).toBe("general");
  });

  test("el contexto (perfil, modelo comercial, actividad) se guarda y no toca otro negocio ni las funciones encendidas", async () => {
    await updateBusinessContext(a, { vertical: "general", businessModels: ["B2B", "B2C"], activity: "Agencia de marketing" });
    const t = await tenantWithModules(a);
    expect([t?.businessModels, t?.activity]).toEqual([["B2B", "B2C"], "Agencia de marketing"]);
    expect(t?.modules.filter((m) => m.active).map((m) => String(m.moduleName))).toEqual(["crm"]); // nada se apagó ni se encendió
    const other = await tenantWithModules(b);
    expect([other?.vertical, other?.businessModels ?? [], other?.activity ?? null]).toEqual(["gym", [], null]);
  });

  test("cambiar de perfil conserva los datos y las funciones; una agencia puede encender obras o inventario", async () => {
    await updateBusinessContext(a, { vertical: "gym", businessModels: [], activity: "" });
    expect((await tenantWithModules(a))?.vertical).toBe("gym");
    expect((await tenantWithModules(a))?.activity).toBeNull();
    const config = defaultPricingConfig();
    for (const fn of ["construction", "inventory", "purchases", "memberships"] as const) expect(checkModuleToggle(config, "general", fn, true).ok).toBe(true);
  });
});
