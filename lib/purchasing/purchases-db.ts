import { db } from "@/prisma/db";
import { toNumber } from "@/lib/format";
import { msOf } from "@/lib/events/instant";
import { moneyTransaction } from "@/lib/business/money-service";
import { applyStockMovement, ensureDefaultWarehouse, StockError } from "@/lib/inventory/stock-service";
import { canCancel, canClose, canMarkOrdered, canReceive, nextStatus, orderCode, orderTotals, validateLines, type OrderStatus } from "./purchases";

/**
 * Compras: órdenes a proveedores, recepción de mercancía y factura del
 * proveedor. La mercancía entra SIEMPRE por el servicio de inventario (costo
 * promedio y kardex), en la misma transacción que marca lo recibido.
 */
export type OrderLineInput = { productId: string; variantId?: string | null; quantity: number; unitCost: number; taxRatePct?: number };
export type OrderInput = { supplierPartyId: string; warehouseId?: string | null; expectedDate?: string | null; note?: string | null; lines: OrderLineInput[] };
export type PurchaseResult<T = object> = ({ ok: true } & T) | { ok: false; message: string; code?: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const money = (n: number) => n.toFixed(2);
const isNumberCollision = (e: unknown) => /PurchaseOrder_tenantId_number|PurchaseOrder.*number/i.test(String((e as Error)?.message ?? e));

class PurchaseError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

export async function createOrder(tenantId: string, input: OrderInput, userId: string | null): Promise<PurchaseResult<{ id: string; number: number; code: string }>> {
  const lines = input.lines.map((l) => ({ productId: l.productId, variantId: l.variantId ?? null, quantity: Number(l.quantity), unitCost: Number(l.unitCost), taxRatePct: Number(l.taxRatePct ?? 0) }));
  const invalid = validateLines(lines);
  if (invalid) return { ok: false, message: invalid };
  if (input.expectedDate && !DATE.test(input.expectedDate)) return { ok: false, message: "La fecha esperada no es válida." };

  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      return await moneyTransaction(async (tx) => {
        const supplier = await tx.orm.public.Party.where({ tenantId, id: input.supplierPartyId, active: true }).first();
        const isSupplier = supplier && (await tx.orm.public.PartyRole.where({ tenantId, partyId: supplier.id, role: "SUPPLIER" }).first());
        if (!supplier || !isSupplier) throw new PurchaseError("Elige un proveedor de este negocio.", "invalid_supplier");

        const warehouseId = input.warehouseId ?? (await ensureDefaultWarehouse(tx, tenantId));
        if (input.warehouseId && !(await tx.orm.public.Warehouse.where({ tenantId, id: input.warehouseId, active: true }).first())) throw new PurchaseError("La bodega no existe en este negocio.", "invalid_warehouse");

        const products = await tx.orm.public.Product.where({ tenantId }).where((p) => p.id.in([...new Set(lines.map((l) => l.productId))])).all();
        for (const l of lines) {
          const p = products.find((x) => x.id === l.productId);
          if (!p) throw new PurchaseError("Un producto no es de este negocio.", "invalid_product");
          if (!p.trackStock) throw new PurchaseError(`«${p.name}» no lleva inventario: actívalo en el catálogo para poder comprarlo.`, "untracked_product");
          if (l.variantId && !(await tx.orm.public.ProductVariant.where({ tenantId, productId: l.productId, id: l.variantId }).first())) throw new PurchaseError(`La variante de «${p.name}» no existe.`, "invalid_variant");
        }

        const { top } = await tx.orm.public.PurchaseOrder.where({ tenantId }).aggregate((a) => ({ top: a.max("number") }));
        const number = (top ?? 0) + 1;
        const totals = orderTotals(lines);
        const order = await tx.orm.public.PurchaseOrder.create({
          tenantId,
          number,
          supplierPartyId: supplier.id,
          warehouseId,
          status: "DRAFT",
          expectedDate: input.expectedDate || null,
          subtotal: money(totals.subtotal),
          taxTotal: money(totals.taxTotal),
          total: money(totals.total),
          note: input.note?.trim().slice(0, 500) || null,
          createdById: userId,
        });
        for (const l of lines) {
          await tx.orm.public.PurchaseOrderLine.create({ tenantId, orderId: order.id, productId: l.productId, variantId: l.variantId, quantity: l.quantity, unitCost: money(l.unitCost), taxRatePct: money(l.taxRatePct) });
        }
        return { ok: true as const, id: order.id, number, code: orderCode(number) };
      });
    } catch (error) {
      if (error instanceof PurchaseError) return { ok: false, message: error.message, code: error.code };
      if (!isNumberCollision(error) || attempt === 14) throw error;
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 20)); // otra orden tomó el mismo número: se espera un poco y se renumera
    }
  }
  throw new Error("No se pudo numerar la orden.");
}

