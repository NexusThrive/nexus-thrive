import { toNumber } from "@/lib/foundation/format";
import { balanceOf } from "@/lib/foundation/kernel/aging";
import type { DbTransaction } from "@/lib/foundation/db/db-transaction";
import { db } from "@/prisma/db";

/**
 * Obligaciones (HU-obligaciones-01, ADR 0008): lo que un cliente debe por un pedido de la tienda o una membresía, con
 * monto, saldo y vencimiento. Las facturas y cuentas de cobro ya llevan su propio saldo (`Invoice.paidTotal`), por eso no
 * se duplican aquí; la cartera junta ambas. Todo por `tenantId`; un origen tiene una sola obligación.
 */
export type ObligationOrigin = "STORE_ORDER" | "MEMBERSHIP";

const round2 = (n: number) => Math.round(n * 100) / 100;
const dec = (n: number) => n.toFixed(2);

export type OpenObligationInput = {
  originType: ObligationOrigin;
  originId: string;
  customerId?: string | null;
  debtorName: string;
  description: string;
  amount: number;
  dueDate: Temporal.Instant;
};

/** Abre la obligación de un origen dentro de la transacción de quien lo crea. Si ya existe, la deja como está. Un monto de cero no genera deuda. */
export async function openObligation(tx: DbTransaction, tenantId: string, input: OpenObligationInput): Promise<void> {
  if (!(input.amount > 0)) return;
  const exists = await tx.orm.public.Obligation.where({ tenantId, originType: input.originType, originId: input.originId }).select("id").first();
  if (exists) return;
  await tx.orm.public.Obligation.create({
    tenantId,
    originType: input.originType,
    originId: input.originId,
    customerId: input.customerId ?? null,
    debtorName: input.debtorName.trim().slice(0, 120) || "Cliente",
    description: input.description.trim().slice(0, 160),
    amount: dec(input.amount),
    dueDate: input.dueDate,
  });
}

/**
 * Aplica un cobro a la obligación abierta de un origen y la cierra cuando el saldo llega a cero. Una membresía puede
 * tener varias (inscripción y renovaciones: `originId` = id de la membresía o `id:fecha`); se aplica a la más antigua.
 * La actualización exige el saldo anterior, así dos cobros a la vez no se pisan. Sin obligación abierta no hace nada.
 */
export async function applyToObligation(tx: DbTransaction, tenantId: string, originType: ObligationOrigin, originId: string, amount: number): Promise<{ obligationId: string; amount: number }[]> {
  const applied: { obligationId: string; amount: number }[] = [];
  let left = round2(amount);
  // Si otro cobro tocó la misma deuda entre la lectura y la escritura, se vuelve a leer y se sigue con lo que falta.
  for (let attempt = 0; attempt < 4 && left > 0; attempt++) {
    const open = await tx.orm.public.Obligation.where({ tenantId, originType, status: "OPEN" }).where((o) => o.originId.ilike(`${originId}%`)).orderBy((o) => o.dueDate.asc()).all();
    let conflict = false;
    for (const o of open) {
      if (left <= 0) break;
      if (o.originId !== originId && !o.originId.startsWith(`${originId}:`)) continue;
      const total = toNumber(o.amount);
      const paidBefore = toNumber(o.paidTotal);
      const apply = round2(Math.min(left, balanceOf(total, paidBefore)));
      if (apply <= 0) continue;
      const paid = round2(paidBefore + apply);
      const plan = tx.sql.public.Obligation.update({ paidTotal: dec(paid), ...(paid >= total ? { status: "PAID" } : {}) })
        .where((f, fns) => fns.and(fns.eq(f.id, o.id), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "OPEN"), fns.eq(f.paidTotal, dec(paidBefore))))
        .returning("id")
        .build();
      if ((await tx.query(plan)).length === 0) {
        conflict = true;
        break;
      }
      left = round2(left - apply);
      applied.push({ obligationId: o.id, amount: apply });
    }
    if (!conflict) break;
  }
  return applied;
}

/** Anula las obligaciones abiertas de un origen y sus cuotas (`id:saldo`) cuando el pedido se canceló o se abandonó. Lo ya cobrado queda registrado en `paidTotal`. */
export async function voidObligations(tx: DbTransaction, tenantId: string, originType: ObligationOrigin, originId: string): Promise<void> {
  const open = await tx.orm.public.Obligation.where({ tenantId, originType, status: "OPEN" }).where((o) => o.originId.ilike(`${originId}%`)).select("id", "originId").all();
  for (const o of open) {
    if (o.originId !== originId && !o.originId.startsWith(`${originId}:`)) continue;
    const plan = tx.sql.public.Obligation.update({ status: "VOID" })
      .where((f, fns) => fns.and(fns.eq(f.id, o.id), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "OPEN")))
      .returning("id")
      .build();
    await tx.query(plan);
  }
}

export type ObligationRow = { id: string; originType: ObligationOrigin; originId: string; debtorName: string; description: string; amount: number; paidTotal: number; dueDate: string; status: string };

/** Obligaciones abiertas del negocio, las que vencen primero arriba (tope de seguridad de 1000). */
export async function listOpenObligations(tenantId: string): Promise<ObligationRow[]> {
  const rows = await db.orm.public.Obligation.where({ tenantId, status: "OPEN" }).orderBy((o) => o.dueDate.asc()).limit(1000).all();
  return rows.map((o) => ({ id: o.id, originType: o.originType as ObligationOrigin, originId: o.originId, debtorName: o.debtorName, description: o.description, amount: toNumber(o.amount), paidTotal: toNumber(o.paidTotal), dueDate: String(o.dueDate), status: o.status }));
}
