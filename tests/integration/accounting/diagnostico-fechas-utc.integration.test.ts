/**
 * docs/diagnostico/2026-10-31-fechas-utc-documentos.sql: diagnóstico de SOLO LECTURA.
 *
 * Con el código corregido ya no se generan asientos fechados en UTC, así que aquí se SIMULA
 * el daño histórico sobre la base desechable (se reescribe la fecha de algunos asientos con
 * el día UTC, como lo hacía el defecto) y se comprueba que el SQL los encuentra, los
 * clasifica y sugiere un tratamiento, sin modificar nada.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { setAccountingEnabled } from "@/lib/domains/finance/accounting/ledger-db";
import { createDocument } from "@/lib/business/sales/documents-db";
import { setFiscalEnabled } from "@/lib/integrations/einvoice/einvoice-db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";

const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");
const SQL_FILE = join(import.meta.dirname, "..", "..", "..", "docs", "diagnostico", "2026-10-31-fechas-utc-documentos.sql");
const SEP = "\u001f";

type Fila = Record<string, string>;

/** Ejecuta el SQL con psql y devuelve las filas de cada sección (títulos «== N. … ==»). */
function ejecutarDiagnostico(): { resumen: Fila[]; detalle: Fila[]; fiscal: Fila[]; salida: string } {
  const r = spawnSync("psql", [TEST_URL!, "-X", "-q", "-A", "-F", SEP, "-v", "ON_ERROR_STOP=1", "-f", SQL_FILE], { encoding: "utf8" });
  expect(r.status, r.stderr).toBe(0);
  const secciones: string[][] = [];
  for (const linea of r.stdout.split("\n")) {
    if (linea.startsWith("== ")) secciones.push([]);
    else if (secciones.length && linea.trim() && !/^\(\d+ rows?\)$/.test(linea)) secciones[secciones.length - 1].push(linea);
  }
  const aFilas = (lineas: string[]): Fila[] => {
    if (!lineas.length) return [];
    const cab = lineas[0].split(SEP);
    return lineas.slice(1).map((l) => Object.fromEntries(l.split(SEP).map((v, i) => [cab[i], v])));
  };
  return { resumen: aFilas(secciones[0] ?? []), detalle: aFilas(secciones[1] ?? []), fiscal: aFilas(secciones[2] ?? []), salida: r.stdout };
}

describe("el archivo SQL de diagnóstico", () => {
  const sql = readFileSync(SQL_FILE, "utf8");
  const sinComentarios = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");

  test("no contiene ninguna sentencia de escritura ni de definición", () => {
    expect(sinComentarios).not.toMatch(/\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|CREATE|GRANT|REVOKE|COPY)\b/i);
  });

  test("corre dentro de una transacción de solo lectura que termina en ROLLBACK", () => {
    expect(sinComentarios).toMatch(/BEGIN READ ONLY;/);
    expect(sinComentarios.trim().endsWith("ROLLBACK;")).toBe(true);
    expect(sql).not.toMatch(/COMMIT/i);
  });

  test("no vive en docs/prod-sql: no es una migración", () => {
    expect(SQL_FILE).not.toContain("prod-sql");
  });
});

