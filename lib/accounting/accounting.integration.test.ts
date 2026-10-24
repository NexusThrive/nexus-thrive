import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { PUC_TEMPLATE } from "./puc";
import { PeriodClosedError, assertPeriodOpen, closePeriod, createAccount, createCostCenter, isPeriodOpen, listAccounts, listCostCenters, listPeriods, listRules, reopenPeriod, seedAccounting, setAccountActive, setRuleActive } from "./accounting-db";

/** Contabilidad I contra Postgres real y DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("contabilidad I (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "retail", modules: ["finance"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Empresa A", `ac-a-${suffix}`)).id);
    b = String((await make("Empresa B", `ac-b-${suffix}`)).id);
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("un negocio nuevo ya trae su PUC y sus reglas; sembrar de nuevo no duplica", async () => {
    expect((await listAccounts(a)).length).toBe(PUC_TEMPLATE.length);
    expect((await listRules(a)).map((r) => r.event)).toEqual(["SALE", "SALE_COST", "PAYMENT_RECEIVED", "CREDIT_NOTE", "DEBIT_NOTE", "PURCHASE_RECEIVED", "SUPPLIER_PAID", "EXPENSE_PAID"]);
    expect(await seedAccounting(a)).toEqual({ accounts: 0, rules: 0 });
    // Un negocio antiguo (sin plan) lo recibe completo, y solo lo que le falta.
    await db.orm.public.Account.where({ tenantId: b, code: "1105" }).deleteAll();
    expect(await seedAccounting(b)).toEqual({ accounts: 1, rules: 0 });
  });

  test("las cuentas se ajustan sin pisar al otro negocio; una subcuenta cuelga de su cuenta", async () => {
    expect(await createAccount(a, { code: "110505", name: "Caja general" })).toMatchObject({ ok: true });
    expect(await createAccount(a, { code: "110505", name: "Otra" })).toMatchObject({ ok: false, message: expect.stringContaining("Ya existe") });
    expect(await createAccount(a, { code: "199999", name: "Sin padre" })).toMatchObject({ ok: false });
    expect((await listAccounts(b)).some((x) => x.code === "110505")).toBe(false);
    const acc = (await listAccounts(a)).find((x) => x.code === "110505")!;
    expect(acc).toMatchObject({ type: "ASSET", nature: "D", postable: true });
    expect(await setAccountActive(b, acc.id, false)).toBe(false); // de otro negocio
    expect(await setAccountActive(a, acc.id, false)).toBe(true);
  });

  test("las reglas se ven y se desactivan; una regla no se activa si su cuenta está apagada", async () => {
    const sale = (await listRules(a)).find((r) => r.event === "SALE")!;
    expect(await setRuleActive(a, sale.id, false)).toEqual({ ok: true });
    const caja = (await listAccounts(a)).find((x) => x.code === "1305")!;
    await setAccountActive(a, caja.id, false);
    expect(await setRuleActive(a, sale.id, true)).toMatchObject({ ok: false, message: expect.stringContaining("1305") });
    await setAccountActive(a, caja.id, true);
    expect(await setRuleActive(a, sale.id, true)).toEqual({ ok: true });
    expect(await setRuleActive(b, sale.id, false)).toMatchObject({ ok: false });
  });

  test("centros de costo y sucursales con código único por negocio", async () => {
    expect(await createCostCenter(a, { code: "adm", name: "Administración", kind: "CENTER" })).toMatchObject({ ok: true });
    expect(await createCostCenter(a, { code: "ADM", name: "Otra", kind: "CENTER" })).toMatchObject({ ok: false });
    expect(await createCostCenter(b, { code: "ADM", name: "Admin B", kind: "BRANCH" })).toMatchObject({ ok: true }); // el mismo código en otro negocio sí
    expect((await listCostCenters(a)).map((c) => c.code)).toEqual(["ADM"]);
  });

  test("períodos: un mes sin registro está abierto; se cierra en orden, bloquea y se reabre con motivo del más reciente al más antiguo", async () => {
    const today = "2026-10-24";
    expect(await isPeriodOpen(a, "2026-08-10")).toBe(true);
    expect(await closePeriod(a, 2026, 10, "u", today)).toMatchObject({ ok: false, message: expect.stringContaining("ya terminó") });
    expect(await closePeriod(a, 2026, 8, "u", today)).toEqual({ ok: true });
    expect(await closePeriod(a, 2026, 7, "u", today)).toEqual({ ok: true }); // cerrar uno anterior sí
    expect(await isPeriodOpen(a, "2026-08-10")).toBe(false);
    await expect(assertPeriodOpen(a, "2026-08-10")).rejects.toThrow(PeriodClosedError);
    await expect(assertPeriodOpen(a, "2026-09-01")).resolves.toBeUndefined();
    // Dejar septiembre abierto e intentar cerrar octubre... (no ha terminado); cerrar septiembre es lo siguiente
    expect(await closePeriod(a, 2026, 9, "u", today)).toEqual({ ok: true });
    expect((await listPeriods(a)).map((p) => `${p.year}-${p.month}:${p.status}`)).toEqual(["2026-9:CLOSED", "2026-8:CLOSED", "2026-7:CLOSED"]);
    expect(await reopenPeriod(a, 2026, 8, "Error en una factura")).toMatchObject({ ok: false, message: expect.stringContaining("09/2026") });
    expect(await reopenPeriod(a, 2026, 9, "x")).toMatchObject({ ok: false, message: expect.stringContaining("motivo") });
    expect(await reopenPeriod(a, 2026, 9, "Ajuste de inventario")).toEqual({ ok: true });
    expect(await isPeriodOpen(a, "2026-09-15")).toBe(true);
    expect(await isPeriodOpen(b, "2026-08-10")).toBe(true); // el cierre de A no afecta a B
  });

  test("no se cierra un mes dejando uno anterior abierto con registro", async () => {
    await db.orm.public.AccountingPeriod.create({ tenantId: b, year: 2026, month: 1, status: "OPEN" });
    expect(await closePeriod(b, 2026, 3, "u", "2026-10-24")).toMatchObject({ ok: false, message: expect.stringContaining("01/2026") });
  });
});
