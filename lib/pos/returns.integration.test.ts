import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { moneyTransaction } from "@/lib/business/money-service";
import { applyStockMovement } from "@/lib/inventory/stock-service";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { closeTurn, createTerminal, myTurn, openTurn, sellCart } from "./pos-db";
import { returnSale, saleForReturn } from "./returns-db";

/** Devoluciones del punto de venta contra Postgres real y DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("devoluciones del punto de venta (integración)", () => {
  const suffix = `r${Date.now().toString(36)}`;
  let a = "";
  let b = "";
  let p1 = "";
  let p2 = "";
  let saleId = "";
  let saleNumber = 0;

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "retail", modules: ["inventory", "finance"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Tienda A", `rt-a-${suffix}`)).id);
    b = String((await make("Tienda B", `rt-b-${suffix}`)).id);
    const mk = async (name: string, price: number) => {
      const id = (await db.orm.public.Product.create({ tenantId: a, name, price: price.toFixed(2), trackStock: true, stock: 0 })).id;
      await moneyTransaction((tx) => applyStockMovement(tx, a, { productId: id, kind: "IN", quantity: 10, unitCost: price / 2 }));
      return id;
    };
    p1 = await mk("Camiseta", 40_000);
    p2 = await mk("Gorra", 25_000);
    const t = await createTerminal(a, "Caja", null);
    if (!t.ok) throw new Error(t.message);
    await openTurn(a, t.id, 100_000, "cajero1");
    const s = await sellCart(a, { lines: [{ productId: p1, quantity: 3 }, { productId: p2, quantity: 2 }], payments: [{ method: "CASH", amount: 170_000 }] }, "cajero1");
    if (!s.ok) throw new Error(s.message);
    saleId = s.documentId;
    saleNumber = s.number;
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  const stock = async (id: string) => (await db.orm.public.Product.where({ tenantId: a, id }).first())!.stock;

  test("devolución parcial: nota crédito, reingreso al costo, reembolso de caja y tope por lo vendido", async () => {
    expect(await stock(p1)).toBe(7);
    const r = await returnSale(a, { documentId: saleId, lines: [{ productId: p1, quantity: 1 }], reason: "Talla equivocada", refundMethod: "CASH" }, "cajero1");
    expect(r).toMatchObject({ ok: true, refund: 40_000 });
    expect(await stock(p1)).toBe(8);
    const note = await db.orm.public.Invoice.where({ tenantId: a, kind: "CREDIT_NOTE" }).first();
    expect(note).toMatchObject({ sourceDocumentId: saleId, status: "ISSUED" });
    // El reingreso entra al costo con que salió (20.000), no a otro.
    const back = await db.orm.public.StockMovement.where({ tenantId: a, documentType: "CREDIT_NOTE" }).first();
    expect(Number(back!.unitCost)).toBe(20_000);
    const info = await saleForReturn(a, saleNumber);
    expect(info!.lines.find((l) => l.productId === p1)).toMatchObject({ sold: 3, returned: 1, remaining: 2 });
    expect(await returnSale(a, { documentId: saleId, lines: [{ productId: p1, quantity: 3 }], reason: "Otra", refundMethod: "CASH" }, "cajero1")).toMatchObject({ ok: false, message: expect.stringContaining("solo se pueden devolver 2") });
    // Caja: apertura 100.000 + venta 170.000 − reembolso 40.000 = 230.000.
    const turn = (await myTurn(a, "cajero1"))!;
    expect(await closeTurn(a, turn.sessionId, 230_000, null, "cajero1")).toMatchObject({ ok: true, expected: 230_000, difference: 0 });
  });

  test("sin turno no se devuelve efectivo, el motivo es obligatorio y otro negocio no ve la venta", async () => {
    expect(await returnSale(a, { documentId: saleId, lines: [{ productId: p2, quantity: 1 }], reason: "Defecto", refundMethod: "CASH" }, "cajero1")).toMatchObject({ ok: false, message: expect.stringContaining("Abre tu turno") });
    expect(await returnSale(a, { documentId: saleId, lines: [{ productId: p2, quantity: 1 }], reason: "x", refundMethod: "TRANSFER" }, "cajero1")).toMatchObject({ ok: false, message: expect.stringContaining("motivo") });
    expect(await returnSale(a, { documentId: saleId, lines: [{ productId: p2, quantity: 1 }], reason: "Defecto", refundMethod: "TRANSFER" }, "cajero1")).toMatchObject({ ok: true, refund: 25_000 });
    expect(await returnSale(b, { documentId: saleId, lines: [{ productId: p2, quantity: 1 }], reason: "Defecto", refundMethod: "TRANSFER" }, "x")).toMatchObject({ ok: false });
    expect(await saleForReturn(b, saleNumber)).toBeNull();
    expect(await stock(p2)).toBe(9);
  });
});
