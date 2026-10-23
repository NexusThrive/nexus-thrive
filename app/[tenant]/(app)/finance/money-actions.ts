"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/prisma/db";
import { validateCashMovement, type CashKind } from "@/lib/business/cash";
import {
  addAttachment,
  addCashMovement,
  checkAttachment,
  closeCashSession,
  createCashBox,
  currentCashSession,
  listAttachments,
  listCashBoxes,
  receiptToken,
  openCashSession,
  updateCashBox,
  voidPayment,
} from "@/lib/business/finance-db";
import { parseMoney } from "@/lib/business/money";
import { canHandleCash, canManage } from "@/lib/business/roles";
import { requireTenantContext } from "@/lib/tenant/context";
import { getAppBaseUrl } from "@/lib/app-url";
import { logTenantAction } from "@/lib/tenant/audit";

export type MoneyResult = { ok: true; message?: string; id?: string } | { ok: false; message: string };
const DENIED: MoneyResult = { ok: false, message: "Tu rol no permite esta acción." };
const now = () => Temporal.Instant.fromEpochMilliseconds(Date.now());

function refresh(slug: string) {
  revalidatePath(`/${slug}/finance`);
  revalidatePath(`/${slug}`);
}

async function ctxFor(slug: string, need: "cash" | "manage") {
  const ctx = await requireTenantContext(slug);
  if (!ctx) return null;
  return (need === "cash" ? canHandleCash(ctx.role) : canManage(ctx.role)) ? ctx : null;
}

// --- Pagos --------------------------------------------------------------------

export async function voidPaymentAction(slug: string, paymentId: string, reason: string): Promise<MoneyResult> {
  const ctx = await ctxFor(slug, "manage");
  if (!ctx) return DENIED;
  if (reason.trim().length < 3) return { ok: false, message: "Escribe el motivo de la anulación." };
  const r = await voidPayment(ctx.tenantId, paymentId, reason.trim().slice(0, 300), ctx.memberId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_PAYMENT_VOID", { paymentId, reason: reason.trim().slice(0, 300) });
  refresh(slug);
  return { ok: true, message: "Pago anulado" };
}

export async function updatePaymentNotesAction(slug: string, paymentId: string, input: { description: string; notes: string }): Promise<MoneyResult> {
  const ctx = await ctxFor(slug, "cash");
  if (!ctx) return DENIED;
  const p = await db.orm.public.Payment.where({ tenantId: ctx.tenantId, id: paymentId }).select("status").first();
  if (!p) return { ok: false, message: "El pago no existe." };
  if (p.status === "VOIDED") return { ok: false, message: "Un pago anulado no se edita." };
  await db.orm.public.Payment.where({ tenantId: ctx.tenantId, id: paymentId }).update({ description: input.description.trim().slice(0, 200) || null, notes: input.notes.trim().slice(0, 1000) || null });
  refresh(slug);
  return { ok: true, message: "Pago actualizado" };
}

/** Comprobante de un pago o soporte de un gasto (FormData: slug, kind, ownerId, file). */
export async function uploadAttachmentAction(form: FormData): Promise<MoneyResult> {
  const slug = String(form.get("slug") ?? "");
  const ctx = await ctxFor(slug, "cash");
  if (!ctx) return DENIED;
  const kind = String(form.get("kind"));
  const ownerId = String(form.get("ownerId") ?? "");
  if (kind !== "PAYMENT" && kind !== "EXPENSE") return { ok: false, message: "Tipo de archivo no válido." };
  const owner = kind === "PAYMENT" ? await db.orm.public.Payment.where({ tenantId: ctx.tenantId, id: ownerId }).select("id").first() : await db.orm.public.Expense.where({ tenantId: ctx.tenantId, id: ownerId }).select("id").first();
  if (!owner) return { ok: false, message: "No se encontró el registro." };
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return { ok: false, message: "Elige un archivo." };
  const err = checkAttachment(file);
  if (err) return { ok: false, message: err };
  const id = await addAttachment(ctx.tenantId, kind, ownerId, file, ctx.memberId);
  refresh(slug);
  return { ok: true, id, message: "Archivo guardado" };
}

// --- Gastos --------------------------------------------------------------------

export async function voidExpenseAction(slug: string, expenseId: string, reason: string): Promise<MoneyResult> {
  const ctx = await ctxFor(slug, "manage");
  if (!ctx) return DENIED;
  if (reason.trim().length < 3) return { ok: false, message: "Escribe el motivo de la anulación." };
  const e = await db.orm.public.Expense.where({ tenantId: ctx.tenantId, id: expenseId }).first();
  if (!e) return { ok: false, message: "El gasto no existe." };
  if (e.voidedAt) return { ok: false, message: "El gasto ya está anulado." };
  await db.orm.public.Expense.where({ tenantId: ctx.tenantId, id: expenseId }).update({ voidedAt: now(), voidReason: reason.trim().slice(0, 300) });
  // Si salió de una caja todavía abierta, el efectivo vuelve a la caja.
  if (e.cashSessionId) {
    const s = await db.orm.public.CashSession.where({ tenantId: ctx.tenantId, id: e.cashSessionId }).select("closedAt").first();
    if (s && !s.closedAt) await addCashMovement(ctx.tenantId, { sessionId: e.cashSessionId, kind: "ADJUST", amount: Number(e.amount), description: `Anulación de gasto: ${e.description}`, expenseId }, ctx.memberId);
  }
  await logTenantAction(ctx, "BIZ_EXPENSE_VOID", { expenseId, amount: String(e.amount), reason: reason.trim().slice(0, 300) });
  refresh(slug);
  return { ok: true, message: "Gasto anulado" };
}

// --- Caja menor --------------------------------------------------------------------

export async function saveCashBoxAction(slug: string, input: { id?: string; name: string; fund: string; responsibleUserId: string | null }): Promise<MoneyResult> {
  const ctx = await ctxFor(slug, "manage");
  if (!ctx) return DENIED;
  const fund = parseMoney(input.fund);
  if (input.name.trim().length < 2) return { ok: false, message: "Ponle un nombre a la caja." };
  if (fund == null || fund < 0) return { ok: false, message: "Escribe el monto del fondo." };
  if (input.responsibleUserId && !(await db.orm.public.User.where({ tenantId: ctx.tenantId, id: input.responsibleUserId }).select("id").first())) return { ok: false, message: "El responsable no es del equipo." };
  if (input.id) await updateCashBox(ctx.tenantId, input.id, { name: input.name.trim(), fundAmount: fund, responsibleUserId: input.responsibleUserId });
  else await createCashBox(ctx.tenantId, input.name.trim(), fund, input.responsibleUserId);
  refresh(slug);
  return { ok: true, message: input.id ? "Caja actualizada" : "Caja creada" };
}

export async function openCashAction(slug: string, boxId: string, opening: string): Promise<MoneyResult> {
  const ctx = await ctxFor(slug, "cash");
  if (!ctx) return DENIED;
  const amount = parseMoney(opening);
  if (amount == null || amount < 0) return { ok: false, message: "Escribe con cuánto efectivo abres la caja." };
  if (!(await db.orm.public.CashBox.where({ tenantId: ctx.tenantId, id: boxId }).select("id").first())) return { ok: false, message: "La caja no existe." };
  const r = await openCashSession(ctx.tenantId, boxId, amount, ctx.memberId);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: "Caja abierta" };
}