export type OrderRow = { id: string; number: number; code: string; status: OrderStatus; supplierPartyId: string; supplierName: string; warehouseId: string; total: number; expectedDate: string | null; createdAt: string; lineCount: number; pendingUnits: number };

export async function listOrders(tenantId: string, opts: { status?: OrderStatus; limit?: number } = {}): Promise<OrderRow[]> {
  const limit = Math.min(200, Math.max(1, Math.trunc(opts.limit ?? 100)));
  const base = db.orm.public.PurchaseOrder.where({ tenantId });
  const orders = await (opts.status ? base.where({ status: opts.status }) : base).orderBy((o) => o.number.desc()).limit(limit).all();
  if (!orders.length) return [];
  const ids = orders.map((o) => o.id);
  const [lines, suppliers] = await Promise.all([
    db.orm.public.PurchaseOrderLine.where({ tenantId }).where((l) => l.orderId.in(ids)).all(),
    db.orm.public.Party.where({ tenantId }).where((p) => p.id.in([...new Set(orders.map((o) => o.supplierPartyId))])).all(),
  ]);
  return orders.map((o) => {
    const own = lines.filter((l) => l.orderId === o.id);
    return {
      id: o.id,
      number: o.number,
      code: orderCode(o.number),
      status: o.status as OrderStatus,
      supplierPartyId: o.supplierPartyId,
      supplierName: suppliers.find((s) => s.id === o.supplierPartyId)?.legalName ?? "—",
      warehouseId: o.warehouseId,
      total: toNumber(o.total),
      expectedDate: o.expectedDate ?? null,
      createdAt: new Date(msOf(o.createdAt) ?? 0).toISOString(),
      lineCount: own.length,
      pendingUnits: own.reduce((s, l) => s + (l.quantity - l.receivedQuantity), 0),
    };
  });
}

export type OrderDetail = OrderRow & {
  note: string | null;
  subtotal: number;
  taxTotal: number;
  warehouseName: string;
  lines: { id: string; productId: string; productName: string; variantId: string | null; quantity: number; receivedQuantity: number; unitCost: number; taxRatePct: number }[];
  invoices: { id: string; number: string; issueDate: string; dueDate: string | null; total: number; status: string }[];
};

export async function getOrder(tenantId: string, id: string): Promise<OrderDetail | null> {
  const order = await db.orm.public.PurchaseOrder.where({ tenantId, id }).first();
  if (!order) return null;
  const [lines, supplier, warehouse, invoices] = await Promise.all([
    db.orm.public.PurchaseOrderLine.where({ tenantId, orderId: id }).all(),
    db.orm.public.Party.where({ tenantId, id: order.supplierPartyId }).first(),
    db.orm.public.Warehouse.where({ tenantId, id: order.warehouseId }).first(),
    db.orm.public.SupplierInvoice.where({ tenantId, purchaseOrderId: id }).all(),
  ]);
  const products = lines.length ? await db.orm.public.Product.where({ tenantId }).where((p) => p.id.in(lines.map((l) => l.productId))).all() : [];
  return {
    id: order.id,
    number: order.number,
    code: orderCode(order.number),
    status: order.status as OrderStatus,
    supplierPartyId: order.supplierPartyId,
    supplierName: supplier?.legalName ?? "—",
    warehouseId: order.warehouseId,
    warehouseName: warehouse?.name ?? "—",
    total: toNumber(order.total),
    subtotal: toNumber(order.subtotal),
    taxTotal: toNumber(order.taxTotal),
    expectedDate: order.expectedDate ?? null,
    createdAt: new Date(msOf(order.createdAt) ?? 0).toISOString(),
    note: order.note ?? null,
    lineCount: lines.length,
    pendingUnits: lines.reduce((s, l) => s + (l.quantity - l.receivedQuantity), 0),
    lines: lines.map((l) => ({ id: l.id, productId: l.productId, productName: products.find((p) => p.id === l.productId)?.name ?? "—", variantId: l.variantId ?? null, quantity: l.quantity, receivedQuantity: l.receivedQuantity, unitCost: toNumber(l.unitCost), taxRatePct: toNumber(l.taxRatePct) })),
    invoices: invoices.map((i) => ({ id: i.id, number: i.number, issueDate: i.issueDate, dueDate: i.dueDate ?? null, total: toNumber(i.total), status: i.status })),
  };
}

