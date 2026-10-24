import { db } from "@/prisma/db";
import { toNumber } from "@/lib/format";
import { msOf, toInstant } from "@/lib/events/instant";
import { moneyTransaction } from "@/lib/business/money-service";
import { applyStockMovement, StockError } from "./stock-service";
import { countCode, countSummary, suggestedOrder, transferCode, validateLevels, validateTransfer, type CountStatus } from "./stock-docs";

/**
 * Traslados entre bodegas, conteos físicos y reposición. Todo movimiento de
 * existencias pasa por el servicio de inventario (costo promedio y kardex), en
 * la misma transacción que el documento.
 */
export type DocResult<T = object> = ({ ok: true } & T) | { ok: false; message: string; code?: string };

class DocError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}
const isNumberCollision = (e: unknown) => /StockTransfer_tenantId_number|StockCount_tenantId_number/i.test(String((e as Error)?.message ?? e));
const jitter = () => new Promise((resolve) => setTimeout(resolve, Math.random() * 20));
const iso = (v: unknown) => new Date(msOf(v) ?? 0).toISOString();

async function activeWarehouse(tx: Parameters<Parameters<typeof moneyTransaction>[0]>[0], tenantId: string, id: string, label: string) {
  const w = await tx.orm.public.Warehouse.where({ tenantId, id, active: true }).first();
  if (!w) throw new DocError(`La bodega de ${label} no existe en este negocio.`, "invalid_warehouse");
  return w;
}

// ── Traslados ──────────────────────────────────────────────────────────────

export type TransferInput = { fromWarehouseId: string; toWarehouseId: string; note?: string | null; lines: { productId: string; variantId?: string | null; quantity: number }[] };

export async function createTransfer(tenantId: string, input: TransferInput, userId: string | null): Promise<DocResult<{ id: string; number: number; code: string }>> {
  const invalid = validateTransfer(input);
  if (invalid) return { ok: false, message: invalid };
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      return await moneyTransaction(async (tx) => {
        const from = await activeWarehouse(tx, tenantId, input.fromWarehouseId, "origen");
        const to = await activeWarehouse(tx, tenantId, input.toWarehouseId, "destino");
        const { top } = await tx.orm.public.StockTransfer.where({ tenantId }).aggregate((a) => ({ top: a.max("number") }));
        const number = (top ?? 0) + 1;
        const transfer = await tx.orm.public.StockTransfer.create({ tenantId, number, fromWarehouseId: from.id, toWarehouseId: to.id, note: input.note?.trim().slice(0, 300) || null, createdById: userId });
        for (const line of input.lines) {
          const product = await tx.orm.public.Product.where({ tenantId, id: line.productId }).first();
          if (!product) throw new DocError("Un producto no es de este negocio.", "invalid_product");
          if (!product.trackStock) throw new DocError(`«${product.name}» no lleva inventario.`, "untracked_product");
          const note = `Traslado ${transferCode(number)}: ${from.name} → ${to.name}`;
          // Sale de origen (al costo promedio de allí) y entra a destino con ESE costo: el valor del inventario se conserva.
          const out = await applyStockMovement(tx, tenantId, { productId: product.id, variantId: line.variantId ?? null, warehouseId: from.id, kind: "OUT", quantity: line.quantity, note, documentType: "TRANSFER", documentId: transfer.id, userId });
          await applyStockMovement(tx, tenantId, { productId: product.id, variantId: line.variantId ?? null, warehouseId: to.id, kind: "IN", quantity: line.quantity, unitCost: out.unitCost, note, documentType: "TRANSFER", documentId: transfer.id, userId });
          await tx.orm.public.StockTransferLine.create({ tenantId, transferId: transfer.id, productId: product.id, variantId: line.variantId ?? null, quantity: line.quantity, unitCost: out.unitCost.toFixed(4) });
        }
        return { ok: true as const, id: transfer.id, number, code: transferCode(number) };
      });
    } catch (error) {
      if (error instanceof DocError) return { ok: false, message: error.message, code: error.code };
      if (error instanceof StockError) return { ok: false, message: error.message, code: "stock" };
      if (!isNumberCollision(error) || attempt === 14) throw error;
      await jitter();
    }
  }
  throw new Error("No se pudo numerar el traslado.");
}