describe.skipIf(!TEST_URL)("el diagnóstico sobre datos simulados (integración)", () => {
  const suffix = Date.now().toString(36);
  const slug = `diag-fecha-${suffix}`;
  let tenantId = "";
  const ids: Record<string, string> = {};

  const documento = async (clave: string, iso: string, extra: { status?: "ISSUED" | "PAID" | "VOID" } = {}) => {
    const d = await createDocument(
      tenantId,
      { kind: "BILL", customerId: null, customerName: "Cliente", issueDate: Temporal.Instant.from(iso), status: extra.status, lines: [{ description: "Servicio", quantity: 1, unitPrice: 100_000, taxRatePct: 19 }] },
      null,
    );
    ids[clave] = d.id;
  };
  /** Simula el defecto: deja en el asiento el día UTC en lugar del de Bogotá. */
  const simularDefecto = async (clave: string, fecha: string) => {
    await db.orm.public.JournalEntry.where({ tenantId, sourceType: "DOCUMENT", sourceId: ids[clave] }).update({ date: fecha });
  };

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    tenantId = String((await createAdminDb().createTenant({ name: "Diagnóstico fechas", slug, vertical: "retail", modules: ["finance"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` })).id);
    await setAccountingEnabled(tenantId, true);
    await setFiscalEnabled(tenantId, true);

    await documento("mismoMes", "2026-10-31T01:00:00Z"); //     Bogotá 30-oct 20:00, UTC 31-oct
    await documento("cruzaMesCerrado", "2026-11-01T03:00:00Z"); // Bogotá 31-oct 22:00, UTC 01-nov
    await documento("cruzaAnio", "2026-01-01T03:00:00Z"); //     Bogotá 31-dic-2025 22:00, UTC 01-ene-2026
    await documento("anulado", "2026-10-31T02:00:00Z", { status: "VOID" });
    await documento("fiscalAceptado", "2026-10-31T03:00:00Z");
    await documento("otraCausa", "2026-10-31T01:30:00Z");
    await documento("correcto", "2026-10-31T13:00:00Z"); //      13:00 UTC = 08:00 Bogotá: mismo día en ambos

    await simularDefecto("mismoMes", "2026-10-31");
    await simularDefecto("cruzaMesCerrado", "2026-11-01");
    await simularDefecto("cruzaAnio", "2026-01-01");
    await simularDefecto("anulado", "2026-10-31");
    await simularDefecto("fiscalAceptado", "2026-10-31");
    await simularDefecto("otraCausa", "2026-09-15"); // ni el día UTC ni el de Bogotá

    // Octubre 2026 cerrado; el documento fiscal de «fiscalAceptado» aceptado con la fecha UTC.
    await db.orm.public.AccountingPeriod.create({ tenantId, year: 2026, month: 10, status: "CLOSED" });
    const fiscal = await db.orm.public.FiscalDocument.where({ tenantId, invoiceId: ids.fiscalAceptado }).first();
    await db.orm.public.FiscalDocument.where({ tenantId, id: fiscal!.id }).update({ status: "ACCEPTED", payload: { ...(fiscal!.payload as object), issueDate: "2026-10-31" } as never });
  });

  afterAll(async () => {
    if (tenantId) await deleteTenantCompletely(tenantId);
  });

  const detalle = () => ejecutarDiagnostico().detalle.filter((f) => f.negocio === slug);
  const porDoc = (filas: Fila[], clave: string) => filas.find((f) => f.documento_id === ids[clave]);

  test("encuentra exactamente los asientos afectados y no el correcto", () => {
    const filas = detalle();
    expect(filas.map((f) => f.documento_id).sort()).toEqual(["mismoMes", "cruzaMesCerrado", "cruzaAnio", "anulado", "fiscalAceptado", "otraCausa"].map((k) => ids[k]).sort());
    expect(porDoc(filas, "correcto")).toBeUndefined();
  });

  test("muestra la fecha de origen (UTC y Bogotá) y la almacenada", () => {
    const f = porDoc(detalle(), "mismoMes")!;
    expect(f.dia_origen_utc).toBe("2026-10-31");
    expect(f.dia_origen_bogota).toBe("2026-10-30");
    expect(f.fecha_asiento_almacenada).toBe("2026-10-31");
    expect(f.desfase_dias).toBe("1");
  });

  test("clasifica: afectado por el día UTC frente a otra causa", () => {
    const filas = detalle();
    expect(porDoc(filas, "mismoMes")!.clasificacion).toBe("AFECTADO_POR_DIA_UTC");
    expect(porDoc(filas, "cruzaAnio")!.clasificacion).toBe("AFECTADO_POR_DIA_UTC");
    expect(porDoc(filas, "otraCausa")!.clasificacion).toBe("REVISAR_OTRA_CAUSA");
    expect(porDoc(filas, "otraCausa")!.tratamiento_sugerido).toMatch(/no es este defecto/);
  });

  test("clasifica por estado y período, y sugiere un tratamiento distinto para cada caso", () => {
    const filas = detalle();
    expect(porDoc(filas, "mismoMes")!.periodo_almacenado).toBe("2026-10 (CLOSED)");
    expect(porDoc(filas, "mismoMes")!.tratamiento_sugerido).toMatch(/Mismo mes/);
    const cruzaMes = porDoc(filas, "cruzaMesCerrado")!;
    expect(cruzaMes.periodo_almacenado).toMatch(/^2026-11/);
    expect(cruzaMes.periodo_correcto).toBe("2026-10 (CLOSED)");
    expect(cruzaMes.tratamiento_sugerido).toMatch(/CRUZA PERÍODO y alguno está CERRADO.*No editar el asiento/);
    expect(porDoc(filas, "cruzaAnio")!.periodo_correcto).toMatch(/^2025-12/);
    expect(porDoc(filas, "anulado")!.estado_documento).toBe("VOID");
    expect(porDoc(filas, "anulado")!.tratamiento_sugerido).toMatch(/anulado/);
  });

  test("avisa si el documento fiscal ya fue aceptado con la fecha equivocada", () => {
    const f = porDoc(detalle(), "fiscalAceptado")!;
    expect(f.fiscal_estado).toBe("ACCEPTED");
    expect(f.tratamiento_sugerido).toMatch(/DOCUMENTO FISCAL YA ACEPTADO/);
    const fiscales = ejecutarDiagnostico().fiscal.filter((x) => x.negocio === slug);
    expect(fiscales.map((x) => x.estado_fiscal)).toContain("ACCEPTED");
    expect(fiscales.find((x) => x.estado_fiscal === "ACCEPTED")!.tratamiento_sugerido).toMatch(/no se puede cambiar/);
  });

  test("el resumen agrupa por negocio, período, estado y clasificación", () => {
    const resumen = ejecutarDiagnostico().resumen.filter((f) => f.negocio === slug);
    expect(resumen.length).toBeGreaterThan(0);
    expect(resumen.reduce((n, f) => n + Number(f.asientos), 0)).toBe(6);
    expect(resumen.some((f) => f.cruza_periodo === "t" && f.clasificacion === "AFECTADO_POR_DIA_UTC")).toBe(true);
  });

  test.each([
    ["un UPDATE", 'UPDATE "JournalEntry" SET date = \'1999-01-01\' WHERE "tenantId" = \'x\';'],
    ["un DELETE", 'DELETE FROM "JournalEntry" WHERE "tenantId" = \'x\';'],
    ["un INSERT", 'INSERT INTO "AccountingPeriod" ("id","tenantId","year","month","status") VALUES (gen_random_uuid(), \'x\', 2000, 1, \'OPEN\');'],
  ])("aunque alguien le agregara %s, la base lo rechaza (transacción de solo lectura) y nada cambia", async (_n, escritura) => {
    const dir = mkdtempSync(join(tmpdir(), "nexus-diag-"));
    try {
      const archivo = join(dir, "con-escritura.sql");
      const sql = readFileSync(SQL_FILE, "utf8").replace(/ROLLBACK;\s*$/, `${escritura}\nROLLBACK;\n`);
      expect(sql).toContain(escritura);
      writeFileSync(archivo, sql);
      const antes = JSON.stringify((await db.orm.public.JournalEntry.where({ tenantId }).orderBy((e) => e.number.asc()).all()).map((e) => [e.number, e.date, e.hash]));
      const r = spawnSync("psql", [TEST_URL!, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", archivo], { encoding: "utf8" });
      expect(r.status, "psql debe fallar").not.toBe(0);
      expect(r.stderr).toMatch(/read-only transaction/i);
      const despues = JSON.stringify((await db.orm.public.JournalEntry.where({ tenantId }).orderBy((e) => e.number.asc()).all()).map((e) => [e.number, e.date, e.hash]));
      expect(despues).toBe(antes);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("solo corre contra la base desechable de la prueba (nunca contra una base persistente)", async () => {
    expect(normalize(process.env.DATABASE_URL)).toBe(normalize(TEST_URL));
    const r = spawnSync("psql", [TEST_URL!, "-X", "-q", "-A", "-t", "-c", "select current_database()"], { encoding: "utf8" });
    // Base desechable: la local de pruebas (`nexus_e<n>_test`) o la efímera del CI (`nexus_test`).
    expect(r.stdout.trim()).toMatch(/^nexus_(e\d+_)?test$/);
  });

  test("no modifica nada: los asientos, documentos y documentos fiscales quedan idénticos", async () => {
    const foto = async () => JSON.stringify([
      (await db.orm.public.JournalEntry.where({ tenantId }).orderBy((e) => e.number.asc()).all()).map((e) => [e.number, e.date, e.hash]),
      (await db.orm.public.Invoice.where({ tenantId }).orderBy((i) => i.number.asc()).all()).map((i) => [i.number, String(i.issueDate), i.status]),
      (await db.orm.public.FiscalDocument.where({ tenantId }).all()).map((f) => [f.id, f.status, JSON.stringify(f.payload)]).sort(),
    ]);
    const antes = await foto();
    ejecutarDiagnostico();
    ejecutarDiagnostico();
    expect(await foto()).toBe(antes);
  });
});
