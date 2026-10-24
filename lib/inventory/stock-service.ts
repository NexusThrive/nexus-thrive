import type { MoneyTx } from "@/lib/business/money-service";
import { toNumber } from "@/lib/format";

/**
 * Servicio de inventario: el ÚNICO camino que cambia existencias. Mantiene, en
 * la misma transacción que el hecho que lo causa:
 *  - `StockLevel`: existencias y costo promedio ponderado por bodega,
 *  - `StockMovement`: la línea del kardex (con costo y saldo),
 *  - `Product.stock`: el total de todas las bodegas (lo que leen las pantallas).
 *
 * Seguro ante concurrencia: cada cambio se aplica «solo si nadie lo cambió desde
 * que lo leí» (compara-y-cambia en una sentencia SQL) y se reintenta con la
 * lectura nueva. Dos ventas simultáneas nunca dejan existencias negativas.
 */
export type MovementKind = "IN" | "OUT" | "SALE" | "ADJUST";

export class StockError extends Error {}

export type MovementInput = {
  productId: string;
  variantId?: string | null;
  /** Sin bodega usa la predeterminada («Principal»). */
  warehouseId?: string | null;
  kind: MovementKind;
  /** IN/OUT/SALE: unidades (> 0). ADJUST: el conteo nuevo (>= 0). */
  quantity: number;
  /** Solo entradas: lo que costó cada unidad. Sin él, la entrada entra al costo promedio vigente. */
  unitCost?: number | null;
  note?: string | null;
  paymentId?: string | null;
  documentType?: string | null;
  documentId?: string | null;
  reason?: string | null;
  userId?: string | null;
};

export type MovementResult = { warehouseId: string; balance: number; productStock: number; unitCost: number; delta: number };

const ATTEMPTS = 40;
/** Espera corta y aleatoria al perder una carrera: evita que todos reintenten a la vez. */
const backoff = () => new Promise((resolve) => setTimeout(resolve, Math.random() * 12));
const cost2 = (n: number) => n.toFixed(4);

/**
 * La bodega principal y las existencias iniciales se crean con `upsert`
 * (INSERT … ON CONFLICT): si dos movimientos nacen a la vez no hay error ni se
 * aborta la transacción de ninguno. Nacen con el saldo y costo que ya tenía el producto.
 */
export async function ensureDefaultWarehouse(tx: MoneyTx, tenantId: string): Promise<string> {
  const found = await tx.orm.public.Warehouse.where({ tenantId, isDefault: true }).first();
  if (found) return found.id;
  await tx.orm.public.Warehouse.upsert({ create: { tenantId, name: "Principal", isDefault: true }, update: {}, conflictOn: { tenantId, name: "Principal" } });
  const created = await tx.orm.public.Warehouse.where({ tenantId, name: "Principal" }).first();
  if (!created) throw new StockError("No se pudo crear la bodega principal.");
  return created.id;
}

const readLevel = (tx: MoneyTx, tenantId: string, warehouseId: string, productId: string, variantId: string | null) =>
  tx.orm.public.StockLevel.where({ tenantId, warehouseId, productId, variantKey: variantId ?? "" }).first();

/** Primera vez que se mueve un producto en la bodega: nace con el saldo y costo que ya tenía. */
async function ensureLevel(tx: MoneyTx, tenantId: string, warehouseId: string, product: { id: string; stock: number; cost: unknown }, variantId: string | null, isDefaultWarehouse: boolean) {
  const existing = await readLevel(tx, tenantId, warehouseId, product.id, variantId);
  if (existing) return existing;
  // Producto que existía antes del módulo: su saldo actual es el de la bodega principal.
  const anyLevel = await tx.orm.public.StockLevel.where({ tenantId, productId: product.id }).first();
  const seed = !anyLevel && isDefaultWarehouse && !variantId ? Math.max(0, product.stock) : 0;
  await tx.orm.public.StockLevel.upsert({
    create: { tenantId, warehouseId, productId: product.id, variantId, variantKey: variantId ?? "", quantity: seed, avgCost: cost2(toNumber(product.cost as string | number | null)) },
    update: {},
    conflictOn: { warehouseId, productId: product.id, variantKey: variantId ?? "" },
  });
  const created = await readLevel(tx, tenantId, warehouseId, product.id, variantId);
  if (!created) throw new StockError("No se pudo preparar el inventario.");
  return created;
}

