import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { captureFromForm, } from "@/lib/business/growth/lead-forms-db";
import { createLeadForm } from "@/lib/business/growth/lead-forms-db";
import { approveSalesQuote, createSalesQuote, sendSalesQuote } from "@/lib/business/sales/sales-quotes-db";
import { recordIncomeNow } from "@/lib/business/sales/money-service";
import { advanceOrder, orderHistory } from "@/lib/business/store/fulfillment-db";
import { listProduction, moveProduction } from "@/lib/business/store/production-db";
import { confirmDelivery, dispatchOrder } from "@/lib/business/store/delivery-db";
import { collectNotices } from "@/lib/integrations/channels/notices-db";
import { receivables } from "@/lib/domains/finance/receivables/receivables-db";
import { composePorts } from "@/lib/runtime/ports";

/**
 * HU-piloto-e2e-01: el recorrido completo de Commerce de punta a punta con la base real (Meta simulado, sin pasarela):
 * interesado → contacto → cotización → aprobación (pedido + anticipo/saldo) → cobro del anticipo → producción → listo →
 * envío → entrega, con historial y avisos al cliente. Lo que falla aquí es lo que el piloto no debe encontrar en vivo.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("piloto Commerce de punta a punta (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let productId = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    composePorts();
    a = String((await createAdminDb().createTenant({ name: "Piloto Estampados", slug: `pi-${suffix}`, vertical: "retail", modules: ["crm", "quotes", "receivables", "website"], tenantType: "COMPANY", ownerEmail: `pi-${suffix}@ejemplo.com` })).id);
    productId = (await db.orm.public.Product.create({ tenantId: a, name: "Camiseta estampada", price: "40000.00", kind: "PRODUCT", active: true, trackStock: false } as never)).id;
  });
  afterAll(async () => {
    if (a) await deleteTenantCompletely(a);
    await db.close();
  });

  test("del interesado a la entrega, con historial, cartera y avisos", async () => {
    // 1. El interesado llega por el formulario de la web del negocio.
    const form = await createLeadForm(a, { name: "Web", origins: ["https://estampados.example"] });
    if (!form.ok) throw new Error(form.message);
    const sent = await captureFromForm(form.form.publicKey, "https://estampados.example", "10.0.0.1", { name: "Camila Torres", phone: "300 111 2233", message: "Quiero 4 camisetas con mi logo", consent: true });
    expect(sent.status).toBe(200);
    const customer = await db.orm.public.Customer.where({ tenantId: a, phoneNorm: "573001112233" }).first();
    expect(customer, "el interesado quedó como contacto único").toBeTruthy();
    expect(await db.orm.public.Opportunity.where({ tenantId: a, customerId: customer!.id }).all()).toHaveLength(1);

    // 2. Cotización con anticipo del 50 %, enviada y aprobada: nace el pedido con dos obligaciones.
    const quote = await createSalesQuote(a, { customerId: customer!.id, title: "4 camisetas con logo", depositPct: 50, validUntil: null, lines: [{ productId, quantity: 4, unitPrice: 40_000 }] }, "ana");
    if (!quote.ok) throw new Error(quote.message);
    expect(await sendSalesQuote(a, quote.id)).toEqual({ ok: true });
    const approved = await approveSalesQuote(a, quote.id, "Camila");
    if (!approved.ok) throw new Error(approved.message);
    expect(approved).toMatchObject({ deposit: 80_000, balance: 80_000 });
    const orderId = approved.orderId;
    expect((await receivables(a)).rows.map((r) => r.balance).sort()).toEqual([80_000, 80_000]);

    // 3. Llega el anticipo: la cartera baja y el pedido se confirma.
    expect(await recordIncomeNow(a, { amount: 80_000, method: "TRANSFER", description: "Anticipo", customerId: customer!.id, sourceType: "STORE_ORDER", sourceId: orderId }, "ana")).toBeTruthy();
    expect((await receivables(a)).rows.map((r) => r.balance)).toEqual([80_000]);
    expect(await advanceOrder(a, orderId, "CONFIRMED", "ana")).toMatchObject({ ok: true });

    // 4. Producción: se fabrica y, al terminar, el pedido queda listo.
    expect(await advanceOrder(a, orderId, "IN_PRODUCTION", "ana")).toMatchObject({ ok: true });
    const [work] = (await listProduction(a)).filter((p) => p.orderId === orderId);
    expect(work).toMatchObject({ productName: "Camiseta estampada", quantity: 4 });
    await moveProduction(a, work!.id, "IN_PROGRESS", "luis");
    expect(await moveProduction(a, work!.id, "DONE", "luis")).toMatchObject({ ok: true, orderReady: true });

    // 5. Envío con guía y entrega confirmada.
    expect(await dispatchOrder(a, orderId, { method: "COURIER", carrier: "Servientrega", trackingCode: "SV123", scheduledFor: "2026-11-12" }, "ana")).toEqual({ ok: true });
    // Se entrega con el saldo pendiente: se avisa cuánto falta cobrar y se cobra contra entrega.
    expect(await confirmDelivery(a, orderId, "Camila", "ana")).toMatchObject({ ok: true, balanceDue: 80_000 });
    await recordIncomeNow(a, { amount: 80_000, method: "CASH", description: "Saldo contra entrega", customerId: customer!.id, sourceType: "STORE_ORDER", sourceId: orderId }, "ana");
    expect((await receivables(a)).rows).toHaveLength(0);
    expect((await db.orm.public.StoreOrder.where({ tenantId: a, id: orderId }).first())?.status).toBe("PAID");

    // 6. Todo quedó en el historial, en orden, con quién lo hizo.
    const history = await orderHistory(a, orderId);
    expect(history.map((h) => h.toStatus)).toEqual(["RECEIVED", "CONFIRMED", "IN_PRODUCTION", "READY", "SHIPPED", "DELIVERED"]);
    expect(history.find((h) => h.toStatus === "READY")).toMatchObject({ note: "Producción terminada" });

    // 7. El cliente recibió avisos de confirmado, listo, enviado y entregado (y ninguno de «en producción»).
    await collectNotices(a);
    const events = (await db.orm.public.WhatsappNotice.where({ tenantId: a }).all()).map((n) => n.event).sort();
    expect(events).toEqual(expect.arrayContaining(["order.confirmed", "order.delivered", "order.ready", "order.shipped"]));
    expect(events).not.toContain("order.status_changed");
  });
});
