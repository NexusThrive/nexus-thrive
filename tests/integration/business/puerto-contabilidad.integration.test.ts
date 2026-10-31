/**
 * Contrato entre Business y la contabilidad (`accountingPort`).
 *
 * Business informa hechos y Finance decide si corresponde un asiento. Estas pruebas fijan: (1) el hecho exacto que
 * Business entrega, (2) que todo ocurre en la transacción de Business (si Finance falla, se deshace todo: el dinero
 * va «todo o nada»), (3) que no se asienta nada si el negocio no tiene contabilidad, y (4) que un puerto sin
 * conectar falla de forma visible en vez de omitir la contabilidad.
 */
import { afterAll, beforeAll, afterEach, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { setAccountingEnabled } from "@/lib/domains/finance/accounting/ledger-db";
import { accountingPort, type AccountingFact, type AccountingPort } from "@/lib/business/sales/accounting-port";
import { createDocument } from "@/lib/business/sales/documents-db";
import { voidInvoice } from "@/lib/business/sales/invoices-db";
import { recordIncomeNow, voidPayment } from "@/lib/business/sales/money-service";
import { PortNotProvidedError } from "@/lib/foundation/ports";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";

const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("puerto de contabilidad (integración)", () => {
  const suffix = Date.now().toString(36);
  let conContabilidad = "";
  let sinContabilidad = "";
  let customerId = "";
  let real: AccountingPort;
  const hechos: { fact: AccountingFact; userId: string | null }[] = [];
  const reversas: { sourceType: string; sourceId: string; reason: string }[] = [];

  /** Deja pasar todo a la implementación real, pero anota lo que Business entregó. */
  const espiar = () => {
    hechos.length = 0;
    reversas.length = 0;
    accountingPort.provide({
      record: async (tx, tenantId, fact, userId) => {
        hechos.push({ fact, userId });
        return real.record(tx, tenantId, fact, userId);
      },
      reverse: async (tx, tenantId, sourceType, sourceId, reason, userId) => {
        reversas.push({ sourceType, sourceId, reason });
        return real.reverse(tx, tenantId, sourceType, sourceId, reason, userId);
      },
    });
  };

  const documento = (tenantId: string, issueDate: string) =>
    createDocument(tenantId, { kind: "BILL", customerId, customerName: "Cliente", issueDate: Temporal.Instant.from(issueDate), lines: [{ description: "Servicio", quantity: 1, unitPrice: 100_000, taxRatePct: 19 }] }, "u");

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    real = accountingPort.use();
    const make = async (n: string) =>
      String((await createAdminDb().createTenant({ name: `Puerto ${n}`, slug: `puerto-${n}-${suffix}`, vertical: "retail", modules: ["finance"], tenantType: "COMPANY", ownerEmail: `puerto-${n}-${suffix}@ejemplo.com` })).id);
    conContabilidad = await make("a");
    sinContabilidad = await make("b");
    await setAccountingEnabled(conContabilidad, true);
    customerId = (await db.orm.public.Customer.create({ tenantId: conContabilidad, name: "Cliente" })).id;
    await db.orm.public.Customer.create({ tenantId: sinContabilidad, name: "Cliente B" });
  });
  afterEach(() => accountingPort.provide(real));
  afterAll(async () => {
    accountingPort.provide(real);
    for (const id of [conContabilidad, sinContabilidad]) if (id) await deleteTenantCompletely(id);
  });

  const asientos = (tenantId: string) => db.orm.public.JournalEntry.where({ tenantId }).all();

  test("una venta entrega el hecho SALE con sus importes, el día de Bogotá y su origen", async () => {
    espiar();
    const d = await documento(conContabilidad, "2026-10-31T03:00:00Z"); // 22:00 del 30-oct en Bogotá
    expect(hechos).toHaveLength(1);
    expect(hechos[0].fact).toMatchObject({ event: "SALE", amounts: { total: 119_000, subtotal: 100_000, tax: 19_000 }, date: "2026-10-30", sourceType: "DOCUMENT", sourceId: d.id });
    expect(hechos[0].fact.description).toMatch(/^Cuenta de cobro|^Factura|^Recibo|BILL|CC-/);
    expect(hechos[0].userId).toBe("u");
    expect((await asientos(conContabilidad)).some((a) => a.sourceId === d.id && a.date === "2026-10-30")).toBe(true);
  });

  test("un cobro entrega PAYMENT_RECEIVED con el medio de pago, no con códigos de cuentas", async () => {
    espiar();
    const transferencia = await recordIncomeNow(conContabilidad, { amount: 50_000, method: "TRANSFER", description: "Abono", customerId }, "u");
    const efectivo = await recordIncomeNow(conContabilidad, { amount: 20_000, method: "CASH", description: "Abono efectivo", customerId }, "u");
    // Cada cobro también emite su propio documento (una venta); aquí interesan solo los hechos del cobro.
    expect(hechos.filter((h) => h.fact.event === "PAYMENT_RECEIVED").map((h) => [h.fact.event, h.fact.paymentMethod, h.fact.amounts.payment, h.fact.sourceType])).toEqual([
      ["PAYMENT_RECEIVED", "TRANSFER", 50_000, "PAYMENT"],
      ["PAYMENT_RECEIVED", "CASH", 20_000, "PAYMENT"],
    ]);
    expect(hechos.every((h) => !("swap" in h.fact))).toBe(true);
    // Finance resolvió Caja o Bancos: la transferencia debita Bancos (1110) y el efectivo, Caja (1105).
    const lineas = async (paymentId: string) => {
      const e = await db.orm.public.JournalEntry.where({ tenantId: conContabilidad, sourceType: "PAYMENT", sourceId: paymentId }).first();
      return (await db.orm.public.JournalLine.where({ tenantId: conContabilidad, entryId: e!.id }).all()).filter((l) => Number(l.debit) > 0).map((l) => l.accountCode);
    };
    expect(await lineas(transferencia.paymentId)).toEqual(["1110"]);
    expect(await lineas(efectivo.paymentId)).toEqual(["1105"]);
  });

  test("anular un pago o un documento pide la reversa de su origen", async () => {
    espiar();
    const pago = await recordIncomeNow(conContabilidad, { amount: 10_000, method: "CASH", description: "Para anular", customerId }, "u");
    await voidPayment(conContabilidad, pago.paymentId, "Error de digitación", "u");
    const d = await documento(conContabilidad, "2026-10-31T15:00:00Z");
    await voidInvoice(conContabilidad, d.id, "Duplicado");
    expect(reversas).toEqual([
      { sourceType: "PAYMENT", sourceId: pago.paymentId, reason: "Error de digitación" },
      { sourceType: "DOCUMENT", sourceId: d.id, reason: "Duplicado" },
    ]);
  });

  test("si Finance falla, Business se deshace: no queda documento ni se consume el número", async () => {
    // La numeración es por tipo de documento: se mira la de las cuentas de cobro (BILL).
    const antes = await db.orm.public.Invoice.where({ tenantId: conContabilidad }).all();
    const numeroAntes = Math.max(0, ...antes.filter((i) => i.kind === "BILL").map((i) => i.number));
    accountingPort.provide({ record: async () => { throw new Error("período cerrado (simulado)"); }, reverse: real.reverse });
    await expect(documento(conContabilidad, "2026-10-31T15:00:00Z")).rejects.toThrow("período cerrado (simulado)");
    accountingPort.provide(real);
    expect(await db.orm.public.Invoice.where({ tenantId: conContabilidad }).all()).toHaveLength(antes.length);
    const siguiente = await documento(conContabilidad, "2026-10-31T15:00:00Z");
    expect(siguiente.number).toBe(numeroAntes + 1); // el consecutivo no avanzó con el intento fallido
  });

  test("si Finance falla al cobrar, no queda pago ni recibo", async () => {
    const antes = await db.orm.public.Payment.where({ tenantId: conContabilidad }).all();
    accountingPort.provide({ record: async () => { throw new Error("contabilidad caída (simulado)"); }, reverse: real.reverse });
    await expect(recordIncomeNow(conContabilidad, { amount: 5_000, method: "CASH", description: "No debe quedar", customerId }, "u")).rejects.toThrow("contabilidad caída");
    accountingPort.provide(real);
    expect(await db.orm.public.Payment.where({ tenantId: conContabilidad }).all()).toHaveLength(antes.length);
  });

  test("un negocio sin contabilidad activa no genera asientos: publicar el hecho no obliga a asentarlo", async () => {
    espiar();
    await documento(sinContabilidad, "2026-10-31T15:00:00Z");
    expect(hechos).toHaveLength(1); // Business igual informa el hecho…
    expect(await asientos(sinContabilidad)).toHaveLength(0); // …y Finance decide no asentarlo.
  });

  test("sin el puerto conectado, emitir un documento falla de forma visible y no deja nada a medias", async () => {
    const globalHolder = globalThis as unknown as { [k: symbol]: { provided: Map<string, unknown> } };
    const registro = globalHolder[Symbol.for("nexus.ports")];
    const guardado = registro.provided.get("accounting");
    registro.provided.delete("accounting");
    const antes = await db.orm.public.Invoice.where({ tenantId: conContabilidad }).all();
    try {
      await expect(documento(conContabilidad, "2026-10-31T15:00:00Z")).rejects.toThrow(PortNotProvidedError);
      expect(await db.orm.public.Invoice.where({ tenantId: conContabilidad }).all()).toHaveLength(antes.length);
    } finally {
      registro.provided.set("accounting", guardado);
    }
  });
});
