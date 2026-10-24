import { db } from "@/prisma/db";
import { msOf } from "@/lib/events/instant";
import { toNumber } from "@/lib/format";
import type { KardexLine } from "./stock-service";

/** Kardex y bodegas (lectura y administración). Todo con `tenantId`. */

export async function kardex(tenantId: string, productId: string, opts: { warehouseId?: string; limit?: number } = {}): Promise<KardexLine[]> {
  const limit = Math.min(200, Math.max(1, Math.trunc(opts.limit ?? 50)));
  const base = db.orm.public.StockMovement.where({ tenantId, productId });
  const rows = await (opts.warehouseId ? base.where({ warehouseId: opts.warehouseId }) : base).orderBy((m) => m.createdAt.desc()).limit(limit).all();
  return rows.map((m) => {
    const unitCost = m.unitCost == null ? null : toNumber(m.unitCost);
    return {
      id: m.id,
      date: new Date(msOf(m.createdAt) ?? 0).toISOString(),
      kind: m.kind,
      quantity: m.quantity,
      unitCost,
      value: unitCost == null ? null : Math.round(unitCost * Math.abs(m.quantity) * 100) / 100,
      balance: m.balanceAfter ?? null,
      warehouseId: m.warehouseId ?? null,
      note: m.note ?? null,
      documentType: m.documentType ?? null,
      documentId: m.documentId ?? null,
    };
  });
}

/** Existencias y valor por bodega de un producto. */
export async function stockByWarehouse(tenantId: string, productId: string) {
  const levels = await db.orm.public.StockLevel.where({ tenantId, productId }).all();
  const warehouses = await db.orm.public.Warehouse.where({ tenantId }).all();
  return levels.map((l) => {
    const avgCost = toNumber(l.avgCost);
    return { warehouseId: l.warehouseId, warehouse: warehouses.find((w) => w.id === l.warehouseId)?.name ?? "—", variantId: l.variantId ?? null, quantity: l.quantity, avgCost, value: Math.round(l.quantity * avgCost * 100) / 100 };
  });
}

/** ¿El kardex cuadra? Total de bodegas = `Product.stock`, sin saldos negativos y con la existencia actual entre los saldos registrados. */
export async function reconcile(tenantId: string, productId: string): Promise<{ ok: boolean; productStock: number; levelsTotal: number; problems: string[] }> {
  const product = await db.orm.public.Product.where({ tenantId, id: productId }).first();
  if (!product) return { ok: false, productStock: 0, levelsTotal: 0, problems: ["Producto no encontrado."] };
  const levels = await db.orm.public.StockLevel.where({ tenantId, productId }).all();
  const levelsTotal = levels.reduce((sum, l) => sum + l.quantity, 0);
  const problems: string[] = [];
  if (levelsTotal !== product.stock) problems.push(`Las bodegas suman ${levelsTotal} y el producto dice ${product.stock}.`);
  for (const level of levels) {
    // Con movimientos simultáneos la fecha no ordena el orden en que se aplicaron, así que no se
    // compara «el último» saldo: se exige que ningún saldo sea negativo y que la existencia actual
    // sea uno de los saldos que el kardex registró (la cadena de movimientos termina en ella).
    const balances = (await db.orm.public.StockMovement.where({ tenantId, productId, warehouseId: level.warehouseId }).all()).map((m) => m.balanceAfter).filter((b): b is number => b != null);
    if (balances.some((b) => b < 0)) problems.push("El kardex tiene un saldo negativo.");
    if (balances.length && !balances.includes(level.quantity)) problems.push(`La existencia de la bodega (${level.quantity}) no aparece entre los saldos del kardex.`);
  }
  return { ok: problems.length === 0, productStock: product.stock, levelsTotal, problems };
}

export async function createWarehouse(tenantId: string, input: { name: string; code?: string | null; address?: string | null }): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, message: "Ponle un nombre a la bodega." };
  try {
    const created = await db.orm.public.Warehouse.create({ tenantId, name, code: input.code?.trim().slice(0, 20) || null, address: input.address?.trim().slice(0, 200) || null });
    return { ok: true, id: created.id };
  } catch (error) {
    if (/unique|duplicate key/i.test(String((error as Error)?.message ?? error))) return { ok: false, message: "Ya existe una bodega con ese nombre." };
    throw error;
  }
}

export async function listWarehouses(tenantId: string) {
  const rows = await db.orm.public.Warehouse.where({ tenantId, active: true }).orderBy((w) => w.name.asc()).all();
  return rows.map((w) => ({ id: w.id, name: w.name, code: w.code ?? null, isDefault: w.isDefault }));
}
