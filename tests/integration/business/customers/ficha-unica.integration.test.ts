import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { commercialTimeline, mergeTimeline } from "@/lib/business/growth/commercial-timeline";
import { createOpportunity } from "@/lib/business/growth/opportunities-db";
import { createTask } from "@/lib/business/customers/tasks-db";
import { approveSalesQuote, createSalesQuote } from "@/lib/business/sales/sales-quotes-db";
import { createInvoice } from "@/lib/business/sales/invoices-db";

/** HU-customer360-01: el recorrido completo de un cliente en una sola línea de tiempo, sin mezclar negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("ficha única (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let camila = "";
  let other = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "Ficha A", slug: `fa-${suffix}`, vertical: "retail", modules: ["crm", "quotes"], tenantType: "COMPANY", ownerEmail: `fa-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "Ficha B", slug: `fb-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `fb-${suffix}@ejemplo.com` })).id);
    camila = (await db.orm.public.Customer.create({ tenantId: a, name: "Camila Torres", phone: "3001112233" })).id;
    other = (await db.orm.public.Customer.create({ tenantId: a, name: "Otra Persona" })).id;
    const productId = (await db.orm.public.Product.create({ tenantId: a, name: "Camiseta", price: "40000.00", kind: "PRODUCT", active: true, trackStock: false } as never)).id;
    await db.transaction((tx) => createOpportunity(tx, a, { customerId: camila, interest: "40 camisetas", estimatedValue: 1_600_000, nextAction: "Llamar" }));
    await createTask(a, { title: "Llamar a Camila", dueDay: "2026-11-09", customerId: camila }, "u");
    const quote = await createSalesQuote(a, { customerId: camila, title: "Camisetas", depositPct: 50, lines: [{ productId, quantity: 4, unitPrice: 40_000 }] }, "u");
    if (quote.ok) await approveSalesQuote(a, quote.id);
    await createInvoice(a, { kind: "BILL", customerId: camila, customerName: "Camila Torres", customerDoc: null, issueDate: "2026-11-01", dueDate: "2026-12-01", notes: null, lines: [{ description: "Servicio", quantity: 1, unitPrice: 300_000 }] }, "u");
    await createTask(a, { title: "De otra persona", customerId: other }, "u");
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("reúne oportunidades, cotizaciones, pedidos, tareas y documentos del cliente", async () => {
    const events = await commercialTimeline(a, camila);
    expect(new Set(events.map((e) => e.type))).toEqual(new Set(["opportunity", "quote", "order", "task", "document"]));
    expect(events.find((e) => e.type === "quote")).toMatchObject({ title: expect.stringContaining("COT-0001"), status: "Aprobada", amount: 160_000 });
    expect(events.find((e) => e.type === "order")).toMatchObject({ status: "Por pagar", description: "Nació de una cotización aprobada", amount: 160_000 });
    expect(events.find((e) => e.type === "opportunity")).toMatchObject({ amount: 1_600_000, status: "Nuevo" });
    expect(events.find((e) => e.type === "task")).toMatchObject({ title: "Tarea · Llamar a Camila", status: "Pendiente", description: "Para el 2026-11-09" });
    expect(events.find((e) => e.type === "document")).toMatchObject({ amount: 300_000, status: "Emitido" });
    expect(events.some((e) => e.title.includes("De otra persona"))).toBe(false);
  });

  test("se ordena del más reciente al más antiguo y se une con los eventos de la ficha", async () => {
    const commercial = await commercialTimeline(a, camila);
    const merged = mergeTimeline([{ id: "pago", type: "payment", date: "2099-01-01T00:00:00.000Z", title: "Cobro futuro" }, { id: "nota", type: "note", date: "2000-01-01T00:00:00.000Z", title: "Nota vieja" }], commercial);
    expect(merged[0]!.id).toBe("pago");
    expect(merged.at(-1)!.id).toBe("nota");
    expect([...merged].sort((x, y) => y.date.localeCompare(x.date))).toEqual(merged);
    expect(mergeTimeline(Array.from({ length: 200 }, (_, i) => ({ id: String(i), type: "note" as const, date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}T00:00:00.000Z`, title: "n" })))).toHaveLength(150);
  });

  test("otro negocio no ve nada, aunque pregunte por el mismo cliente", async () => {
    expect(await commercialTimeline(b, camila)).toEqual([]);
  });
});
