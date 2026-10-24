import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { createDocument } from "@/lib/business/documents-db";
import { recordIncomeNow, voidPayment } from "@/lib/business/money-service";
import { moneyTransaction } from "@/lib/business/money-service";
import { applyStockMovement } from "@/lib/inventory/stock-service";
import { sellCart, openTurn, createTerminal } from "@/lib/pos/pos-db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { closePeriod } from "./accounting-db";
import { listEntries, postEntry, setAccountingEnabled, verifyLedger } from "./ledger-db";

/** Libro mayor contra Postgres real y DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");
const today = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);

describe.skipIf(!TEST_URL)("libro mayor y asientos automáticos (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  const balanceOf = async (tenantId: string, code: string) => (await db.orm.public.JournalLine.where({ tenantId, accountCode: code }).all()).reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "retail", modules: ["finance", "inventory"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Empresa A", `lg-a-${suffix}`)).id);
    b = String((await make("Empresa B", `lg-b-${suffix}`)).id);
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("sin contabilidad activa no se escribe ningún asiento", async () => {
    await createDocument(a, { kind: "BILL", customerId: null, customerName: "X", lines: [{ description: "Algo", quantity: 1, unitPrice: 1000 }] }, null);
    expect(await listEntries(a)).toEqual([]);
    expect(await setAccountingEnabled(b, true)).toEqual({ ok: true });
    await setAccountingEnabled(b, false);
  });

  test("venta con IVA, costo y cobro: asientos cuadrados, trazables, con las cuentas correctas", async () => {
    expect(await setAccountingEnabled(a, true)).toEqual({ ok: true });
    const product = (await db.orm.public.Product.create({ tenantId: a, name: "Camiseta", price: "100000.00", trackStock: true, stock: 0, taxCategory: "GRAVADO", taxRatePct: "19.00" })).id;
    await moneyTransaction((tx) => applyStockMovement(tx, a, { productId: product, kind: "IN", quantity: 10, unitCost: 40_000 }));
    const t = await createTerminal(a, "Caja", null);
    if (!t.ok) throw new Error(t.message);
    await openTurn(a, t.id, 0, "cajero");
    const sale = await sellCart(a, { lines: [{ productId: product, quantity: 2 }], payments: [{ method: "TRANSFER", amount: 238_000 }] }, "cajero");
    expect(sale).toMatchObject({ ok: true, total: 238_000 });
    const entries = await listEntries(a);
    const by = (event: string) => entries.find((e) => e.event === event)!;
    // Venta: D clientes 238.000 | C ingreso 200.000 + IVA 38.000
    expect(by("SALE").lines.map((l) => [l.account, l.debit, l.credit])).toEqual(expect.arrayContaining([["1305", 238_000, 0], ["4135", 0, 200_000], ["2408", 0, 38_000]]));
    // Costo: 2 × 40.000 = 80.000
    expect(by("SALE_COST").lines.map((l) => [l.account, l.debit, l.credit])).toEqual(expect.arrayContaining([["6135", 80_000, 0], ["1435", 0, 80_000]]));
    // Cobro por transferencia entra a BANCOS (1110), no a caja
    expect(by("PAYMENT_RECEIVED").lines.map((l) => [l.account, l.debit, l.credit])).toEqual(expect.arrayContaining([["1110", 238_000, 0], ["1305", 0, 238_000]]));
    // Saldos: clientes quedó en cero, ingresos 200.000, IVA 38.000, banco 238.000
    expect(await balanceOf(a, "1305")).toBe(0);
    expect(await balanceOf(a, "4135")).toBe(-200_000);
    expect(await balanceOf(a, "1110")).toBe(238_000);
    // Todo el libro cuadra y la cadena de sellos es válida
    const sum = (await db.orm.public.JournalLine.where({ tenantId: a }).all()).reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
    expect(sum).toBe(0);
    expect(await verifyLedger(a)).toMatchObject({ ok: true });
    // Trazable: cada asiento apunta a su origen
    expect(entries.every((e) => e.number > 0)).toBe(true);
    expect((await db.orm.public.JournalEntry.where({ tenantId: a, event: "SALE" }).first())!.sourceType).toBe("DOCUMENT");
  });

  test("anular un cobro lo reversa con otro asiento (el original no se toca) y el libro sigue cuadrando", async () => {
    const inc = await recordIncomeNow(a, { amount: 50_000, method: "CASH", description: "Cobro suelto", sourceType: "OTHER", sourceId: "x" }, "u");
    const before = await balanceOf(a, "1105");
    expect(await voidPayment(a, inc.paymentId, "Error de digitación", "u")).toMatchObject({ ok: true });
    const entries = await db.orm.public.JournalEntry.where({ tenantId: a, sourceType: "PAYMENT", sourceId: inc.paymentId }).all();
    expect(entries.map((e) => e.event).sort()).toEqual(["PAYMENT_RECEIVED", "REVERSAL"]);
    const rev = entries.find((e) => e.event === "REVERSAL")!;
    expect(rev.reversalOfId).toBe(entries.find((e) => e.event === "PAYMENT_RECEIVED")!.id);
    expect(await balanceOf(a, "1105")).toBe(before - 50_000);
    expect(await verifyLedger(a)).toMatchObject({ ok: true });
  });

  test("un asiento manual descuadrado, con una cuenta que solo agrupa o inexistente, se rechaza", async () => {
    const tx = async <T,>(fn: (t: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>) => db.transaction(fn);
    const date = today();
    await expect(tx((t) => postEntry(t, a, { date, description: "x", event: "MANUAL", sourceType: "MANUAL", lines: [{ account: "1105", debit: 100, credit: 0 }, { account: "4135", debit: 0, credit: 90 }] }, "u"))).rejects.toThrow(/no cuadra/);
    await expect(tx((t) => postEntry(t, a, { date, description: "x", event: "MANUAL", sourceType: "MANUAL", lines: [{ account: "11", debit: 100, credit: 0 }, { account: "4135", debit: 0, credit: 100 }] }, "u"))).rejects.toThrow(/solo agrupa|no existe/);
    await expect(tx((t) => postEntry(t, a, { date, description: "x", event: "MANUAL", sourceType: "MANUAL", lines: [{ account: "9999", debit: 100, credit: 0 }, { account: "4135", debit: 0, credit: 100 }] }, "u"))).rejects.toThrow(/no existe/);
    await expect(tx((t) => postEntry(t, b, { date, description: "x", event: "MANUAL", sourceType: "MANUAL", lines: [{ account: "1105", debit: 100, credit: 0 }, { account: "4135", debit: 0, credit: 100 }] }, "u"))).resolves.toMatchObject({ number: 1 });
  });

  test("cerrar el mes bloquea: no se contabiliza ni se anula en un mes cerrado", async () => {
    // Una cuenta de cobro de agosto ya contabilizada; se cierra agosto y septiembre.
    const aug = await db.transaction((t) => postEntry(t, a, { date: "2026-08-15", description: "Venta de agosto", event: "MANUAL", sourceType: "MANUAL", sourceId: "aug", lines: [{ account: "1105", debit: 10, credit: 0 }, { account: "4135", debit: 0, credit: 10 }] }, "u"));
    expect(aug.number).toBeGreaterThan(0);
    expect(await closePeriod(a, 2026, 8, "u", "2026-10-24")).toEqual({ ok: true });
    await expect(db.transaction((t) => postEntry(t, a, { date: "2026-08-20", description: "Tarde", event: "MANUAL", sourceType: "MANUAL", lines: [{ account: "1105", debit: 5, credit: 0 }, { account: "4135", debit: 0, credit: 5 }] }, "u"))).rejects.toThrow(/cerrado/);
    // Una venta con fecha de emisión en el mes cerrado falla completa (no deja el documento a medias).
    const before = await db.orm.public.Invoice.where({ tenantId: a, kind: "BILL" }).all();
    await expect(createDocument(a, { kind: "BILL", customerId: null, customerName: "Tarde", issueDate: Temporal.Instant.from("2026-08-20T12:00:00Z"), lines: [{ description: "Algo", quantity: 1, unitPrice: 1000 }] }, null)).rejects.toThrow(/cerrado/);
    expect((await db.orm.public.Invoice.where({ tenantId: a, kind: "BILL" }).all()).length).toBe(before.length);
  });

  test("el libro es inalterable: tocar un valor o el orden se detecta; y el otro negocio no ve nada", async () => {
    expect(await verifyLedger(a)).toMatchObject({ ok: true });
    const line = await db.orm.public.JournalLine.where({ tenantId: a, accountCode: "4135" }).first();
    await db.orm.public.JournalLine.where({ tenantId: a, id: line!.id }).update({ credit: (Number(line!.credit) + 1).toFixed(2) });
    expect(await verifyLedger(a)).toMatchObject({ ok: false, reason: expect.stringMatching(/no cuadra|alterado/) });
    expect(await verifyLedger(b)).toMatchObject({ ok: true, checked: 1 });
    expect((await listEntries(b)).length).toBe(1);
  });
});
