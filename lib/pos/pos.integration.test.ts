import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { moneyTransaction } from "@/lib/business/money-service";
import { applyStockMovement } from "@/lib/inventory/stock-service";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { closeTurn, createTerminal, listTerminals, myTurn, openTurn, sellCart } from "./pos-db";

/** Punto de venta contra Postgres real y DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("punto de venta (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let terminalId = "";
  const prods: string[] = [];
  const product = async (tenantId: string, name: string, price: number, extra: Record<string, unknown> = {}) => (await db.orm.public.Product.create({ tenantId, name, price: price.toFixed(2), trackStock: true, stock: 0, ...extra })).id;

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "retail", modules: ["inventory", "finance"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Tienda A", `pos-a-${suffix}`)).id);
    b = String((await make("Tienda B", `pos-b-${suffix}`)).id);
    for (const [n, p] of [["Proteína", 100_000], ["Barra", 5_000], ["Shaker", 20_000], ["Creatina", 80_000], ["Agua", 3_000]] as const) {
      const id = await product(a, n, p, n === "Proteína" ? { taxCategory: "GRAVADO", taxRatePct: "19.00" } : {});
      prods.push(id);
      await moneyTransaction((tx) => applyStockMovement(tx, a, { productId: id, kind: "IN", quantity: 20, unitCost: p / 2 }));
    }
    const t = await createTerminal(a, "Mostrador", null);
    if (!t.ok) throw new Error(t.message);
    terminalId = t.id;
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("sin turno no se vende; un cajero abre un solo turno y la terminal uno por vez", async () => {
    expect(await sellCart(a, { lines: [{ productId: prods[0]!, quantity: 1 }], payments: [{ method: "CASH", amount: 999_999 }] }, "cajero1")).toMatchObject({ ok: false, message: expect.stringContaining("Abre tu turno") });
    expect(await openTurn(a, terminalId, 50_000, "cajero1")).toMatchObject({ ok: true });
    expect(await openTurn(a, terminalId, 0, "cajero1")).toMatchObject({ ok: false, message: expect.stringContaining("Ya tienes un turno") });
    expect(await openTurn(a, terminalId, 0, "cajero2")).toMatchObject({ ok: false, message: expect.stringContaining("otra persona") });
    expect((await listTerminals(a))[0]!.openTurn).toMatchObject({ cashierId: "cajero1", openingAmount: 50_000 });
    expect(await openTurn(b, terminalId, 0, "cajero3")).toMatchObject({ ok: false }); // la terminal es de otro negocio
  });

  test("5 líneas con descuento, propina y efectivo + Nequi: un documento, descuenta stock y cuadra el arqueo", async () => {
    const r = await sellCart(a, {
      lines: [{ productId: prods[0]!, quantity: 2, discountPct: 10 }, { productId: prods[1]!, quantity: 3 }, { productId: prods[2]!, quantity: 1 }, { productId: prods[3]!, quantity: 1 }, { productId: prods[4]!, quantity: 4 }],
      tip: { fixed: 5_000 },
      payments: [{ method: "NEQUI", amount: 200_000 }, { method: "CASH", amount: 200_000 }],
    }, "cajero1");
    // 2×100.000−10 % = 180.000 (+19 % = 214.200) + 15.000 + 20.000 + 80.000 + 12.000 = 341.200; + propina 5.000 = 346.200
    expect(r).toMatchObject({ ok: true, total: 341_200, tip: 5_000, change: 53_800 });
    if (!r.ok) return;
    const doc = await db.orm.public.Invoice.where({ tenantId: a, id: r.documentId }).first();
    expect(doc).toMatchObject({ kind: "SALE", status: "PAID" });
    expect(Number(doc!.total)).toBe(341_200);
    expect(Number(doc!.tipTotal)).toBe(5_000);
    expect((await db.orm.public.Invoice.where({ tenantId: a, kind: "SALE" }).all()).length).toBe(1); // un solo documento, no uno por pago
    const pays = await db.orm.public.Payment.where({ tenantId: a, sourceType: "POS" }).all();
    expect(pays.map((p) => `${p.provider}:${Number(p.amount)}`).sort()).toEqual(["CASH:146200", "NEQUI:200000"]);
    const stocks = await Promise.all(prods.map(async (id) => (await db.orm.public.Product.where({ tenantId: a, id }).first())!.stock));
    expect(stocks).toEqual([18, 17, 19, 19, 16]);
    // Arqueo: apertura 50.000 + efectivo 146.200 = 196.200; se cuentan 196.000 → faltan 200.
    const turn = (await myTurn(a, "cajero1"))!;
    expect(await closeTurn(a, turn.sessionId, 196_000, null, "cajero2")).toMatchObject({ ok: false, message: expect.stringContaining("Solo quien abrió") });
    expect(await closeTurn(a, turn.sessionId, 196_000, null, "cajero1")).toMatchObject({ ok: true, expected: 196_200, difference: -200 });
    expect(await myTurn(a, "cajero1")).toBeNull();
  });

  test("el precio sale de la base, el descuento alto pide autorización, no se vende más de lo que hay y no se mezcla un negocio con otro", async () => {
    await openTurn(a, terminalId, 0, "cajero1");
    expect(await sellCart(a, { lines: [{ productId: prods[1]!, quantity: 1, discountPct: 50 }], payments: [{ method: "CASH", amount: 5000 }] }, "cajero1")).toMatchObject({ ok: false, message: expect.stringContaining("autoriza") });
    expect(await sellCart(a, { lines: [{ productId: prods[1]!, quantity: 1, discountPct: 50 }], payments: [{ method: "CASH", amount: 2500 }] }, "cajero1", { canDiscountOver: true })).toMatchObject({ ok: true, total: 2500 });
    expect(await sellCart(a, { lines: [{ productId: prods[1]!, quantity: 500 }], payments: [{ method: "CASH", amount: 9_999_999 }] }, "cajero1")).toMatchObject({ ok: false });
    expect((await db.orm.public.Product.where({ tenantId: a, id: prods[1]! }).first())!.stock).toBe(16); // la venta fallida no descontó nada
    const foreign = await product(b, "Ajeno", 1000);
    expect(await sellCart(a, { lines: [{ productId: foreign, quantity: 1 }], payments: [{ method: "CASH", amount: 1000 }] }, "cajero1")).toMatchObject({ ok: false, message: expect.stringContaining("ya no está disponible") });
    expect(await sellCart(a, { lines: [{ productId: prods[1]!, quantity: 1 }], payments: [{ method: "NEQUI", amount: 100 }] }, "cajero1")).toMatchObject({ ok: false, message: expect.stringContaining("Faltan") });
  });
});