export async function cashMovementAction(slug: string, input: { kind: string; amount: string; description: string; beneficiary?: string }): Promise<MoneyResult> {
  const ctx = await ctxFor(slug, "cash");
  if (!ctx) return DENIED;
  const cash = await currentCashSession(ctx.tenantId);
  if (!cash) return { ok: false, message: "No hay una caja abierta." };
  if (input.kind === "ADJUST" && !canManage(ctx.role)) return DENIED;
  const amount = parseMoney(input.amount);
  const err = validateCashMovement({ kind: input.kind, amount, description: input.description, beneficiary: input.beneficiary }, cash.available);
  if (err) return { ok: false, message: err };
  await addCashMovement(ctx.tenantId, { sessionId: cash.sessionId, kind: input.kind as CashKind, amount: amount!, description: input.description.trim().slice(0, 200), beneficiary: input.beneficiary?.trim() || null }, ctx.memberId);
  refresh(slug);
  return { ok: true, message: "Movimiento registrado" };
}

export async function closeCashAction(slug: string, counted: string, notes: string): Promise<MoneyResult> {
  const ctx = await ctxFor(slug, "cash");
  if (!ctx) return DENIED;
  const cash = await currentCashSession(ctx.tenantId);
  if (!cash) return { ok: false, message: "No hay una caja abierta." };
  const n = parseMoney(counted);
  if (n == null || n < 0) return { ok: false, message: "Escribe cuánto efectivo contaste." };
  const r = await closeCashSession(ctx.tenantId, cash.sessionId, n, notes.trim().slice(0, 500) || null, ctx.memberId);
  if (!r.ok) return r;
  refresh(slug);
  const diff = Math.round((n - r.expected) * 100) / 100;
  return { ok: true, message: Math.abs(diff) < 1 ? "Caja cerrada: cuadra" : diff > 0 ? `Caja cerrada: sobran $${diff.toLocaleString("es-CO")}` : `Caja cerrada: faltan $${Math.abs(diff).toLocaleString("es-CO")}` };
}

export async function cashBoxesAction(slug: string) {
  const ctx = await requireTenantContext(slug);
  return ctx ? listCashBoxes(ctx.tenantId) : [];
}

/** Detalle para la ficha de un pago o un gasto: archivos y enlace del recibo. */
export async function moneyDetailAction(slug: string, kind: "PAYMENT" | "EXPENSE", id: string) {
  const ctx = await requireTenantContext(slug);
  if (!ctx) return null;
  const files = await listAttachments(ctx.tenantId, kind, [id]);
  return {
    files,
    link: kind === "PAYMENT" ? `${await getAppBaseUrl()}/r/${receiptToken(id)}` : null,
    canManage: canManage(ctx.role),
  };
}
