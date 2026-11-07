import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { recordIncomeNow } from "@/lib/business/sales/money-service";
import { confirmMatch, importStatement, listStatement, markReviewed } from "@/lib/domains/finance/payments/statements-db";
import { todayCO } from "@/lib/domains/finance/tax/tax";

/** HU-conciliacion-01: cada movimiento queda conciliado, propuesto o pendiente; nada se concilia solo. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("extracto bancario (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  const today = todayCO();
  let settlementId = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "Extracto A", slug: `xa-${suffix}`, vertical: "retail", modules: ["payments"], tenantType: "COMPANY", ownerEmail: `xa-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "Extracto B", slug: `xb-${suffix}`, vertical: "retail", modules: ["payments"], tenantType: "COMPANY", ownerEmail: `xb-${suffix}@ejemplo.com` })).id);
    settlementId = (await db.orm.public.ProviderSettlement.create({ tenantId: a, provider: "wompi", externalRef: "LQ-X1", day: today, gross: "145000.00", feeEstimated: "5886.50", feeReal: "5950.00", netReceived: "139050.00", difference: "63.50", itemCount: 2 })).id;
    await recordIncomeNow(a, { amount: 140_000, method: "TRANSFER", description: "Transferencia pedido" }, "u");
    await recordIncomeNow(a, { amount: 80_000, method: "TRANSFER", description: "Transferencia aproximada" }, "u");
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  const csv = `fecha;descripcion;referencia;valor\n${today}; Abono Wompi; LQ-X1; 139.050\n${today}; Transferencia Camila; 88231; 140.000\n${today}; Transferencia Andrés; 90112; 80.600\n${today}; Pago de nómina; ; -900.000\n${today}; Consignación sin dueño; 5; 12.345\nlínea rota`;

  test("importa, propone cruces exactos y aproximados y deja lo demás pendiente", async () => {
    const r = await importStatement(a, csv);
    expect(r).toMatchObject({ ok: true, added: 5, duplicates: 0, proposed: 3 });
    expect(r.ok && r.bad).toEqual([7]);
    const lines = await listStatement(a);
    const by = (d: string) => lines.find((l) => l.description.includes(d))!;
    expect(by("Abono Wompi")).toMatchObject({ status: "PROPOSED", matchType: "SETTLEMENT", matchConfidence: "EXACT", matchLabel: "Liquidación LQ-X1" });
    expect(by("Camila")).toMatchObject({ status: "PROPOSED", matchType: "PAYMENT", matchConfidence: "EXACT" });
    expect(by("Andrés")).toMatchObject({ status: "PROPOSED", matchConfidence: "APPROX" });
    expect(by("nómina")).toMatchObject({ status: "UNMATCHED", matchId: null });
    expect(by("sin dueño")).toMatchObject({ status: "UNMATCHED" });
    // Nada se concilia solo.
    expect(lines.filter((l) => l.status === "MATCHED")).toHaveLength(0);
  });

  test("importar dos veces el mismo extracto no duplica", async () => {
    expect(await importStatement(a, csv)).toMatchObject({ ok: true, added: 0, duplicates: 5 });
    expect(await listStatement(a)).toHaveLength(5);
  });

  test("confirmar concilia una vez; el mismo cruce no sirve para otro movimiento; los extractos no cruzan negocios", async () => {
    const line = (await listStatement(a)).find((l) => l.description.includes("Abono Wompi"))!;
    expect(await confirmMatch(b, line.id, "u")).toMatchObject({ ok: false });
    expect(await confirmMatch(a, line.id, "u")).toEqual({ ok: true });
    expect((await listStatement(a)).find((l) => l.id === line.id)?.status).toBe("MATCHED");
    expect(await confirmMatch(a, line.id, "u")).toMatchObject({ ok: false });
    // Otro depósito del mismo valor ya no se propone contra la liquidación conciliada.
    await importStatement(a, `${today}; Otro abono igual; LQ-X1b; 139.050`);
    expect((await listStatement(a)).find((l) => l.description === "Otro abono igual")).toMatchObject({ status: "UNMATCHED" });
    expect(await listStatement(b)).toHaveLength(0);
  });

  test("marcar sin cruce saca el movimiento de las propuestas y no se vuelve a proponer", async () => {
    const line = (await listStatement(a)).find((l) => l.description.includes("Andrés"))!;
    expect(await markReviewed(a, line.id)).toEqual({ ok: true });
    await importStatement(a, `${today}; Algo nuevo; 1; 10.000`);
    expect((await listStatement(a)).find((l) => l.id === line.id)).toMatchObject({ status: "REVIEWED", matchId: null });
    expect(await markReviewed(a, "00000000-0000-0000-0000-000000000000")).toMatchObject({ ok: false });
  });

  test("un extracto vacío o ilegible se rechaza con un mensaje claro", async () => {
    expect(await importStatement(a, "")).toMatchObject({ ok: false });
    expect(await importStatement(a, "esto no es\nun extracto")).toMatchObject({ ok: false });
  });
});