export type TransferRow = { id: string; number: number; code: string; fromName: string; toName: string; lineCount: number; units: number; value: number; note: string | null; createdAt: string };

export async function listTransfers(tenantId: string, limit = 50): Promise<TransferRow[]> {
  const rows = await db.orm.public.StockTransfer.where({ tenantId }).orderBy((t) => t.number.desc()).limit(Math.min(200, Math.max(1, limit))).all();
  if (!rows.length) return [];
  const [lines, warehouses] = await Promise.all([db.orm.public.StockTransferLine.where({ tenantId }).where((l) => l.transferId.in(rows.map((r) => r.id))).all(), db.orm.public.Warehouse.where({ tenantId }).all()]);
  const name = (id: string) => warehouses.find((w) => w.id === id)?.name ?? "—";
  return rows.map((t) => {
    const own = lines.filter((l) => l.transferId === t.id);
    return { id: t.id, number: t.number, code: transferCode(t.number), fromName: name(t.fromWarehouseId), toName: name(t.toWarehouseId), lineCount: own.length, units: own.reduce((s, l) => s + l.quantity, 0), value: Math.round(own.reduce((s, l) => s + l.quantity * toNumber(l.unitCost), 0) * 100) / 100, note: t.note ?? null, createdAt: iso(t.createdAt) };
  });
}

// ── Conteos ────────────────────────────────────────────────────────────────

export async function createCount(tenantId: string, warehouseId: string, userId: string | null): Promise<DocResult<{ id: string; number: number; code: string; lines: number }>> {
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      return await moneyTransaction(async (tx) => {
        const warehouse = await activeWarehouse(tx, tenantId, warehouseId, "conteo");
        const products = await tx.orm.public.Product.where({ tenantId, trackStock: true, active: true }).orderBy((p) => p.name.asc()).all();
        if (!products.length) throw new DocError("No hay productos con inventario para contar.", "no_products");
        const levels = await tx.orm.public.StockLevel.where({ tenantId, warehouseId: warehouse.id }).all();
        const { top } = await tx.orm.public.StockCount.where({ tenantId }).aggregate((a) => ({ top: a.max("number") }));
        const number = (top ?? 0) + 1;
        const count = await tx.orm.public.StockCount.create({ tenantId, number, warehouseId: warehouse.id, status: "DRAFT", createdById: userId });
        for (const p of products) {
          // Solo el producto sin variante: las variantes se cuentan por su bodega más adelante.
          const level = levels.find((l) => l.productId === p.id && l.variantKey === "");
          await tx.orm.public.StockCountLine.create({ tenantId, countId: count.id, productId: p.id, expected: level?.quantity ?? 0 });
        }
        return { ok: true as const, id: count.id, number, code: countCode(number), lines: products.length };
      });
    } catch (error) {
      if (error instanceof DocError) return { ok: false, message: error.message, code: error.code };
      if (!isNumberCollision(error) || attempt === 14) throw error;
      await jitter();
    }
  }
  throw new Error("No se pudo numerar el conteo.");
}

export type CountDetail = { id: string; number: number; code: string; status: CountStatus; warehouseId: string; warehouseName: string; note: string | null; createdAt: string; completedAt: string | null; lines: { id: string; productId: string; productName: string; expected: number; counted: number | null; adjustment: number | null }[] };

export async function getCount(tenantId: string, id: string): Promise<CountDetail | null> {
  const count = await db.orm.public.StockCount.where({ tenantId, id }).first();
  if (!count) return null;
  const [lines, warehouse] = await Promise.all([db.orm.public.StockCountLine.where({ tenantId, countId: id }).all(), db.orm.public.Warehouse.where({ tenantId, id: count.warehouseId }).first()]);
  const products = lines.length ? await db.orm.public.Product.where({ tenantId }).where((p) => p.id.in(lines.map((l) => l.productId))).all() : [];
  return {
    id: count.id,
    number: count.number,
    code: countCode(count.number),
    status: count.status as CountStatus,
    warehouseId: count.warehouseId,
    warehouseName: warehouse?.name ?? "—",
    note: count.note ?? null,
    createdAt: iso(count.createdAt),
    completedAt: count.completedAt ? iso(count.completedAt) : null,
    lines: lines.map((l) => ({ id: l.id, productId: l.productId, productName: products.find((p) => p.id === l.productId)?.name ?? "—", expected: l.expected, counted: l.counted ?? null, adjustment: l.adjustment ?? null })).sort((a, b) => a.productName.localeCompare(b.productName)),
  };
}

