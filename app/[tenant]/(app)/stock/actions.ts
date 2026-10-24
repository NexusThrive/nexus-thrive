"use server";

import { revalidatePath } from "next/cache";
import { canManage } from "@/lib/business/roles";
import { createWarehouse } from "@/lib/inventory/kardex";
import { cancelCount, createCount, createTransfer, finalizeCount, getCount, saveCountLines, setReorderLevels, type CountDetail, type TransferInput } from "@/lib/inventory/stock-docs-db";
import { logTenantAction } from "@/lib/tenant/audit";
import { requireTenantContext } from "@/lib/tenant/context";

export type StockResult = { ok: true; message: string; id?: string } | { ok: false; message: string };
const DENIED = { ok: false as const, message: "Solo el dueño o administración maneja el inventario." };

async function manager(slug: string) {
  const ctx = await requireTenantContext(slug, "/stock");
  return ctx && canManage(ctx.role) ? ctx : null;
}
const refresh = (slug: string) => {
  revalidatePath(`/${slug}/stock`);
  revalidatePath(`/${slug}/inventory`);
};

export async function createTransferAction(slug: string, input: TransferInput): Promise<StockResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await createTransfer(ctx.tenantId, input, ctx.memberId);
  if (!r.ok) return { ok: false, message: r.message };
  await logTenantAction(ctx, "BIZ_STOCK_TRANSFER", { transferId: r.id, code: r.code, lines: input.lines.length });
  refresh(slug);
  return { ok: true, id: r.id, message: `Traslado ${r.code} hecho` };
}

export async function createCountAction(slug: string, warehouseId: string): Promise<StockResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await createCount(ctx.tenantId, warehouseId, ctx.memberId);
  if (!r.ok) return { ok: false, message: r.message };
  refresh(slug);
  return { ok: true, id: r.id, message: `Conteo ${r.code} abierto con ${r.lines} productos` };
}

export async function countDetailAction(slug: string, id: string): Promise<{ ok: true; count: CountDetail } | { ok: false; message: string }> {
  const ctx = await manager(slug);
  if (!ctx) return { ok: false, message: DENIED.message };
  const count = await getCount(ctx.tenantId, id);
  return count ? { ok: true, count } : { ok: false, message: "No se encontró el conteo." };
}

export async function saveCountAction(slug: string, id: string, items: { lineId: string; counted: number | null }[]): Promise<StockResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await saveCountLines(ctx.tenantId, id, items);
  if (!r.ok) return { ok: false, message: r.message };
  refresh(slug);
  return { ok: true, message: "Avance guardado" };
}

export async function finalizeCountAction(slug: string, id: string, note: string): Promise<StockResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await finalizeCount(ctx.tenantId, id, note, ctx.memberId);
  if (!r.ok) return { ok: false, message: r.message };
  await logTenantAction(ctx, "BIZ_STOCK_COUNT", { countId: id, adjusted: r.adjusted, units: r.units, reason: note.trim().slice(0, 100) });
  refresh(slug);
  return { ok: true, message: r.adjusted ? `Conteo cerrado: ${r.adjusted} ${r.adjusted === 1 ? "ajuste" : "ajustes"} (${r.units} unidades) en el kardex` : "Conteo cerrado sin diferencias" };
}

export async function cancelCountAction(slug: string, id: string): Promise<StockResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await cancelCount(ctx.tenantId, id);
  if (!r.ok) return { ok: false, message: r.message };
  refresh(slug);
  return { ok: true, message: "Conteo cancelado" };
}

export async function setLevelsAction(slug: string, productId: string, levels: { minStock: number; maxStock: number | null; reorderPoint: number | null }): Promise<StockResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await setReorderLevels(ctx.tenantId, productId, levels);
  if (!r.ok) return { ok: false, message: r.message };
  refresh(slug);
  return { ok: true, message: "Niveles guardados" };
}

export async function createWarehouseAction(slug: string, input: { name: string; code: string }): Promise<StockResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await createWarehouse(ctx.tenantId, { name: input.name, code: input.code || null });
  if (!r.ok) return { ok: false, message: r.message };
  await logTenantAction(ctx, "BIZ_WAREHOUSE_CREATE", { warehouseId: r.id, name: input.name.slice(0, 80) });
  refresh(slug);
  return { ok: true, id: r.id, message: "Bodega creada" };
}
