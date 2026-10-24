import { db } from "@/prisma/db";
import { toNumber } from "@/lib/format";
import { applyStockMovement } from "@/lib/inventory/stock-service";
import type { StockKind } from "./inventory";

/** Catálogo e inventario del negocio (servidor, aislado por tenant). */

export type ProductKindValue = "PRODUCT" | "SERVICE" | "PLAN" | "TICKET" | "TOUR";

export type ProductRow = {
  id: string;
  kind: ProductKindValue;
  name: string;
  description: string | null;
  sku: string | null;
  category: string | null;
  price: number;
  cost: number | null;
  trackStock: boolean;
  stock: number;
  minStock: number;
  unit: string | null;
  durationMinutes: number | null;
  durationDays: number | null;
  capacity: number | null;
  active: boolean;
  /** IVA que se cobra (0 si no es gravado). */
  taxRatePct: number;
};

const dec = (n: number) => n.toFixed(2);

function toRow(p: NonNullable<Awaited<ReturnType<typeof db.orm.public.Product.first>>>): ProductRow {
  return {
    id: p.id,
    kind: p.kind as ProductKindValue,
    name: p.name,
    description: p.description,
    sku: p.sku,
    category: p.category,
    price: toNumber(p.price),
    cost: p.cost == null ? null : toNumber(p.cost),
    trackStock: p.trackStock,
    stock: p.stock,
    minStock: p.minStock,
    unit: p.unit,
    durationMinutes: p.durationMinutes,
    durationDays: p.durationDays,
    capacity: p.capacity,
    active: p.active,
    taxRatePct: p.taxCategory === "GRAVADO" ? toNumber(p.taxRatePct) : 0,
  };
}

export async function listProducts(tenantId: string, filter: { kind?: ProductKindValue | ProductKindValue[]; activeOnly?: boolean; q?: string; limit?: number } = {}): Promise<ProductRow[]> {
  let q = db.orm.public.Product.where({ tenantId });
  if (filter.kind) {
    const kinds = [filter.kind].flat();
    q = q.where((p) => p.kind.in(kinds));
  }
  if (filter.activeOnly) q = q.where({ active: true });
  if (filter.q?.trim()) {
    const pattern = `%${filter.q.trim().replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    q = q.where((p) => p.name.ilike(pattern));
  }
  const ordered = q.orderBy((p) => p.name.asc());
  const rows = await (filter.limit ? ordered.limit(filter.limit) : ordered).all();
  return rows.map(toRow);
}

export async function getProduct(tenantId: string, id: string) {
  const p = await db.orm.public.Product.where({ tenantId, id }).first();
  return p ? toRow(p) : null;
}

export type ProductInput = Omit<ProductRow, "id" | "stock" | "taxRatePct"> & { initialStock?: number };

export async function saveProduct(tenantId: string, id: string | null, v: ProductInput, userId: string): Promise<string> {
  const data = {
    kind: v.kind,
    name: v.name,
    description: v.description,
    sku: v.sku,
    category: v.category,
    price: dec(v.price),
    cost: v.cost == null ? null : dec(v.cost),
    trackStock: v.trackStock,
    minStock: v.minStock,
    unit: v.unit,
    durationMinutes: v.durationMinutes,
    durationDays: v.durationDays,
    capacity: v.capacity,
    active: v.active,
  };
  if (id) {
    await db.orm.public.Product.where({ tenantId, id }).update(data);
    return id;
  }
  const created = await db.orm.public.Product.create({ tenantId, ...data, stock: 0 });
  if (v.trackStock && v.initialStock && v.initialStock > 0) {
    await moveStock(tenantId, created.id, "IN", v.initialStock, "Inventario inicial", userId);
  }
  return created.id;
}

/**
 * Registra un movimiento y actualiza el stock en la misma transacción, por el
 * servicio de inventario (bodega principal, costo promedio y kardex). Devuelve
 * el stock total del producto. Lanza `StockError` si no hay existencias.
 */
export async function moveStock(tenantId: string, productId: string, kind: StockKind, quantity: number, note: string | null, userId: string | null, paymentId: string | null = null, extra: { unitCost?: number | null; documentType?: string | null; documentId?: string | null } = {}) {
  return db.transaction(async (tx) => {
    const result = await applyStockMovement(tx, tenantId, { productId, kind, quantity, note, userId, paymentId, ...extra });
    return result.productStock;
  });
}

export async function stockHistory(tenantId: string, productId: string, limit = 20) {
  const rows = await db.orm.public.StockMovement.where({ tenantId, productId }).orderBy((m) => m.createdAt.desc()).limit(limit).all();
  return rows.map((m) => ({ id: m.id, kind: m.kind as StockKind, quantity: m.quantity, note: m.note, createdAt: String(m.createdAt) }));
}

export async function lowStock(tenantId: string) {
  const rows = await db.orm.public.Product.where({ tenantId, trackStock: true, active: true }).select("id", "name", "stock", "minStock").all();
  return rows.filter((r) => r.stock <= r.minStock);
}

/** Planes activos para inscribir a un cliente, del más barato al más caro. */
export async function planOptions(tenantId: string): Promise<{ id: string; name: string; price: number; days: number }[]> {
  const rows = await db.orm.public.Product.where({ tenantId, kind: "PLAN", active: true })
    .select("id", "name", "price", "durationDays")
    .orderBy((p) => p.price.asc())
    .all();
  return rows.map((p) => ({ id: p.id, name: p.name, price: Number(p.price), days: p.durationDays ?? 30 }));
}