export type CountRow = { id: string; number: number; code: string; status: CountStatus; warehouseName: string; createdAt: string; lines: number; counted: number; withDifference: number };

export async function listCounts(tenantId: string, limit = 50): Promise<CountRow[]> {
  const rows = await db.orm.public.StockCount.where({ tenantId }).orderBy((c) => c.number.desc()).limit(Math.min(200, Math.max(1, limit))).all();
  if (!rows.length) return [];
  const [lines, warehouses] = await Promise.all([db.orm.public.StockCountLine.where({ tenantId }).where((l) => l.countId.in(rows.map((r) => r.id))).all(), db.orm.public.Warehouse.where({ tenantId }).all()]);
  return rows.map((c) => {
    const own = lines.filter((l) => l.countId === c.id);
    const s = countSummary(own.map((l) => ({ expected: l.expected, counted: l.counted ?? null })));
    return { id: c.id, number: c.number, code: countCode(c.number), status: c.status as CountStatus, warehouseName: warehouses.find((w) => w.id === c.warehouseId)?.name ?? "—", createdAt: iso(c.createdAt), lines: s.total, counted: s.counted, withDifference: s.withDifference };
  });
}

/** Anota lo contado (solo mientras el conteo está abierto). Una línea vacía queda «sin contar». */
export async function saveCountLines(tenantId: string, countId: string, items: { lineId: string; counted: number | null }[]): Promise<DocResult> {
  const count = await db.orm.public.StockCount.where({ tenantId, id: countId }).first();
  if (!count) return { ok: false, message: "No se encontró el conteo." };
  if (count.status !== "DRAFT") return { ok: false, message: "Este conteo ya está cerrado." };
  if (items.some((i) => i.counted !== null && (!Number.isInteger(i.counted) || i.counted < 0))) return { ok: false, message: "Lo contado debe ser un entero de cero en adelante." };
  for (const item of items) await db.orm.public.StockCountLine.where({ tenantId, countId, id: item.lineId }).update({ counted: item.counted });
  return { ok: true };
}

/**
 * Cierra el conteo: cada diferencia (contado − lo esperado al empezar) se aplica
 * como entrada o salida con el motivo, en el kardex. Se aplica la DIFERENCIA y no
 * el valor absoluto, para no pisar ventas o compras ocurridas mientras se contaba.
 */
export async function finalizeCount(tenantId: string, countId: string, note: string, userId: string | null): Promise<DocResult<{ adjusted: number; units: number }>> {
  try {
    return await moneyTransaction(async (tx) => {
      const count = await tx.orm.public.StockCount.where({ tenantId, id: countId }).first();
      if (!count) throw new DocError("No se encontró el conteo.");
      if (count.status !== "DRAFT") throw new DocError("Este conteo ya está cerrado.", "closed");
      const lines = await tx.orm.public.StockCountLine.where({ tenantId, countId }).all();
      const done = lines.filter((l) => l.counted !== null);
      if (!done.length) throw new DocError("Anota lo que contaste de al menos un producto.", "nothing_counted");
      const withDiff = done.filter((l) => (l.counted as number) !== l.expected);
      const reason = note.trim().slice(0, 300);
      if (withDiff.length && reason.length < 3) throw new DocError("Explica el motivo de las diferencias para poder ajustar.", "reason_required");

      // Cierra primero (solo si sigue abierto): dos cierres a la vez no duplican los ajustes.
      const claim = tx.sql.public.StockCount.update({ status: "COMPLETED", note: reason || null, completedAt: toInstant(Date.now()) })
        .where((f, fns) => fns.and(fns.eq(f.id, countId), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "DRAFT")))
        .returning("id")
        .build();
      if ((await tx.query(claim)).length === 0) throw new DocError("Este conteo ya se cerró.", "closed");

      let units = 0;
      for (const line of withDiff) {
        const delta = (line.counted as number) - line.expected;
        const motive = `Conteo ${countCode(count.number)}: ${reason}`;
        await applyStockMovement(tx, tenantId, { productId: line.productId, warehouseId: count.warehouseId, kind: delta > 0 ? "IN" : "OUT", quantity: Math.abs(delta), note: motive, reason, documentType: "COUNT", documentId: count.id, userId });
        await tx.orm.public.StockCountLine.where({ tenantId, id: line.id }).update({ adjustment: delta });
        units += Math.abs(delta);
      }
      return { ok: true as const, adjusted: withDiff.length, units };
    });
  } catch (error) {
    if (error instanceof DocError) return { ok: false, message: error.message, code: error.code };
    if (error instanceof StockError) return { ok: false, message: `${error.message} Cambió el inventario mientras contabas: cuenta de nuevo ese producto.`, code: "stock" };
    throw error;
  }
}

