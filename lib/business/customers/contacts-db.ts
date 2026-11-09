import { customerLimit } from "@/lib/core/tenancy/customer-limit";
import { syncCustomerParty } from "@/lib/core/parties/parties-db";
import type { DbWriter } from "@/lib/foundation/db/db-transaction";
import { withinLimit } from "@/lib/foundation/limits";
import { canonicalPhone, isIdentifyingPhone, namesCompatible, stageForPaidCount, type ContactStage } from "@/lib/foundation/kernel/phone";
import { db } from "@/prisma/db";

/**
 * Contacto único (HU-contacto-unico-01): una persona, una ficha, venga de donde venga (tienda, formulario web, registro,
 * importación, WhatsApp). La encuentra por teléfono canónico (o correo) dentro del negocio. Si el teléfono coincide pero el
 * nombre es otro, NO se fusionan solos: se crea otra ficha marcada «posible duplicado» y se propone revisarla. Todo por `tenantId`.
 */
export type ContactSource = "WEB" | "STORE" | "REGISTRATION" | "IMPORT" | "WHATSAPP" | "MANUAL";
export type ContactInput = { name: string; phone?: string | null; email?: string | null; source: ContactSource; stage?: ContactStage; consent?: boolean };
export type ContactResult = { id: string; created: boolean; conflict: boolean } | null;

export const POSSIBLE_DUPLICATE_TAG = "posible duplicado";
const STAGE_ORDER: Record<ContactStage, number> = { PROSPECT: 0, CUSTOMER: 1, RECURRING: 2 };

/**
 * Encuentra o crea el contacto. Devuelve `null` solo si el acuerdo del negocio ya no admite más clientes (el pedido o el formulario
 * siguen su curso sin ficha). Nunca baja la etapa de una ficha existente ni borra lo que ya tiene.
 */
export async function findOrCreateContact(tx: DbWriter, tenantId: string, input: ContactInput): Promise<ContactResult> {
  const name = input.name.trim().slice(0, 120);
  const phoneNorm = canonicalPhone(input.phone);
  const email = input.email?.trim().toLowerCase() || null;
  const stage = input.stage ?? "PROSPECT";
  let conflict = false;

  const sameId: { id: string; name: string; email: string | null; phone: string | null; stage: string; source: string | null }[] = [];
  if (isIdentifyingPhone(phoneNorm)) sameId.push(...(await tx.orm.public.Customer.where({ tenantId, phoneNorm }).orderBy((c) => c.createdAt.asc()).limit(10).all()));
  if (!sameId.length && email) sameId.push(...(await tx.orm.public.Customer.where({ tenantId, email }).orderBy((c) => c.createdAt.asc()).limit(10).all()));

  const match = sameId.find((c) => namesCompatible(c.name, name));
  if (match) {
    const upgraded = STAGE_ORDER[stage] > STAGE_ORDER[match.stage as ContactStage] ? stage : null;
    await tx.orm.public.Customer.where({ tenantId, id: match.id }).update({
      ...(match.email ? {} : email ? { email } : {}),
      ...(match.phone ? {} : input.phone ? { phone: input.phone.trim().slice(0, 30), phoneNorm } : {}),
      ...(match.source ? {} : { source: input.source }),
      ...(upgraded ? { stage: upgraded } : {}),
      ...(input.consent ? { consentAt: Temporal.Instant.fromEpochMilliseconds(Date.now()) } : {}),
    });
    return { id: match.id, created: false, conflict: false };
  }
  conflict = sameId.length > 0;

  const { limit, used } = await customerLimit(tenantId);
  if (!withinLimit(limit, used)) return null;
  const created = await tx.orm.public.Customer.create({
    tenantId,
    name: name || "Cliente",
    email,
    phone: input.phone?.trim().slice(0, 30) || null,
    phoneNorm: phoneNorm || null,
    source: input.source,
    stage,
    consentAt: input.consent ? Temporal.Instant.fromEpochMilliseconds(Date.now()) : null,
    tags: conflict ? [POSSIBLE_DUPLICATE_TAG] : [],
    active: true,
  });
  await syncCustomerParty(tenantId, created.id);
  return { id: created.id, created: true, conflict };
}

/** Sube la etapa del cliente según sus compras pagadas (prospecto → cliente → recurrente). Nunca la baja. */
export async function refreshStageFromPaidOrders(tx: DbWriter, tenantId: string, customerId: string): Promise<void> {
  const customer = await tx.orm.public.Customer.where({ tenantId, id: customerId }).select("stage").first();
  if (!customer) return;
  const paid = (await tx.orm.public.StoreOrder.where({ tenantId, customerId, status: "PAID" }).select("id").limit(50).all()).length;
  const next = stageForPaidCount(paid);
  if (STAGE_ORDER[next] > STAGE_ORDER[customer.stage as ContactStage]) await tx.orm.public.Customer.where({ tenantId, id: customerId }).update({ stage: next });
}

export type DuplicateGroup = { phoneNorm: string; contacts: { id: string; name: string; source: string | null; stage: string }[] };

/** Contactos que comparten teléfono con otro: la fusión se PROPONE a una persona, nunca se hace sola. */
export async function duplicateGroups(tenantId: string): Promise<DuplicateGroup[]> {
  const rows = await db.orm.public.Customer.where({ tenantId, active: true }).select("id", "name", "source", "stage", "phoneNorm").limit(5000).all();
  const byPhone = new Map<string, DuplicateGroup["contacts"]>();
  for (const r of rows) {
    if (!r.phoneNorm || !isIdentifyingPhone(r.phoneNorm)) continue;
    byPhone.set(r.phoneNorm, [...(byPhone.get(r.phoneNorm) ?? []), { id: r.id, name: r.name, source: r.source, stage: r.stage }]);
  }
  return [...byPhone.entries()].filter(([, c]) => c.length > 1).map(([phoneNorm, contacts]) => ({ phoneNorm, contacts }));
}
