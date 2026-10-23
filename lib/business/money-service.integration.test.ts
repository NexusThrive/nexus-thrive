import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { createCashBox, openCashSession } from "./finance-db";
import { createInvoice } from "./invoices-db";
import { createTenantDb } from "@/lib/tenant/db";
import { recordCharge } from "./charge";
import { moneyTransaction, payInvoice, recordIncome, recordIncomeNow, sellProduct, voidPayment } from "./money-service";

/**
 * DATA-01 (docs/nexus-architecture/technical-debt.md): el dinero pasa todo o
 * nada, y lo que se cobra una vez no se cobra dos veces aunque lleguen dos
 * clics a la vez.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const enabled = Boolean(TEST_URL);

function normalize(url: string | undefined): string {
  return (url ?? "").replace(/\?.*$/, "");
}

describe.skipIf(!enabled)("servicio de dinero (integración)", () => {
  const suffix = Date.now().toString(36);
  const user = `user_caja_${suffix}`;
  let tenantId = "";
  let sessionId = "";

  const payments = (where: Record<string, unknown> = {}) =>
    db.orm.public.Payment.where({ tenantId, ...where }).all();
  const incomes = () => db.orm.public.CashMovement.where({ tenantId, sessionId, kind: "INCOME" }).all();

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error(
        "Estas pruebas exigen una base aparte: exportá TEST_DATABASE_URL y ejecutá con DATABASE_URL=$TEST_DATABASE_URL.",
      );
    }
    const tenant = await createAdminDb().createTenant({
      name: "Negocio Caja",
      slug: `caja-${suffix}`,
      vertical: "gym",
      modules: [],
      tenantType: "COMPANY",
      ownerEmail: `dueno.caja.${suffix}@ejemplo.com`,
    });
    tenantId = String(tenant.id);
    const boxId = await createCashBox(tenantId, "Caja principal", 0, null);
    const opened = await openCashSession(tenantId, boxId, 0, user);
    if (!opened.ok) throw new Error(opened.message);
    sessionId = opened.id;
  });

  afterAll(async () => {
    if (tenantId) await deleteTenantCompletely(tenantId);
    await db.close();
  });

  test("dos clics a la vez en «Pagar» una factura crean UN cobro", async () => {
    const inv = await createInvoice(
      tenantId,
      {
        kind: "BILL",
        customerId: null,
        customerName: "Cliente Prueba",
        customerDoc: null,
        issueDate: "2026-10-20",
        dueDate: null,
        notes: null,
        lines: [{ description: "Servicio", quantity: 1, unitPrice: 50000 }],
      },
      user,
    );
    const results = await Promise.all([1, 2, 3].map(() => payInvoice(tenantId, inv.id, "CASH", user)));

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await payments({ invoiceId: inv.id })).toHaveLength(1);
    expect((await db.orm.public.Invoice.where({ tenantId, id: inv.id }).first())?.status).toBe("PAID");
    const moves = (await incomes()).filter((m) => m.description.includes(`N.º ${inv.number}`));
    expect(moves).toHaveLength(1);
  });

  test("una factura ya pagada no se vuelve a cobrar", async () => {
    const inv = await createInvoice(
      tenantId,
      {
        kind: "RECEIPT",
        customerId: null,
        customerName: "Otro Cliente",
        customerDoc: null,
        issueDate: "2026-10-20",
        dueDate: null,
        notes: null,
        lines: [{ description: "Producto", quantity: 2, unitPrice: 10000 }],
      },
      user,
    );
    expect(await payInvoice(tenantId, inv.id, "TRANSFER", user)).not.toBeNull();
    expect(await payInvoice(tenantId, inv.id, "TRANSFER", user)).toBeNull();
    expect(await payments({ invoiceId: inv.id })).toHaveLength(1);
  });

  test("cobros simultáneos reciben recibos consecutivos sin repetir", async () => {
    const before = await payments();
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        recordIncomeNow(tenantId, { amount: 1000 + i, method: "CASH", description: `Cobro ${i}` }, user),
      ),
    );
    const numbers = results.map((r) => r.receiptNumber);
    expect(new Set(numbers).size).toBe(6);
    const top = Math.max(0, ...before.map((p) => p.receiptNumber ?? 0));
    expect([...numbers].sort((a, b) => a - b)).toEqual(Array.from({ length: 6 }, (_, i) => top + i + 1));
  });

  test("un fallo a mitad de camino no deja ni el pago ni el movimiento de caja", async () => {
    const paymentsBefore = (await payments()).length;
    const incomesBefore = (await incomes()).length;
    await expect(
      moneyTransaction(async (tx) => {
        await recordIncome(tx, tenantId, { amount: 9999, method: "CASH", description: "Se cae" }, user);
        throw new Error("falla simulada después del cobro");
      }),
    ).rejects.toThrow("falla simulada");
    expect((await payments()).length).toBe(paymentsBefore);
    expect((await incomes()).length).toBe(incomesBefore);
  });

  test("dos ventas a la vez de la última unidad: se vende una sola", async () => {
    const product = await db.orm.public.Product.create({
      tenantId,
      name: "Proteína",
      price: "80000.00",
      trackStock: true,
      stock: 1,
    });
    const sell = () =>
      sellProduct(
        tenantId,
        { productId: product.id, name: "Proteína", price: 80000, trackStock: true, quantity: 1, method: "CASH", customerId: null },
        user,
      );
    const results = await Promise.all([sell(), sell()]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({ ok: false });
    expect((await db.orm.public.Product.where({ tenantId, id: product.id }).first())?.stock).toBe(0);
    expect(await payments({ sourceType: "SALE", sourceId: product.id })).toHaveLength(1);
    expect(await db.orm.public.StockMovement.where({ tenantId, productId: product.id }).all()).toHaveLength(1);
  });

  // DATA-02: el historial de una membresía sale de Payment y refleja anulaciones.
  test("el historial de la membresía es el de Payment, con sus anulaciones", async () => {
    const customer = await db.orm.public.Customer.create({ tenantId, name: "Socia Prueba" });
    const membershipId = await moneyTransaction(async (tx) => {
      const m = await tx.orm.public.Membership.create({
        tenantId,
        customerId: customer.id,
        type: "mensual",
        startDate: Temporal.Instant.fromEpochMilliseconds(Date.now()),
        endDate: Temporal.Instant.fromEpochMilliseconds(Date.now() + 30 * 86_400_000),
        price: "90000.00",
      });
      await recordCharge(
        tenantId,
        { customerId: customer.id, membershipId: m.id, method: "TRANSFER", amount: 90000, description: "Membresía Mensual — cobro inicial", sourceType: "MEMBERSHIP", sourceId: m.id },
        user,
        tx,
      );
      return m.id;
    });
    const renewal = await recordCharge(
      tenantId,
      { customerId: customer.id, membershipId, method: "TRANSFER", amount: 90000, description: "Membresía Mensual — renovación", sourceType: "MEMBERSHIP", sourceId: membershipId },
      user,
    );

    const tenantDb = createTenantDb(tenantId);
    const detail = await tenantDb.memberships.get(membershipId);
    expect(detail?.payments.map((p) => p.kind)).toEqual(["inicial", "renovacion"]);
    expect((await db.orm.public.Membership.where({ tenantId, id: membershipId }).first())?.payments ?? null).toBeNull();

    await voidPayment(tenantId, renewal.paymentId, "Cobro repetido", user);
    const after = await tenantDb.memberships.get(membershipId);
    expect(after?.payments.find((p) => p.paymentId === renewal.paymentId)?.status).toBe("VOIDED");
  });

  test("anular dos veces a la vez devuelve el efectivo a la caja una sola vez", async () => {
    const income = await recordIncomeNow(tenantId, { amount: 30000, method: "CASH", description: "Para anular" }, user);
    const results = await Promise.all([
      voidPayment(tenantId, income.paymentId, "Error de digitación", user),
      voidPayment(tenantId, income.paymentId, "Error de digitación", user),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const adjusts = await db.orm.public.CashMovement.where({ tenantId, paymentId: income.paymentId, kind: "ADJUST" }).all();
    expect(adjusts).toHaveLength(1);
    expect((await db.orm.public.Payment.where({ tenantId, id: income.paymentId }).first())?.status).toBe("VOIDED");
  });
});
