import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { createDocument } from "@/lib/business/documents-db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { NumberingError, createResolution, createTaxRate, ensureDefaultTaxes, listResolutions, listTaxRates, setResolutionActive, updateTaxRate } from "./tax-db";

/** Impuestos con vigencia y numeración por resolución contra Postgres real y DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");
const year = new Date().getUTCFullYear();

describe.skipIf(!TEST_URL)("impuestos y numeración (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  const bill = (tenantId: string, extra: Record<string, unknown> = {}) =>
    createDocument(tenantId, { kind: "BILL", customerId: null, customerName: "Cliente", lines: [{ description: "Asesoría", quantity: 1, unitPrice: 1_000_000, taxRatePct: 19 }], ...extra }, null);

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "retail", modules: ["finance"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Empresa A", `tx-a-${suffix}`)).id);
    b = String((await make("Empresa B", `tx-b-${suffix}`)).id);
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("cargar las tarifas habituales es idempotente y aislado por negocio", async () => {
    expect((await ensureDefaultTaxes(a)).created).toBe(8);
    expect((await ensureDefaultTaxes(a)).created).toBe(0);
    expect((await listTaxRates(a)).map((r) => r.code)).toContain("RETEFUENTE_SERVICIOS");
    expect(await listTaxRates(b)).toEqual([]);
  });

  test("una tarifa nueva no puede pisar la vigencia de otra del mismo código; cerrarla la libera", async () => {
    const iva = (await listTaxRates(a)).find((r) => r.code === "IVA_19")!;
    const clash = await createTaxRate(a, { code: "IVA_19", name: "IVA 19 %", kind: "IVA", ratePct: 19, validFrom: "2030-01-01" });
    expect(clash).toMatchObject({ ok: false, message: expect.stringContaining("Ya hay una tarifa IVA_19") });
    expect(await updateTaxRate(a, iva.id, { validTo: "2029-12-31" })).toEqual({ ok: true });
    expect(await createTaxRate(a, { code: "IVA_19", name: "IVA 21 %", kind: "IVA", ratePct: 21, validFrom: "2030-01-01" })).toMatchObject({ ok: true });
    expect(await updateTaxRate(b, iva.id, { active: false })).toMatchObject({ ok: false }); // la de otro negocio no se toca
  });

  test("la venta guarda las retenciones vigentes a la fecha del documento", async () => {
    const doc = await bill(a, { withholdingCodes: ["RETEFUENTE_SERVICIOS", "RETEIVA", "NO_EXISTE"] });
    const row = await db.orm.public.Invoice.where({ tenantId: a, id: doc.id }).first();
    expect(Number(row!.total)).toBe(1_190_000);
    expect(Number(row!.withholdingTotal)).toBe(40_000 + 28_500);
    expect((row!.withholdings as { code: string; amount: number }[]).map((w) => [w.code, w.amount])).toEqual([["RETEFUENTE_SERVICIOS", 40_000], ["RETEIVA", 28_500]]);
    const plain = await bill(a);
    expect(Number((await db.orm.public.Invoice.where({ tenantId: a, id: plain.id }).first())!.withholdingTotal)).toBe(0);
  });

  test("sin resolución el consecutivo es el de siempre; con resolución sigue después de lo emitido y respeta el rango", async () => {
    const before = await bill(a); // consecutivo interno
    expect(before.number).toBeGreaterThan(1);
    const res = await createResolution(a, { documentKind: "BILL", prefix: "setp", resolutionNumber: "18760000001", rangeFrom: 1, rangeTo: before.number + 3, validFrom: `${year - 1}-01-01`, validTo: `${year + 1}-12-31` });
    expect(res).toMatchObject({ ok: true, nextNumber: before.number + 1 });
    const n1 = await bill(a);
    const n2 = await bill(a);
    const n3 = await bill(a);
    expect([n1.number, n2.number, n3.number]).toEqual([before.number + 1, before.number + 2, before.number + 3]);
    const stored = await db.orm.public.Invoice.where({ tenantId: a, id: n3.id }).first();
    expect(stored).toMatchObject({ prefix: "SETP" });
    expect(stored!.resolutionId).toBeTruthy();
    // Agotada: no emite fuera de rango y lo dice.
    await expect(bill(a)).rejects.toThrow(NumberingError);
    await expect(bill(a)).rejects.toThrow(/agotó el rango/);
    const [state] = await listResolutions(a);
    expect(state!.status).toMatchObject({ state: "exhausted", remaining: 0 });
    // Otros tipos de documento y el otro negocio no se ven afectados.
    await expect(createDocument(a, { kind: "QUOTE", customerId: null, customerName: "X", lines: [{ description: "x", quantity: 1, unitPrice: 1 }] }, null)).resolves.toBeTruthy();
    await expect(bill(b)).resolves.toBeTruthy();
  });

  test("una resolución vencida o apagada bloquea; el rango no puede cruzarse con otro del mismo prefijo", async () => {
    const [res] = await listResolutions(a);
    expect(await createResolution(a, { documentKind: "BILL", prefix: "SETP", resolutionNumber: "18760000002", rangeFrom: 1, rangeTo: 50, validFrom: `${year}-01-01`, validTo: `${year}-12-31` })).toMatchObject({ ok: false, message: expect.stringContaining("se cruza") });
    expect(await setResolutionActive(a, res!.id, false)).toBe(true);
    await expect(bill(a)).rejects.toThrow(NumberingError);
    expect(await setResolutionActive(b, res!.id, true)).toBe(false); // de otro negocio
    const old = await createResolution(a, { documentKind: "SALE", prefix: "V", resolutionNumber: "18760000003", rangeFrom: 1, rangeTo: 100, validFrom: `${year - 3}-01-01`, validTo: `${year - 2}-12-31` });
    expect(old).toMatchObject({ ok: true });
    await expect(createDocument(a, { kind: "SALE", customerId: null, customerName: "X", lines: [{ description: "x", quantity: 1, unitPrice: 1 }] }, null)).rejects.toThrow(/venció/);
  });

  test("dos documentos simultáneos con resolución no repiten número", async () => {
    await createResolution(b, { documentKind: "BILL", prefix: "B", resolutionNumber: "18760000009", rangeFrom: 1000, rangeTo: 1100, validFrom: `${year}-01-01`, validTo: `${year + 1}-12-31` });
    const results = await Promise.all(Array.from({ length: 6 }, () => bill(b)));
    const numbers = results.map((r) => r.number).sort((x, y) => x - y);
    expect(new Set(numbers).size).toBe(6);
    expect(numbers.every((n) => n >= 1000 && n <= 1100)).toBe(true);
    const [state] = await listResolutions(b);
    expect(state!.nextNumber).toBe(Math.max(...numbers) + 1);
  });
});