export async function applyStockMovement(tx: MoneyTx, tenantId: string, input: MovementInput): Promise<MovementResult> {
  const { kind } = input;
  if (!Number.isInteger(input.quantity) || input.quantity < 0 || (kind !== "ADJUST" && input.quantity === 0)) throw new StockError("La cantidad debe ser un número entero mayor que cero.");
  if (input.unitCost != null && (!Number.isFinite(input.unitCost) || input.unitCost < 0)) throw new StockError("El costo no es válido.");

  const product = await tx.orm.public.Product.where({ tenantId, id: input.productId }).first();
  if (!product) throw new StockError("Producto no encontrado.");
  const variantId = input.variantId ?? null;
  if (variantId && !(await tx.orm.public.ProductVariant.where({ tenantId, productId: product.id, id: variantId }).first())) throw new StockError("La variante no es de este producto.");

  const defaultId = await ensureDefaultWarehouse(tx, tenantId);
  const warehouseId = input.warehouseId ?? defaultId;
  if (warehouseId !== defaultId && !(await tx.orm.public.Warehouse.where({ tenantId, id: warehouseId, active: true }).first())) throw new StockError("La bodega no existe en este negocio.");

  let level = await ensureLevel(tx, tenantId, warehouseId, { id: product.id, stock: product.stock, cost: product.cost }, variantId, warehouseId === defaultId);

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const q = level.quantity;
    const avg = toNumber(level.avgCost);
    let next: number;
    let nextAvg = avg;
    let movementCost = avg;

    if (kind === "IN") {
      next = q + input.quantity;
      if (input.unitCost != null) {
        nextAvg = q + input.quantity > 0 ? (q * avg + input.quantity * input.unitCost) / (q + input.quantity) : input.unitCost;
        movementCost = input.unitCost;
      }
    } else if (kind === "ADJUST") {
      next = input.quantity;
      if (input.unitCost != null && next > q) movementCost = input.unitCost;
    } else {
      if (input.quantity > q) throw new StockError(`Solo hay ${q} en inventario.`);
      next = q - input.quantity;
    }

    const plan = tx.sql.public.StockLevel.update({ quantity: next, avgCost: cost2(nextAvg) })
      .where((f, fns) => fns.and(fns.eq(f.id, level.id), fns.eq(f.tenantId, tenantId), fns.eq(f.quantity, q)))
      .returning("id")
      .build();
    if ((await tx.query(plan)).length === 0) {
      // Alguien movió esta existencia a la vez: se relee y se vuelve a calcular.
      const fresh = await readLevel(tx, tenantId, warehouseId, product.id, variantId);
      if (!fresh) throw new StockError("El inventario cambió. Intenta de nuevo.");
      level = fresh;
      await backoff();
      continue;
    }

    const delta = next - q;
    const productStock = await addToProductStock(tx, tenantId, product.id, delta);
    await tx.orm.public.StockMovement.create({
      tenantId,
      productId: product.id,
      variantId,
      warehouseId,
      kind,
      quantity: kind === "ADJUST" ? delta : input.quantity,
      note: input.note ?? null,
      paymentId: input.paymentId ?? null,
      createdById: input.userId ?? null,
      unitCost: cost2(movementCost),
      balanceAfter: next,
      documentType: input.documentType ?? null,
      documentId: input.documentId ?? null,
      reason: input.reason ?? null,
    });
    return { warehouseId, balance: next, productStock, unitCost: nextAvg, delta };
  }
  throw new StockError("El inventario cambió mientras se registraba. Intenta de nuevo.");
}

/** Mantiene `Product.stock` = suma de bodegas, con el mismo compara-y-cambia. */
async function addToProductStock(tx: MoneyTx, tenantId: string, productId: string, delta: number): Promise<number> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const p = await tx.orm.public.Product.where({ tenantId, id: productId }).select("stock").first();
    if (!p) throw new StockError("Producto no encontrado.");
    if (delta === 0) return p.stock;
    const plan = tx.sql.public.Product.update({ stock: p.stock + delta })
      .where((f, fns) => fns.and(fns.eq(f.id, productId), fns.eq(f.tenantId, tenantId), fns.eq(f.stock, p.stock)))
      .returning("stock")
      .build();
    if ((await tx.query(plan)).length > 0) return p.stock + delta;
    await backoff();
  }
  throw new StockError("El inventario cambió mientras se registraba. Intenta de nuevo.");
}

export type KardexLine = { id: string; date: string; kind: string; quantity: number; unitCost: number | null; value: number | null; balance: number | null; warehouseId: string | null; note: string | null; documentType: string | null; documentId: string | null };