async function setStatus(tenantId: string, id: string, allowed: (status: OrderStatus, receivedUnits: number) => boolean, to: OrderStatus, message: string): Promise<PurchaseResult> {
  const order = await db.orm.public.PurchaseOrder.where({ tenantId, id }).first();
  if (!order) return { ok: false, message: "No se encontró la orden." };
  const lines = await db.orm.public.PurchaseOrderLine.where({ tenantId, orderId: id }).all();
  if (!allowed(order.status as OrderStatus, lines.reduce((s, l) => s + l.receivedQuantity, 0))) return { ok: false, message };
  // Solo si sigue en el estado que se leyó (otra persona pudo haberla recibido a la vez).
  const updated = await db.orm.public.PurchaseOrder.where({ tenantId, id, status: order.status }).update({ status: to });
  return updated ? { ok: true } : { ok: false, message: "La orden cambió mientras la revisabas. Recarga e intenta de nuevo." };
}

export const markOrdered = (tenantId: string, id: string) => setStatus(tenantId, id, (s) => canMarkOrdered(s), "ORDERED", "Solo un borrador se marca como pedido.");
export const cancelOrder = (tenantId: string, id: string) => setStatus(tenantId, id, (s, received) => canCancel(s, received), "CANCELED", "Solo se cancela una orden sin mercancía recibida.");
export const closeOrder = (tenantId: string, id: string) => setStatus(tenantId, id, (s) => canClose(s), "RECEIVED", "Solo se cierra una orden recibida en parte.");

export type SupplierInvoiceInput = { supplierPartyId: string; purchaseOrderId?: string | null; number: string; issueDate: string; dueDate?: string | null; subtotal: number; taxTotal?: number; total: number; cufe?: string | null };

function checkInvoice(input: SupplierInvoiceInput): string | null {
  if (!input.number.trim()) return "Escribe el número de la factura del proveedor.";
  if (!DATE.test(input.issueDate)) return "La fecha de la factura no es válida.";
  if (input.dueDate && (!DATE.test(input.dueDate) || input.dueDate < input.issueDate)) return "El vencimiento debe ser igual o posterior a la emisión.";
  if (![input.subtotal, input.total].every((n) => Number.isFinite(n) && n >= 0)) return "Los valores de la factura no son válidos.";
  return null;
}

export async function registerSupplierInvoice(tenantId: string, input: SupplierInvoiceInput): Promise<PurchaseResult<{ id: string }>> {
  const bad = checkInvoice(input);
  if (bad) return { ok: false, message: bad };
  const number = input.number.trim().slice(0, 60);
  const supplier = await db.orm.public.Party.where({ tenantId, id: input.supplierPartyId }).first();
  if (!supplier) return { ok: false, message: "El proveedor no es de este negocio." };
  if (input.purchaseOrderId && !(await db.orm.public.PurchaseOrder.where({ tenantId, id: input.purchaseOrderId, supplierPartyId: supplier.id }).first())) return { ok: false, message: "La orden no es de este proveedor." };
  if (await db.orm.public.SupplierInvoice.where({ tenantId, supplierPartyId: supplier.id, number }).first()) return { ok: false, code: "duplicate_invoice", message: "Esa factura de este proveedor ya está registrada." };
  try {
    const created = await db.orm.public.SupplierInvoice.create({
      tenantId,
      supplierPartyId: supplier.id,
      purchaseOrderId: input.purchaseOrderId ?? null,
      number,
      issueDate: input.issueDate,
      dueDate: input.dueDate || null,
      subtotal: money(input.subtotal),
      taxTotal: money(input.taxTotal ?? 0),
      total: money(input.total),
      cufe: input.cufe?.trim().slice(0, 120) || null,
    });
    return { ok: true, id: created.id };
  } catch (error) {
    if (/unique|duplicate key/i.test(String((error as Error)?.message ?? error))) return { ok: false, code: "duplicate_invoice", message: "Esa factura de este proveedor ya está registrada." };
    throw error;
  }
}

export type ReceiveInput = { items: { lineId: string; quantity: number }[]; invoice?: Omit<SupplierInvoiceInput, "supplierPartyId" | "purchaseOrderId"> | null };

