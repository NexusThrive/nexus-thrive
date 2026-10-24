import { withinLimit } from "@/lib/benefits/benefits";
import { customerLimit } from "@/lib/business/customers-db";
import { syncCustomerParty } from "@/lib/parties/parties-db";
import { db } from "@/prisma/db";
import { CUSTOMER_HEADERS, PRODUCT_HEADERS, documentKey, parseCustomers, parseProducts, type ParsedRows, type RowError } from "./rows";
import { toCsv, type Table } from "./table";

/**
 * Importar y exportar clientes y catálogo. Todo con `tenantId`.
 *
 * Reimportar es idempotente: cada fila se empareja con lo que ya existe
 * (producto por SKU, o por nombre si no trae SKU; cliente por documento, o por
 * correo si no trae documento) y solo se escribe lo que cambió. Cada fila se
 * guarda por separado: una fila mala no tumba las demás y el reporte dice cuál.
 * Las existencias no se importan: se mueven con compras, traslados y conteos.
 */
export type ImportKind = "customers" | "products";
export type ImportReport = {
  kind: ImportKind;
  dryRun: boolean;
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: RowError[];
  missingColumns: string[];
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const dec = (n: number) => n.toFixed(2);
const sameNum = (a: unknown, b: number | null) => (a == null ? b === null : b !== null && Number(a) === b);

function report(kind: ImportKind, dryRun: boolean, parsed: ParsedRows<unknown>, total: number): ImportReport {
  return { kind, dryRun, total, created: 0, updated: 0, unchanged: 0, errors: [...parsed.errors], missingColumns: parsed.missingColumns };
}
const sortErrors = (r: ImportReport) => r.errors.sort((a, b) => a.line - b.line);
const failure = (line: number, error: unknown): RowError => ({ line, message: `No se pudo guardar: ${error instanceof Error ? error.message.slice(0, 160) : "error inesperado"}.` });

/* ------------------------------ Catálogo ------------------------------ */

export async function importProducts(tenantId: string, table: Table, opts: { dryRun: boolean }): Promise<ImportReport> {
  const parsed = parseProducts(table);
  const out = report("products", opts.dryRun, parsed, table.rows.length);
  if (parsed.missingColumns.length) return out;
  const existing = await db.orm.public.Product.where({ tenantId }).all();
  const bySku = new Map<string, (typeof existing)[number]>();
  const byName = new Map<string, (typeof existing)[number]>();
  for (const p of existing) {
    if (p.sku) bySku.set(p.sku.toLowerCase(), p);
    else byName.set(norm(p.name), p);
  }
  for (const { line, data } of parsed.rows) {
    const found = data.sku ? bySku.get(data.sku.toLowerCase()) : byName.get(norm(data.name));
    const values = {
      kind: data.kind,
      name: data.name,
      sku: data.sku,
      category: data.category,
      brand: data.brand,
      description: data.description,
      price: dec(data.price),
      cost: data.cost === null ? null : dec(data.cost),
      trackStock: data.trackStock,
      minStock: data.minStock,
      unitCode: data.unitCode,
      taxCategory: data.taxCategory,
      taxRatePct: dec(data.taxRatePct),
      active: data.active,
    };
    try {
      if (!found) {
        if (!opts.dryRun) {
          const created = await db.orm.public.Product.create({ tenantId, ...values, stock: 0 });
          if (data.sku) bySku.set(data.sku.toLowerCase(), created);
          else byName.set(norm(data.name), created);
        }
        out.created++;
        continue;
      }
      const unchanged =
        found.kind === data.kind && found.name === data.name && found.sku === data.sku && found.category === data.category && found.brand === data.brand &&
        found.description === data.description && sameNum(found.price, data.price) && sameNum(found.cost, data.cost) && found.trackStock === data.trackStock &&
        found.minStock === data.minStock && found.unitCode === data.unitCode && found.taxCategory === data.taxCategory && sameNum(found.taxRatePct, data.taxRatePct) &&
        found.active === data.active;
      if (unchanged) {
        out.unchanged++;
        continue;
      }
      if (!opts.dryRun) await db.orm.public.Product.where({ tenantId, id: found.id }).update(values);
      out.updated++;
    } catch (error) {
      out.errors.push(failure(line, error));
    }
  }
  sortErrors(out);
  return out;
}

export async function exportProducts(tenantId: string): Promise<string> {
  const rows = await db.orm.public.Product.where({ tenantId }).orderBy((p) => p.name.asc()).all();
  const kinds: Record<string, string> = { PRODUCT: "Producto", SERVICE: "Servicio" };
  const taxes: Record<string, string> = { GRAVADO: "Gravado", EXCLUIDO: "Excluido", EXENTO: "Exento" };
  return toCsv(
    PRODUCT_HEADERS,
    rows
      .filter((p) => p.kind === "PRODUCT" || p.kind === "SERVICE")
      .map((p) => [p.name, p.sku ?? "", kinds[p.kind] ?? p.kind, p.category ?? "", p.brand ?? "", p.description ?? "", String(Number(p.price)), p.cost == null ? "" : String(Number(p.cost)), p.trackStock ? "Sí" : "No", String(p.minStock), p.unitCode, taxes[p.taxCategory] ?? p.taxCategory, String(Number(p.taxRatePct)), p.active ? "Sí" : "No"]),
  );
}

/* ------------------------------ Clientes ------------------------------ */

const sameTags = (a: readonly string[] | null | undefined, b: string[]) => (a ?? []).length === b.length && b.every((t) => (a ?? []).includes(t));

export async function importCustomers(tenantId: string, table: Table, opts: { dryRun: boolean }): Promise<ImportReport> {
  const parsed = parseCustomers(table);
  const out = report("customers", opts.dryRun, parsed, table.rows.length);
  if (parsed.missingColumns.length) return out;
  const existing = await db.orm.public.Customer.where({ tenantId }).all();
  const byDoc = new Map<string, (typeof existing)[number]>();
  const byEmail = new Map<string, (typeof existing)[number]>();
  for (const c of existing) {
    const key = documentKey(c.documentId);
    if (key && !byDoc.has(key)) byDoc.set(key, c);
    if (c.email && !byEmail.has(c.email.toLowerCase())) byEmail.set(c.email.toLowerCase(), c);
  }
  const { limit, used } = await customerLimit(tenantId);
  let active = used;
  for (const { line, data } of parsed.rows) {
    const found = data.documentId ? byDoc.get(data.documentId) : data.email ? byEmail.get(data.email) : undefined;
    try {
      if (!found) {
        if (!withinLimit(limit, active)) {
          out.errors.push({ line, message: `Tu acuerdo incluye ${limit} clientes activos; esta fila no se creó.` });
          continue;
        }
        if (!opts.dryRun) {
          const created = await db.orm.public.Customer.create({ tenantId, name: data.name, email: data.email, phone: data.phone, documentId: data.documentId, city: data.city, tags: data.tags, active: true });
          await syncCustomerParty(tenantId, created.id);
          if (data.documentId) byDoc.set(data.documentId, created);
          else if (data.email) byEmail.set(data.email, created);
        }
        active++;
        out.created++;
        continue;
      }
      // Lo vacío del archivo no borra lo que ya tiene la ficha; las etiquetas se suman.
      const tags = [...new Set([...(found.tags ?? []), ...data.tags])];
      const next = {
        name: data.name,
        email: data.email ?? found.email,
        phone: data.phone ?? found.phone,
        documentId: found.documentId && documentKey(found.documentId) === data.documentId ? found.documentId : (data.documentId ?? found.documentId),
        city: data.city ?? found.city,
        tags,
      };
      const unchanged = found.name === next.name && found.email === next.email && found.phone === next.phone && found.documentId === next.documentId && found.city === next.city && sameTags(found.tags, tags);
      if (unchanged) {
        out.unchanged++;
        continue;
      }
      if (!opts.dryRun) {
        await db.orm.public.Customer.where({ tenantId, id: found.id }).update(next);
        await syncCustomerParty(tenantId, found.id);
      }
      out.updated++;
    } catch (error) {
      out.errors.push(failure(line, error));
    }
  }
  sortErrors(out);
  return out;
}

/** Clientes activos, con las mismas columnas que acepta la importación. */
export async function exportCustomers(tenantId: string): Promise<string> {
  const rows = await db.orm.public.Customer.where({ tenantId, active: true }).orderBy((c) => c.name.asc()).all();
  return toCsv(CUSTOMER_HEADERS, rows.map((c) => [c.name, c.documentId ?? "", c.email ?? "", c.phone ?? "", c.city ?? "", (c.tags ?? []).join("; ")]));
}

