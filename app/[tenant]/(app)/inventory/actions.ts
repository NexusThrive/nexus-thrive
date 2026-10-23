"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/prisma/db";
import { kindsForVertical, validateProduct, type ProductDraft } from "@/lib/business/catalog-kinds";
import { addCashMovement, assignReceiptNumber, currentCashSession } from "@/lib/business/finance-db";
import { receiptCode } from "@/lib/business/invoice";
import { validateStockMove, type StockKind } from "@/lib/business/inventory";
import { getProduct, moveStock, saveProduct, stockHistory } from "@/lib/business/products-db";
import { canHandleCash, canManage } from "@/lib/business/roles";
import { PAYMENT_METHODS } from "@/lib/finance";
import { requireTenantContext } from "@/lib/tenant/context";

export type CatalogResult = { ok: true; message?: string; id?: string; receipt?: string } | { ok: false; message: string; errors?: Partial<Record<keyof ProductDraft, string>> };
const DENIED: CatalogResult = { ok: false, message: "Tu rol no permite esta acción." };

function refresh(slug: string) {
  revalidatePath(`/${slug}/inventory`);
  revalidatePath(`/${slug}/finance`);
  revalidatePath(`/${slug}`);
}

export async function saveProductAction(slug: string, id: string | null, d: ProductDraft): Promise<CatalogResult> {
  const ctx = await requireTenantContext(slug);
  if (!ctx || !canManage(ctx.role)) return DENIED;
  if (!kindsForVertical(ctx.vertical).includes(d.kind)) return { ok: false, message: "Ese tipo no aplica a tu rubro." };
  const v = validateProduct(d);
  if (!v.ok) return { ok: false, message: "Revisa los campos marcados.", errors: v.errors };
  if (id && !(await getProduct(ctx.tenantId, id))) return { ok: false, message: "No se encontró." };
  const t = (x: string) => x.trim() || null;
  const productId = await saveProduct(
    ctx.tenantId,
    id,
    {
      kind: d.kind,
      name: d.name.trim().slice(0, 120),
      description: t(d.description)?.slice(0, 500) ?? null,
      sku: t(d.sku)?.slice(0, 40) ?? null,
      category: t(d.category)?.slice(0, 60) ?? null,
      price: d.price!,
      cost: d.cost,
      trackStock: d.kind === "PRODUCT" ? d.trackStock : false,
      minStock: d.minStock ?? 0,
      unit: t(d.unit)?.slice(0, 20) ?? null,
      durationMinutes: d.durationMinutes,
      durationDays: d.kind === "PLAN" ? d.durationDays : null,
      capacity: d.capacity,
      active: d.active,
      initialStock: d.initialStock ?? 0,
    },
    ctx.memberId,
  );
  refresh(slug);
  return { ok: true, id: productId, message: id ? "Guardado" : "Creado" };
}

export async function moveStockAction(slug: string, productId: string, kind: string, quantity: number, note: string): Promise<CatalogResult> {
  const ctx = await requireTenantContext(slug);
  if (!ctx || !canManage(ctx.role)) return DENIED;
  if (!["IN", "OUT", "ADJUST"].includes(kind)) return { ok: false, message: "Movimiento no válido." };
  const p = await getProduct(ctx.tenantId, productId);
  if (!p || !p.trackStock) return { ok: false, message: "Este producto no lleva inventario." };
  const err = validateStockMove(p.stock, kind as StockKind, quantity);
  if (err) return { ok: false, message: err };
  if (kind !== "IN" && note.trim().length < 3) return { ok: false, message: "Explica el motivo (salida o ajuste)." };
  await moveStock(ctx.tenantId, productId, kind as StockKind, quantity, note.trim().slice(0, 200) || null, ctx.memberId);
  refresh(slug);
  return { ok: true, message: "Inventario actualizado" };
}

/** Venta directa: crea el cobro con recibo, descuenta stock y, si es efectivo con caja abierta, entra a la caja. */
export async function sellProductAction(slug: string, productId: string, input: { quantity: number; method: string; customerId: string | null }): Promise<CatalogResult> {
  const ctx = await requireTenantContext(slug);
  if (!ctx || !canHandleCash(ctx.role)) return DENIED;
  const p = await getProduct(ctx.tenantId, productId);
  if (!p || !p.active) return { ok: false, message: "No se encontró." };
  if (!PAYMENT_METHODS.some((m) => m.value === input.method)) return { ok: false, message: "Elige el medio de pago." };
  const qty = Math.round(input.quantity);
  if (!(qty > 0)) return { ok: false, message: "La cantidad debe ser mayor que cero." };
  if (p.trackStock) {
    const err = validateStockMove(p.stock, "SALE", qty);
    if (err) return { ok: false, message: err };
  }
  if (input.customerId && !(await db.orm.public.Customer.where({ tenantId: ctx.tenantId, id: input.customerId }).select("id").first())) return { ok: false, message: "El cliente no es de este negocio." };
  const total = Math.round(p.price * qty * 100) / 100;
  const payment = await db.orm.public.Payment.create({
    tenantId: ctx.tenantId,
    customerId: input.customerId,
    amount: total.toFixed(2),
    status: "APPROVED",
    provider: input.method as "CASH",
    description: `${qty > 1 ? `${qty} × ` : ""}${p.name}`,
    sourceType: "SALE",
    sourceId: p.id,
  });
  const number = await assignReceiptNumber(ctx.tenantId, payment.id);
  if (p.trackStock) await moveStock(ctx.tenantId, p.id, "SALE", qty, `Venta ${receiptCode(number)}`, ctx.memberId, payment.id);
  if (input.method === "CASH") {
    const cash = await currentCashSession(ctx.tenantId);
    if (cash) {
      await db.orm.public.Payment.where({ tenantId: ctx.tenantId, id: payment.id }).update({ cashSessionId: cash.sessionId });
      await addCashMovement(ctx.tenantId, { sessionId: cash.sessionId, kind: "INCOME", amount: total, description: `Venta: ${p.name}`, paymentId: payment.id }, ctx.memberId);
    }
  }
  refresh(slug);
  return { ok: true, message: `Venta registrada · ${receiptCode(number)}`, receipt: receiptCode(number), id: payment.id };
}

export async function stockHistoryAction(slug: string, productId: string) {
  const ctx = await requireTenantContext(slug);
  return ctx ? stockHistory(ctx.tenantId, productId) : [];
}
