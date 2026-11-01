/**
 * Contratos de numeración fiscal (Business → Finance/Tax) y de aprovisionamiento de negocios (Core → Finance).
 */
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { numberingPort, type NumberingPort } from "@/lib/business/sales/numbering-port";
import { createDocument } from "@/lib/business/sales/documents-db";
import { createResolution } from "@/lib/tax/tax-db";
import { PortNotProvidedError } from "@/lib/ports";
import { tenantProvisioningPort, type TenantProvisioningPort } from "@/lib/tenant/provisioning-port";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";

const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("puertos de numeración y aprovisionamiento (integración)", () => {
  const suffix = Date.now().toString(36);
  const created: string[] = [];
  let tenantId = "";
  let realNumbering: NumberingPort;
  let realProvisioning: TenantProvisioningPort;
  const newTenant = (n: string) =>
    createAdminDb().createTenant({ name: `Pn ${n}`, slug: `pn-${n}-${suffix}`, vertical: "retail", modules: ["finance"], tenantType: "COMPANY", ownerEmail: `pn-${n}-${suffix}@ejemplo.com` });

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    realNumbering = numberingPort.use();
    realProvisioning = tenantProvisioningPort.use();
    tenantId = String((await newTenant("a")).id);
    created.push(tenantId);
    await db.orm.public.Customer.create({ tenantId, name: "Cliente" });
  });
  afterEach(() => {
    numberingPort.provide(realNumbering);
    tenantProvisioningPort.provide(realProvisioning);
  });
  afterAll(async () => {
    numberingPort.provide(realNumbering);
    tenantProvisioningPort.provide(realProvisioning);
    for (const id of created) await deleteTenantCompletely(id);
  });

  const emitir = () => createDocument(tenantId, { kind: "BILL", customerId: null, customerName: "Cliente", lines: [{ description: "Servicio", quantity: 1, unitPrice: 10_000, taxRatePct: 0 }] }, "u");

  test("con una resolución vigente el documento toma número y prefijo de su rango y el consecutivo avanza", async () => {
    const year = new Date().getFullYear();
    const res = await createResolution(tenantId, { documentKind: "BILL", prefix: "PN", resolutionNumber: "18760009999", rangeFrom: 500, rangeTo: 510, validFrom: `${year - 1}-01-01`, validTo: `${year + 1}-12-31` });
    expect(res.ok).toBe(true);
    const a = await emitir();
    const b = await emitir();
    expect([a.number, b.number]).toEqual([500, 501]);
    const row = await db.orm.public.Invoice.where({ tenantId, id: a.id }).first();
    expect(row?.prefix).toBe("PN");
  });

  test("el puerto recibe el tipo de documento y el día de Bogotá, y se confirma el número asignado", async () => {
    const calls: string[] = [];
    numberingPort.provide({
      allocate: async (tx, t, kind, date) => { calls.push(`allocate:${kind}:${date}`); return realNumbering.allocate(tx, t, kind, date); },
      commit: async (tx, t, a) => { calls.push(`commit:${a.number}`); return realNumbering.commit(tx, t, a); },
      withholdings: async (tx, t, codes, totals, date) => { calls.push(`wh:${codes.length}`); return realNumbering.withholdings(tx, t, codes, totals, date); },
    });
    await emitir();
    expect(calls[0]).toMatch(/^allocate:BILL:\d{4}-\d{2}-\d{2}$/);
    expect(calls).toContain("wh:0");
    expect(calls.some((c) => c.startsWith("commit:"))).toBe(true);
  });

  test("si la numeración falla no queda documento", async () => {
    const antes = await db.orm.public.Invoice.where({ tenantId }).all();
    numberingPort.provide({ ...realNumbering, allocate: async () => { throw new Error("numeración caída (simulada)"); } });
    await expect(emitir()).rejects.toThrow("numeración caída");
    expect(await db.orm.public.Invoice.where({ tenantId }).all()).toHaveLength(antes.length);
  });

  test("un negocio nuevo trae su plan de cuentas por el puerto de aprovisionamiento", async () => {
    const t = String((await newTenant("b")).id);
    created.push(t);
    expect((await db.orm.public.Account.where({ tenantId: t }).all()).length).toBeGreaterThan(0);
  });

  test("si el aprovisionamiento falla, el negocio no se crea", async () => {
    tenantProvisioningPort.provide({ onCreated: async () => { throw new Error("siembra caída (simulada)"); } });
    await expect(newTenant("c")).rejects.toThrow("siembra caída");
    expect(await db.orm.public.Tenant.where({ slug: `pn-c-${suffix}` }).first()).toBeNull();
  });

  test("sin el puerto de aprovisionamiento conectado, crear un negocio falla de forma visible", async () => {
    const holder = globalThis as unknown as { [k: symbol]: { provided: Map<string, unknown> } };
    const registro = holder[Symbol.for("nexus.ports")];
    const guardado = registro.provided.get("tenant-provisioning");
    registro.provided.delete("tenant-provisioning");
    try {
      await expect(newTenant("d")).rejects.toThrow(PortNotProvidedError);
    } finally {
      registro.provided.set("tenant-provisioning", guardado);
    }
  });
});