export async function cancelCount(tenantId: string, countId: string): Promise<DocResult> {
  const count = await db.orm.public.StockCount.where({ tenantId, id: countId }).first();
  if (!count) return { ok: false, message: "No se encontró el conteo." };
  if (count.status !== "DRAFT") return { ok: false, message: "Solo se cancela un conteo abierto." };
  const updated = await db.orm.public.StockCount.where({ tenantId, id: countId, status: "DRAFT" }).update({ status: "CANCELED" });
  return updated ? { ok: true } : { ok: false, message: "El conteo cambió mientras lo revisabas." };
}

// ── Existencias por bodega y reposición ────────────────────────────────────

export type OverviewRow = { productId: string; productName: string; warehouseId: string; warehouseName: string; quantity: number; avgCost: number; value: number };

export async function stockOverview(tenantId: string): Promise<OverviewRow[]> {
  const [levels, warehouses] = await Promise.all([db.orm.public.StockLevel.where({ tenantId, variantKey: "" }).all(), db.orm.public.Warehouse.where({ tenantId }).all()]);
  if (!levels.length) return [];
  const products = await db.orm.public.Product.where({ tenantId }).where((p) => p.id.in([...new Set(levels.map((l) => l.productId))])).all();
  return levels
    .map((l) => {
      const avgCost = toNumber(l.avgCost);
      return { productId: l.productId, productName: products.find((p) => p.id === l.productId)?.name ?? "—", warehouseId: l.warehouseId, warehouseName: warehouses.find((w) => w.id === l.warehouseId)?.name ?? "—", quantity: l.quantity, avgCost, value: Math.round(l.quantity * avgCost * 100) / 100 };
    })
    .sort((a, b) => a.productName.localeCompare(b.productName) || a.warehouseName.localeCompare(b.warehouseName));
}

export type ReorderRow = { productId: string; name: string; stock: number; minStock: number; maxStock: number | null; reorderPoint: number | null; onOrder: number; suggested: number; needsOrder: boolean };

/** Productos con inventario y sus niveles; `needsOrder` marca los que ya llegaron al punto de reposición. */
export async function reorderOverview(tenantId: string): Promise<ReorderRow[]> {
  const products = await db.orm.public.Product.where({ tenantId, trackStock: true, active: true }).orderBy((p) => p.name.asc()).all();
  if (!products.length) return [];
  const open = await db.orm.public.PurchaseOrder.where({ tenantId }).where((o) => o.status.in(["ORDERED", "PARTIAL"])).all();
  const lines = open.length ? await db.orm.public.PurchaseOrderLine.where({ tenantId }).where((l) => l.orderId.in(open.map((o) => o.id))).all() : [];
  return products.map((p) => {
    const onOrder = lines.filter((l) => l.productId === p.id).reduce((s, l) => s + Math.max(0, l.quantity - l.receivedQuantity), 0);
    const input = { stock: p.stock, minStock: p.minStock, maxStock: p.maxStock ?? null, reorderPoint: p.reorderPoint ?? null, onOrder };
    const suggested = suggestedOrder(input);
    return { productId: p.id, name: p.name, ...input, suggested, needsOrder: suggested > 0 };
  });
}

export async function setReorderLevels(tenantId: string, productId: string, levels: { minStock: number; maxStock: number | null; reorderPoint: number | null }): Promise<DocResult> {
  const invalid = validateLevels(levels);
  if (invalid) return { ok: false, message: invalid };
  const updated = await db.orm.public.Product.where({ tenantId, id: productId, trackStock: true }).update({ minStock: levels.minStock, maxStock: levels.maxStock, reorderPoint: levels.reorderPoint });
  return updated ? { ok: true } : { ok: false, message: "No se encontró el producto con inventario." };
}