/**
 * Recibe mercancía: por cada línea sube el inventario de la bodega de la orden
 * con el costo de la línea (recalcula el costo promedio) y deja la línea del
 * kardex con el documento de la compra. Todo o nada: si una línea falla, no
 * entra ninguna. Recibir más de lo pedido o dos veces lo mismo es imposible.
 */
export async function receiveOrder(tenantId: string, orderId: string, input: ReceiveInput, userId: string | null): Promise<PurchaseResult<{ status: OrderStatus; received: number }>> {
  const items = input.items.filter((i) => i.quantity > 0);
  if (!items.length) return { ok: false, message: "Indica cuánto llegó de al menos un producto." };
  if (items.some((i) => !Number.isInteger(i.quantity))) return { ok: false, message: "Las cantidades deben ser enteras." };
  if (new Set(items.map((i) => i.lineId)).size !== items.length) return { ok: false, message: "Una línea aparece repetida." };
  if (input.invoice) {
    const bad = checkInvoice({ ...input.invoice, supplierPartyId: "x" });
    if (bad) return { ok: false, message: bad };
  }

  try {
    return await moneyTransaction(async (tx) => {
      const order = await tx.orm.public.PurchaseOrder.where({ tenantId, id: orderId }).first();
      if (!order) throw new PurchaseError("No se encontró la orden.");
      if (!canReceive(order.status as OrderStatus)) throw new PurchaseError("Esta orden ya no admite recepciones.", "not_receivable");

      let received = 0;
      for (const item of items) {
        const line = await tx.orm.public.PurchaseOrderLine.where({ tenantId, orderId, id: item.lineId }).first();
        if (!line) throw new PurchaseError("Una línea no pertenece a esta orden.");
        if (item.quantity > line.quantity - line.receivedQuantity) throw new PurchaseError(`Solo faltan ${line.quantity - line.receivedQuantity} por recibir de esa línea.`, "over_receipt");

        // Marca lo recibido solo si nadie lo cambió desde la lectura (dos recepciones a la vez no duplican).
        const plan = tx.sql.public.PurchaseOrderLine.update({ receivedQuantity: line.receivedQuantity + item.quantity })
          .where((f, fns) => fns.and(fns.eq(f.id, line.id), fns.eq(f.tenantId, tenantId), fns.eq(f.receivedQuantity, line.receivedQuantity)))
          .returning("id")
          .build();
        if ((await tx.query(plan)).length === 0) throw new PurchaseError("La orden cambió mientras se recibía. Recarga e intenta de nuevo.", "conflict");

        await applyStockMovement(tx, tenantId, {
          productId: line.productId,
          variantId: line.variantId,
          warehouseId: order.warehouseId,
          kind: "IN",
          quantity: item.quantity,
          unitCost: toNumber(line.unitCost),
          note: `Recepción ${orderCode(order.number)}`,
          documentType: "PURCHASE",
          documentId: order.id,
          userId,
        });
        received += item.quantity;
      }

      const after = await tx.orm.public.PurchaseOrderLine.where({ tenantId, orderId }).all();
      const status = nextStatus(after);
      await tx.orm.public.PurchaseOrder.where({ tenantId, id: orderId }).update({ status });

      if (input.invoice) {
        const dup = await tx.orm.public.SupplierInvoice.where({ tenantId, supplierPartyId: order.supplierPartyId, number: input.invoice.number.trim().slice(0, 60) }).first();
        if (dup) throw new PurchaseError("Esa factura de este proveedor ya está registrada.", "duplicate_invoice");
        await tx.orm.public.SupplierInvoice.create({
          tenantId,
          supplierPartyId: order.supplierPartyId,
          purchaseOrderId: order.id,
          number: input.invoice.number.trim().slice(0, 60),
          issueDate: input.invoice.issueDate,
          dueDate: input.invoice.dueDate || null,
          subtotal: money(input.invoice.subtotal),
          taxTotal: money(input.invoice.taxTotal ?? 0),
          total: money(input.invoice.total),
          cufe: input.invoice.cufe?.trim().slice(0, 120) || null,
        });
      }
      return { ok: true as const, status, received };
    });
  } catch (error) {
    if (error instanceof PurchaseError) return { ok: false, message: error.message, code: error.code };
    if (error instanceof StockError) return { ok: false, message: error.message, code: "stock" };
    throw error;
  }
}
