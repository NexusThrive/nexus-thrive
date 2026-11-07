import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { allocatePayment, allocatedOf } from "@/lib/business/sales/allocations";
import { createInvoice } from "@/lib/business/sales/invoices-db";
import { MoneyError, moneyTransaction, receiveInvoicePayment, recordIncomeNow, voidPayment } from "@/lib/business/sales/money-service";
import { enrollInPlan } from "@/lib/industry/gym/enrollment-db";

/** HU-aplicacion-01: un pago se reparte entre lo que cubre y la suma aplicada nunca supera el pago. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");
const sum = (rows: { amount: unknown }[]) => Math.round(rows.reduce((s, r) => s + Number(r.amount), 0) * 100) / 100;

describe.skipIf(!TEST_URL)("aplicación de pagos (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let customerId = "";
  let planId = "";
  const allocs = (tenantId: string, filter: Record<string, unknown> = {}) => db.orm.public.PaymentAllocation.where({ tenantId, ...filter }).all();

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "Aplicación A", slug: `ap-${suffix}`, vertical: "gym", modules: ["crm", "memberships", "receivables"], tenantType: "COMPANY", ownerEmail: `ap-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "Aplicación B", slug: `aq-${suffix}`, vertical: "gym", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `aq-${suffix}@ejemplo.com` })).id);
    customerId = (await db.orm.public.Customer.create({ tenantId: a, name: "Cliente Aplicado" })).id;
    planId = (await db.orm.public.Product.create({ tenantId: a, name: "Plan", price: "100000.00", kind: "PLAN", durationDays: 30, active: true } as never)).id;
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("tres abonos sobre una cuenta de cobro cuadran con su total y quedan aplicados", async () => {
    const inv = await createInvoice(a, { kind: "BILL", customerId, customerName: "Cliente Aplicado", customerDoc: null, issueDate: "2026-11-01", dueDate: "2026-12-01", notes: null, lines: [{ description: "Servicio", quantity: 1, unitPrice: 300_000 }] }, "u");
    for (const amount of [100_000, 150_000, 50_000]) expect(await receiveInvoicePayment(a, inv.id, amount, "TRANSFER", "u")).toMatchObject({ ok: true });
    const rows = await allocs(a, { targetType: "INVOICE", targetId: inv.id });
    expect(rows).toHaveLength(3);
    expect(sum(rows)).toBe(300_000);
    const invoice = await db.orm.public.Invoice.where({ tenantId: a, id: inv.id }).first();
    expect(Number(invoice?.paidTotal)).toBe(300_000);
    expect(invoice?.status).toBe("PAID");
  });

  test("un pago de membresía se aplica a su deuda; las partes cuadran y el sobrante queda sin aplicar", async () => {
    await enrollInPlan(a, { customerId, customerName: "Cliente Aplicado", plan: { id: planId, name: "Plan", price: 100_000, durationDays: 30 }, method: null }, "u");
    const membership = (await db.orm.public.Membership.where({ tenantId: a, customerId }).all()).at(-1)!;
    const pay = (amount: number) => recordIncomeNow(a, { amount, method: "TRANSFER", description: "Abono membresía", customerId, membershipId: membership.id, sourceType: "MEMBERSHIP", sourceId: membership.id }, "u");
    const first = await pay(40_000);
    const second = await pay(60_000);
    const obligation = await db.orm.public.Obligation.where({ tenantId: a, originId: membership.id }).first();
    expect(Number(obligation?.paidTotal)).toBe(100_000);
    expect(obligation?.status).toBe("PAID");
    const parts = await allocs(a, { targetType: "OBLIGATION", targetId: obligation!.id });
    expect(sum(parts)).toBe(100_000);
    expect(parts).toHaveLength(2);
    // Un tercer pago, ya sin deuda, no aplica nada: queda como pago sin aplicar (anticipo).
    const third = await pay(25_000);
    await moneyTransaction(async (tx) => expect(await allocatedOf(tx, a, third.paymentId)).toBe(0));
    await moneyTransaction(async (tx) => expect(await allocatedOf(tx, a, first.paymentId) + (await allocatedOf(tx, a, second.paymentId))).toBe(100_000));
  });

  test("lo aplicado nunca supera el pago", async () => {
    const pay = await recordIncomeNow(a, { amount: 50_000, method: "CASH", description: "Pago libre" }, "u");
    await expect(moneyTransaction((tx) => allocatePayment(tx, a, { paymentId: pay.paymentId, paymentAmount: 50_000, targetType: "OBLIGATION", targetId: "x", amount: 30_000 }))).resolves.toBeUndefined();
    await expect(moneyTransaction((tx) => allocatePayment(tx, a, { paymentId: pay.paymentId, paymentAmount: 50_000, targetType: "OBLIGATION", targetId: "y", amount: 30_000 }))).rejects.toBeInstanceOf(MoneyError);
    await expect(moneyTransaction((tx) => allocatePayment(tx, a, { paymentId: pay.paymentId, paymentAmount: 50_000, targetType: "OBLIGATION", targetId: "y", amount: 0 }))).rejects.toBeInstanceOf(MoneyError);
    expect(sum(await allocs(a, { paymentId: pay.paymentId }))).toBe(30_000);
  });

  test("anular un pago deshace su aplicación y la deuda vuelve a abrirse", async () => {
    const other = (await db.orm.public.Customer.create({ tenantId: a, name: "Cliente Anulado" })).id;
    await enrollInPlan(a, { customerId: other, customerName: "Cliente Anulado", plan: { id: planId, name: "Plan", price: 100_000, durationDays: 30 }, method: null }, "u");
    const membership = await db.orm.public.Membership.where({ tenantId: a, customerId: other }).first();
    const paid = await recordIncomeNow(a, { amount: 100_000, method: "TRANSFER", description: "Pago", customerId: other, membershipId: membership!.id, sourceType: "MEMBERSHIP", sourceId: membership!.id }, "u");
    expect((await db.orm.public.Obligation.where({ tenantId: a, originId: membership!.id }).first())?.status).toBe("PAID");
    expect(await voidPayment(a, paid.paymentId, "Error de digitación", "u")).toMatchObject({ ok: true });
    const obligation = await db.orm.public.Obligation.where({ tenantId: a, originId: membership!.id }).first();
    expect(obligation).toMatchObject({ status: "OPEN" });
    expect(Number(obligation?.paidTotal)).toBe(0);
    expect(await allocs(a, { paymentId: paid.paymentId })).toHaveLength(0);
  });

  test("dos pagos a la vez sobre una deuda: nunca se aplica más de lo que se debe", async () => {
    const other = (await db.orm.public.Customer.create({ tenantId: a, name: "Cliente Concurrente" })).id;
    await enrollInPlan(a, { customerId: other, customerName: "Cliente Concurrente", plan: { id: planId, name: "Plan", price: 100_000, durationDays: 30 }, method: null }, "u");
    const membership = await db.orm.public.Membership.where({ tenantId: a, customerId: other }).first();
    const pay = () => recordIncomeNow(a, { amount: 70_000, method: "TRANSFER", description: "Pago simultáneo", customerId: other, membershipId: membership!.id, sourceType: "MEMBERSHIP", sourceId: membership!.id }, "u");
    const [x, y] = await Promise.allSettled([pay(), pay()]);
    const done = [x, y].filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof pay>>> => r.status === "fulfilled");
    const obligation = await db.orm.public.Obligation.where({ tenantId: a, originId: membership!.id }).first();
    const applied = sum(await allocs(a, { targetType: "OBLIGATION", targetId: obligation!.id }));
    expect(Number(obligation?.paidTotal)).toBe(applied);
    expect(applied).toBeLessThanOrEqual(100_000);
    expect(applied).toBe(Math.min(100_000, done.length * 70_000));
  });

  test("las aplicaciones no cruzan negocios", async () => {
    expect(await db.orm.public.PaymentAllocation.where({ tenantId: b }).all()).toHaveLength(0);
  });
});
