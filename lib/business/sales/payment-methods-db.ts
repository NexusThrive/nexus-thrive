import { db } from "@/prisma/db";
import { DEFAULT_METHODS, MAX_METHODS, isMethodKind, offeredMethods, validateMethod, type MethodDraft, type PaymentMethodOption } from "./payment-methods";

/** Medios de pago del negocio. Sin filas propias, el negocio ofrece los dos básicos (Efectivo y Transferencia). */
export async function listPaymentMethods(tenantId: string): Promise<PaymentMethodOption[]> {
  const rows = await db.orm.public.PaymentMethodSetting.where({ tenantId }).orderBy((m) => m.position.asc()).limit(100).all();
  if (rows.length === 0) return DEFAULT_METHODS.map((m) => ({ ...m }));
  return rows.flatMap((r) => (isMethodKind(r.kind) ? [{ id: r.id, kind: r.kind, name: r.name, instructions: r.instructions, active: r.active, position: r.position }] : []));
}

export async function offeredPaymentMethods(tenantId: string): Promise<PaymentMethodOption[]> {
  const offered = offeredMethods(await listPaymentMethods(tenantId));
  return offered.length ? offered : DEFAULT_METHODS.map((m) => ({ ...m }));
}

export type MethodResult = { ok: true; id?: string } | { ok: false; message: string };

/** La primera vez que el negocio toca su lista, los básicos se vuelven filas suyas para poder editarlos y ordenarlos. */
async function materialize(tenantId: string): Promise<PaymentMethodOption[]> {
  const rows = await db.orm.public.PaymentMethodSetting.where({ tenantId }).select("id").limit(1).all();
  if (rows.length === 0) {
    await db.orm.public.PaymentMethodSetting.createAll(DEFAULT_METHODS.map((m) => ({ tenantId, kind: m.kind, name: m.name, instructions: null, active: true, position: m.position }))).toArray();
  }
  return listPaymentMethods(tenantId);
}

export async function saveMethod(tenantId: string, draft: MethodDraft, id?: string): Promise<MethodResult> {
  const current = await materialize(tenantId);
  const checked = validateMethod(draft, current, id);
  if (!checked.ok) return checked;
  if (id) {
    const found = current.find((m) => m.id === id);
    if (!found) return { ok: false, message: "No encontramos ese medio de pago." };
    await db.orm.public.PaymentMethodSetting.where({ tenantId, id }).update(checked.value);
    return { ok: true, id };
  }
  if (current.length >= MAX_METHODS) return { ok: false, message: `Puedes tener hasta ${MAX_METHODS} medios de pago.` };
  const created = await db.orm.public.PaymentMethodSetting.create({ tenantId, ...checked.value, active: true, position: current.length });
  return { ok: true, id: created.id };
}

export async function setMethodActive(tenantId: string, id: string, active: boolean): Promise<MethodResult> {
  const current = await materialize(tenantId);
  const found = current.find((m) => m.id === id);
  if (!found) return { ok: false, message: "No encontramos ese medio de pago." };
  if (!active && current.filter((m) => m.active && m.id !== id).length === 0) return { ok: false, message: "Deja al menos un medio de pago activo." };
  await db.orm.public.PaymentMethodSetting.where({ tenantId, id }).update({ active });
  return { ok: true, id };
}

/** Sube o baja un medio un lugar en el orden en que se ofrecen. */
export async function moveMethod(tenantId: string, id: string, direction: -1 | 1): Promise<MethodResult> {
  const current = (await materialize(tenantId)).sort((a, b) => a.position - b.position);
  const at = current.findIndex((m) => m.id === id);
  const to = at + direction;
  if (at < 0 || to < 0 || to >= current.length) return { ok: true, id };
  const next = [...current];
  [next[at], next[to]] = [next[to]!, next[at]!];
  for (const [position, m] of next.entries()) {
    if (m.position !== position) await db.orm.public.PaymentMethodSetting.where({ tenantId, id: m.id }).update({ position });
  }
  return { ok: true, id };
}

/** Los pagos viejos guardan el nombre en sus notas, así que un medio se puede borrar sin perder historia. */
export async function deleteMethod(tenantId: string, id: string): Promise<MethodResult> {
  const current = await materialize(tenantId);
  const found = current.find((m) => m.id === id);
  if (!found) return { ok: false, message: "No encontramos ese medio de pago." };
  if (current.filter((m) => m.active && m.id !== id).length === 0) return { ok: false, message: "Deja al menos un medio de pago activo." };
  await db.orm.public.PaymentMethodSetting.where({ tenantId, id }).delete();
  return { ok: true };
}
