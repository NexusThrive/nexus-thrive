/**
 * La fecha de un documento comercial es el DÍA DE NEGOCIO EN COLOMBIA (Bogotá, UTC−5).
 *
 * Antes, el asiento contable, el documento fiscal en cola y la vista del documento usaban el
 * día UTC del instante (`slice(0, 10)`): entre las 19:00 y las 24:00 de Bogotá el documento
 * quedaba con la fecha del día siguiente. Estas pruebas fijan instantes concretos, así que
 * NO dependen de la hora a la que se ejecuten.
 */
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { setAccountingEnabled } from "@/lib/domains/finance/accounting/ledger-db";
import { createDocument, documentView } from "@/lib/business/sales/documents-db";
import { listInvoices } from "@/lib/business/sales/invoices-db";
import { setFiscalEnabled } from "@/lib/integrations/einvoice/einvoice-db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";

const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

// [descripción, instante UTC, día de Bogotá esperado]
const CASOS: [string, string, string][] = [
  ["23:59:59 de Bogotá (un segundo antes de medianoche)", "2026-10-31T04:59:59Z", "2026-10-30"],
  ["00:00:00 de Bogotá (medianoche exacta)", "2026-10-31T05:00:00Z", "2026-10-31"],
  ["19:00 de Bogotá: la medianoche UTC, inicio de la franja del defecto", "2026-10-31T00:00:00Z", "2026-10-30"],
  ["último segundo de octubre en Bogotá (cambio de mes)", "2026-11-01T04:59:59Z", "2026-10-31"],
  ["primer instante de noviembre en Bogotá (cambio de mes)", "2026-11-01T05:00:00Z", "2026-11-01"],
  ["31 de diciembre a las 22:00 de Bogotá (cambio de año)", "2026-01-01T03:00:00Z", "2025-12-31"],
  ["fecha escrita a mano: se guarda a las 12:00 UTC (07:00 de Bogotá)", "2026-10-31T12:00:00Z", "2026-10-31"],
];

describe.skipIf(!TEST_URL)("fecha de los documentos comerciales (integración)", () => {
  const suffix = Date.now().toString(36);
  let tenantId = "";
  let customerId = "";
  const documentos = new Map<string, string>(); // instante -> id

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    tenantId = String(
      (await createAdminDb().createTenant({ name: "Fechas Bogotá", slug: `fecha-bog-${suffix}`, vertical: "retail", modules: ["finance"], tenantType: "COMPANY", ownerEmail: `fecha-bog-${suffix}@ejemplo.com` })).id,
    );
    await setAccountingEnabled(tenantId, true);
    await setFiscalEnabled(tenantId, true);
    customerId = (await db.orm.public.Customer.create({ tenantId, name: "Cliente fecha" })).id;
    for (const [, iso] of CASOS) {
      const doc = await createDocument(tenantId, { kind: "BILL", customerId, customerName: "Cliente fecha", issueDate: Temporal.Instant.from(iso), lines: [{ description: "Servicio", quantity: 1, unitPrice: 100_000, taxRatePct: 19 }] }, null);
      documentos.set(iso, doc.id);
    }
  });

  afterAll(async () => {
    if (tenantId) await deleteTenantCompletely(tenantId);
  });

  test.each(CASOS)("%s", async (_nombre, iso, esperado) => {
    const id = documentos.get(iso)!;
    // 1. El asiento contable queda con el día de Bogotá.
    const asiento = await db.orm.public.JournalEntry.where({ tenantId, sourceType: "DOCUMENT", sourceId: id }).first();
    expect(asiento?.date, "asiento contable").toBe(esperado);
    // 2. El documento fiscal en cola lleva el mismo día.
    const fiscal = await db.orm.public.FiscalDocument.where({ tenantId, invoiceId: id }).first();
    expect((fiscal?.payload as { issueDate: string }).issueDate, "documento fiscal").toBe(esperado);
    // 3. El detalle y la lista muestran el mismo día.
    expect((await documentView(tenantId, id))?.issueDate, "vista del documento").toBe(esperado);
    expect((await listInvoices(tenantId)).find((r) => r.id === id)?.issueDate, "lista de documentos").toBe(esperado);
  });

  test("el asiento queda dentro del mes y del año de Bogotá, no del de UTC", async () => {
    const ultimoDeOctubre = documentos.get("2026-11-01T04:59:59Z")!;
    const asiento = await db.orm.public.JournalEntry.where({ tenantId, sourceType: "DOCUMENT", sourceId: ultimoDeOctubre }).first();
    expect(asiento?.date.startsWith("2026-10")).toBe(true); // con el defecto habría caído en noviembre
    const finDeAnio = documentos.get("2026-01-01T03:00:00Z")!;
    const delAnioAnterior = await db.orm.public.JournalEntry.where({ tenantId, sourceType: "DOCUMENT", sourceId: finDeAnio }).first();
    expect(delAnioAnterior?.date.startsWith("2025-")).toBe(true);
  });

  test("la numeración sigue usando el día de Bogotá, como antes", async () => {
    // El número se asigna con todayCO(issueDate); la fecha del asiento y la de numeración coinciden.
    const id = documentos.get("2026-10-31T00:00:00Z")!;
    const inv = await db.orm.public.Invoice.where({ tenantId, id }).first();
    const asiento = await db.orm.public.JournalEntry.where({ tenantId, sourceType: "DOCUMENT", sourceId: id }).first();
    expect(inv?.number).toBeGreaterThan(0);
    expect(asiento?.date).toBe("2026-10-30");
  });
});
