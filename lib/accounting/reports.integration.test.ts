import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { createDocument } from "@/lib/business/documents-db";
import { recordIncomeNow } from "@/lib/business/money-service";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { setAccountingEnabled } from "./ledger-db";
import { buildReport, ledgerRows, reportCsv } from "./reports-db";

/** Informes contables sobre el libro real, con DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");
const today = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);

describe.skipIf(!TEST_URL)("informes contables (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "retail", modules: ["finance"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Empresa A", `rp-a-${suffix}`)).id);
    b = String((await make("Empresa B", `rp-b-${suffix}`)).id);
    await setAccountingEnabled(a, true);
    await setAccountingEnabled(b, true);
    const party = await db.orm.public.Party.create({ tenantId: a, legalName: "Gimnasio Atlas", documentNumber: "9005", kind: "COMPANY" });
    const customer = await db.orm.public.Customer.create({ tenantId: a, name: "Gimnasio Atlas", partyId: party.id });
    // Cuenta de cobro de 1.190.000 (IVA 19 %) y un abono de 400.000 por transferencia.
    const bill = await createDocument(a, { kind: "BILL", customerId: customer.id, customerName: "Gimnasio Atlas", lines: [{ description: "Asesoría", quantity: 1, unitPrice: 1_000_000, taxRatePct: 19 }] }, null);
    await recordIncomeNow(a, { amount: 400_000, method: "TRANSFER", description: "Abono", customerId: customer.id, invoiceId: bill.id, sourceType: "INVOICE", sourceId: bill.id }, "u");
    await createDocument(b, { kind: "BILL", customerId: null, customerName: "Otro", lines: [{ description: "Algo", quantity: 1, unitPrice: 5_000 }] }, null);
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("el balance de prueba del libro real cuadra y el balance general también", async () => {
    const rows = await ledgerRows(a, "2000-01-01", "2999-12-31");
    const tb = buildReport("trial", rows, "");
    expect(tb.kind === "trial" && tb.data.balanced).toBe(true);
    const get = (c: string) => (tb.kind === "trial" ? tb.data.rows.find((r) => r.account === c) : undefined);
    expect(get("1305")).toMatchObject({ balanceDebit: 790_000 }); // 1.190.000 − 400.000
    expect(get("1110")).toMatchObject({ balanceDebit: 400_000 }); // transferencia → bancos
    expect(get("4135")).toMatchObject({ balanceCredit: 1_000_000 });
    expect(get("2408")).toMatchObject({ balanceCredit: 190_000 });
    const is = buildReport("income", rows, "");
    expect(is.kind === "income" && is.data.netResult).toBe(1_000_000);
    const bs = buildReport("balance", rows, "");
    expect(bs.kind === "balance" && bs.data).toMatchObject({ totalAssets: 1_190_000, totalLiabilities: 190_000, totalEquity: 1_000_000, balanced: true });
  });

  test("auxiliar por tercero y libro mayor traen al tercero; el rango de fechas filtra", async () => {
    const rows = await ledgerRows(a, "2000-01-01", "2999-12-31");
    const aux = buildReport("auxiliary", rows, "1305");
    expect(aux.kind === "auxiliary" && aux.data).toEqual([{ party: "Gimnasio Atlas", doc: "9005", debit: 1_190_000, credit: 400_000, balance: 790_000 }]);
    const mayor = buildReport("ledger", rows, "1305");
    expect(mayor.kind === "ledger" && mayor.data.balance).toBe(790_000);
    expect(await ledgerRows(a, "2000-01-01", "2000-12-31")).toEqual([]);
    expect((await ledgerRows(a, today(), today())).length).toBe(rows.length);
  });

  test("los CSV para el contador salen con sus datos y no mezclan negocios", async () => {
    const rows = await ledgerRows(a, "2000-01-01", "2999-12-31");
    const diario = reportCsv("journal", rows, "");
    expect(diario).toContain("Gimnasio Atlas");
    expect(diario.split("\r\n")[0]).toBe("﻿Fecha,Comprobante,Cuenta,Nombre de la cuenta,Documento tercero,Tercero,Centro de costo,Descripción,Débito,Crédito");
    expect(reportCsv("trial", rows, "")).toContain("TOTALES");
    expect(reportCsv("ledger", rows, "2408").split("\r\n").filter(Boolean).length).toBe(2); // encabezado + la línea del IVA
    const delOtro = await ledgerRows(b, "2000-01-01", "2999-12-31");
    expect(reportCsv("journal", delOtro, "")).not.toContain("Gimnasio Atlas");
    expect(delOtro.every((r) => r.entryNumber >= 1)).toBe(true);
  });
});
