import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { encryptCredentials } from "@/lib/integrations/providers/connections";
import { receiveProviderWebhook } from "@/lib/integrations/providers/inbound";
import { wompiChecksum } from "@/lib/integrations/providers/wompi";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { todayCO } from "@/lib/domains/finance/tax/tax";
import { setGatewayTariff } from "@/lib/domains/finance/payments/accounts-db";
import { seedAccounting } from "@/lib/domains/finance/accounting/accounting-db";
import { composePorts } from "@/lib/runtime/ports";
import { listSettlements, registerSettlement, settlementItems } from "@/lib/domains/finance/payments/settlements-db";
import { createIntent, listAttempts, listIntents, publicIntent, runReconciliation } from "@/lib/domains/finance/payments/intents-db";

/** Wompi de punta a punta (webhook firmado → cobro confirmado → conciliación), contra Postgres real. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");
const EVENTS = "secreto-de-eventos";

describe.skipIf(!TEST_URL)("pago de prueba con Wompi (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let connectionId = "";
  const wompiEvent = (txId: string, status: string, reference: string, cents: number, secret = EVENTS) => {
    const body: Record<string, unknown> = { event: "transaction.updated", data: { transaction: { id: txId, status, amount_in_cents: cents, reference, currency: "COP" } }, timestamp: 1_700_000_000, signature: { properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"], checksum: "" } };
    (body.signature as { checksum: string }).checksum = wompiChecksum(body, secret);
    return receiveProviderWebhook({ provider: "wompi", connectionId, rawBody: JSON.stringify(body), headers: new Headers() });
  };

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    process.env.WEBHOOK_ENCRYPTION_KEY = "d".repeat(64);
    a = String((await createAdminDb().createTenant({ name: "Empresa Wompi", slug: `wp-${suffix}`, vertical: "retail", modules: ["payments"], tenantType: "COMPANY", ownerEmail: `wp-${suffix}@ejemplo.com` })).id);
    connectionId = (await db.orm.public.ExternalConnection.create({ tenantId: a, kind: "PAYMENT", provider: "wompi", environment: "sandbox", status: "CONNECTED", credentialsEnc: encryptCredentials({ publicKey: "pub_test_x", integritySecret: "int", eventsSecret: EVENTS }), credentialsKeyId: "v1" })).id;
  });
  afterAll(async () => {
    if (a) await deleteTenantCompletely(a);
    await db.close();
  });

  test("PENDING no confirma; APPROVED sí, una sola vez aunque Wompi lo notifique de nuevo; firma mala no guarda nada", async () => {
    const i = await createIntent(a, { amount: 99_900, description: "Plan trimestral", provider: "wompi" }, "u");
    if (!i.ok) throw new Error(i.message);
    expect(await wompiEvent("tx-1", "PENDING", i.reference, 9_990_000)).toMatchObject({ status: 200, body: { ignored: true } });
    expect((await publicIntent(i.reference))!.status).toBe("PENDING");
    expect(await wompiEvent("tx-1", "APPROVED", i.reference, 9_990_000, "otro-secreto")).toMatchObject({ status: 401 });
    expect(await wompiEvent("tx-1", "APPROVED", i.reference, 9_990_000)).toMatchObject({ status: 200, body: { received: true, processed: true } });
    expect(await wompiEvent("tx-1", "APPROVED", i.reference, 9_990_000)).toMatchObject({ status: 200, body: { duplicate: true } });
    const row = (await listIntents(a)).find((x) => x.reference === i.reference)!;
    expect(row).toMatchObject({ status: "PAID", confirmedBy: "PROVIDER", provider: "wompi" });
    expect((await db.orm.public.Payment.where({ tenantId: a }).all()).filter((p) => p.status === "APPROVED")).toHaveLength(1);
  });

  test("un pago rechazado queda como intento, el cobro sigue abierto y la conciliación cuadra con el id de Wompi", async () => {
    const bad = await createIntent(a, { amount: 40_000, description: "Rechazado", provider: "wompi" }, "u");
    if (!bad.ok) throw new Error(bad.message);
    await wompiEvent("tx-2", "DECLINED", bad.reference, 4_000_000);
    expect((await publicIntent(bad.reference))!.status).toBe("PENDING");
    const r = await runReconciliation(a, "wompi", todayCO(), [{ externalId: "tx-1", amount: 99_900 }], "u");
    if (!r.ok) throw new Error(r.message);
    expect(r.result).toMatchObject({ matched: 1, differences: [] });
  });

  test("el rechazo deja un intento (sin pago), no se duplica y el cobro se puede pagar después", async () => {
    const i = await createIntent(a, { amount: 55_000, description: "Reintento", provider: "wompi" }, "u");
    if (!i.ok) throw new Error(i.message);
    const paymentsBefore = (await db.orm.public.Payment.where({ tenantId: a }).all()).length;
    await wompiEvent("tx-3", "DECLINED", i.reference, 5_500_000);
    expect(await wompiEvent("tx-3", "DECLINED", i.reference, 5_500_000)).toMatchObject({ body: { duplicate: true } });
    await wompiEvent("tx-4", "ERROR", i.reference, 5_500_000);
    const attempts = await listAttempts(a, i.id);
    expect(attempts).toHaveLength(2);
    expect(attempts[0]).toMatchObject({ result: "DECLINED", amount: 55_000 });
    expect((await listIntents(a)).find((x) => x.id === i.id)).toMatchObject({ status: "PENDING", failedAttempts: 2, lastAttemptResult: "DECLINED" });
    expect((await db.orm.public.Payment.where({ tenantId: a }).all()).length).toBe(paymentsBefore);
    await wompiEvent("tx-5", "APPROVED", i.reference, 5_500_000);
    expect((await publicIntent(i.reference))!.status).toBe("PAID");
    // Un aviso fallido tardío sobre un cobro ya pagado no se registra.
    await wompiEvent("tx-6", "DECLINED", i.reference, 5_500_000);
    expect(await listAttempts(a, i.id)).toHaveLength(2);
  });

  test("una venta de $100.000 por Wompi muestra bruto, comisión y neto, con asiento equilibrado", async () => {
    composePorts();
    await db.orm.public.Tenant.where({ id: a }).update({ accountingEnabled: true } as never);
    await seedAccounting(a);
    expect(await setGatewayTariff(a, "wompi", { feePct: 2.65, feeFixed: 700, feeVatPct: 19 })).toEqual({ ok: true });
    expect(await setGatewayTariff(a, "wompi", { feePct: 40, feeFixed: 0, feeVatPct: 0 })).toMatchObject({ ok: false });
    const i = await createIntent(a, { amount: 100_000, description: "Con comisión", provider: "wompi" }, "u");
    if (!i.ok) throw new Error(i.message);
    await wompiEvent("tx-fee", "APPROVED", i.reference, 10_000_000);
    const row = (await listIntents(a)).find((x) => x.id === i.id)!;
    expect(row).toMatchObject({ status: "PAID", feeEstimated: 3986.5, netExpected: 96013.5 });
    expect(row.feeEstimated! + row.netExpected!).toBe(100_000);

    const payment = await db.orm.public.Payment.where({ tenantId: a, id: (await db.orm.public.PaymentIntent.where({ tenantId: a, id: i.id }).first())!.paymentId! }).first();
    const entry = await db.orm.public.JournalEntry.where({ tenantId: a, sourceType: "PAYMENT", sourceId: payment!.id }).first();
    expect(entry?.event).toBe("PAYMENT_RECEIVED_GATEWAY");
    const lines = await db.orm.public.JournalLine.where({ tenantId: a, entryId: entry!.id }).all();
    const debit = lines.reduce((s, l) => s + Number(l.debit), 0);
    const credit = lines.reduce((s, l) => s + Number(l.credit), 0);
    expect(debit).toBe(credit);
    expect(lines.find((l) => l.accountCode === "1340")).toMatchObject({ debit: expect.anything() });
    expect(Number(lines.find((l) => l.accountCode === "1340")!.debit)).toBe(96013.5);
    expect(Number(lines.find((l) => l.accountCode === "5305")!.debit)).toBe(3986.5);
    expect(Number(lines.find((l) => l.accountCode === "1305")!.credit)).toBe(100_000);
  });

  test("sin tarifa configurada el cobro se asienta normal y no muestra comisión", async () => {
    await setGatewayTariff(a, "wompi", { feePct: 0, feeFixed: 0, feeVatPct: 0 });
    const i = await createIntent(a, { amount: 30_000, description: "Sin tarifa", provider: "wompi" }, "u");
    if (!i.ok) throw new Error(i.message);
    await wompiEvent("tx-nofee", "APPROVED", i.reference, 3_000_000);
    expect((await listIntents(a)).find((x) => x.id === i.id)).toMatchObject({ status: "PAID", feeEstimated: null, netExpected: null });
  });

  test("una liquidación liga todas sus transacciones, registra la comisión real y asienta la diferencia", async () => {
    await setGatewayTariff(a, "wompi", { feePct: 2.65, feeFixed: 700, feeVatPct: 19 });
    const pay = async (id: string, amount: number) => {
      const i = await createIntent(a, { amount, description: `Liquidable ${id}`, provider: "wompi" }, "u");
      if (!i.ok) throw new Error(i.message);
      await wompiEvent(id, "APPROVED", i.reference, amount * 100);
      return i;
    };
    const one = await pay("tx-liq-1", 100_000);
    await pay("tx-liq-2", 45_000);
    const rows = [{ externalId: "tx-liq-1", amount: 100_000 }, { externalId: "tx-liq-2", amount: 45_000 }];
    // Estimada: 3.986,50 + 1.937,89 (45.000 × 2,65 % + 700, + IVA) · real: 5.950 → deposito 139.050
    expect(await registerSettlement(a, { provider: "wompi", externalRef: "LQ-1", day: "2026-11-07", rows: [...rows, { externalId: "tx-nuevo", amount: 1_000 }], feeReal: 5_950, netReceived: 140_050 }, "u")).toMatchObject({ ok: false, missing: ["tx-nuevo"] });
    expect(await registerSettlement(a, { provider: "wompi", externalRef: "LQ-1", day: "2026-11-07", rows, feeReal: 5_950, netReceived: 100_000 }, "u")).toMatchObject({ ok: false });
    const ok = await registerSettlement(a, { provider: "wompi", externalRef: "LQ-1", day: "2026-11-07", rows, feeReal: 5_950, netReceived: 139_050 }, "u");
    if (!ok.ok) throw new Error(ok.message);
    const [settlement] = await listSettlements(a);
    expect(settlement).toMatchObject({ externalRef: "LQ-1", itemCount: 2, gross: 145_000, feeReal: 5_950, netReceived: 139_050, accounted: true });
    expect(settlement!.feeEstimated + settlement!.difference).toBeCloseTo(5_950, 2);
    expect((await settlementItems(a, ok.id)).map((x) => x.providerRefId).sort()).toEqual(["tx-liq-1", "tx-liq-2"]);
    // El asiento cuadra: depósito + ajuste de comisión = lo que estaba por cobrar a la pasarela.
    const entry = await db.orm.public.JournalEntry.where({ tenantId: a, sourceType: "SETTLEMENT", sourceId: ok.id }).first();
    const lines = await db.orm.public.JournalLine.where({ tenantId: a, entryId: entry!.id }).all();
    expect(lines.reduce((s, l) => s + Number(l.debit), 0)).toBe(lines.reduce((s, l) => s + Number(l.credit), 0));
    expect(Number(lines.find((l) => l.accountCode === "1110")!.debit)).toBe(139_050);
    // No se liquida dos veces la misma referencia ni los mismos cobros.
    expect(await registerSettlement(a, { provider: "wompi", externalRef: "LQ-1", day: "2026-11-07", rows, feeReal: 5_950, netReceived: 139_050 }, "u")).toMatchObject({ ok: false, message: "Esa liquidación ya está registrada." });
    expect(await registerSettlement(a, { provider: "wompi", externalRef: "LQ-2", day: "2026-11-07", rows: [rows[0]!], feeReal: 3_000, netReceived: 97_000 }, "u")).toMatchObject({ ok: false });
    expect((await db.orm.public.PaymentIntent.where({ tenantId: a, id: one.id }).first())?.settlementId).toBe(ok.id);
    // Otro negocio no ve ni usa esos cobros.
    expect(await listSettlements("00000000-0000-0000-0000-000000000000")).toEqual([]);
  });
});
