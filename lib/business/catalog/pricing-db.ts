import { db } from "@/prisma/db";
import { toNumber } from "@/lib/foundation/format";
import { validateTiers, type PriceTierInput } from "./pricing";

/** Qué lista de precios le toca a una persona: la suya, la de su grupo (la primera que tenga) o la predeterminada. Solo listas activas. */
export async function priceListFor(tenantId: string, customerId: string | null | undefined): Promise<string | null> {
  const active = new Set((await db.orm.public.PriceList.where({ tenantId, active: true }).select("id", "isDefault").limit(200).all()).map((l) => l.id));
  const fallback = (await db.orm.public.PriceList.where({ tenantId, active: true, isDefault: true }).select("id").first())?.id ?? null;
  if (!customerId) return fallback;
  const customer = await db.orm.public.Customer.where({ tenantId, id: customerId }).select("priceListId").first();
  if (customer?.priceListId && active.has(customer.priceListId)) return customer.priceListId;
  const memberships = await db.orm.public.CustomerGroupMember.where({ tenantId, customerId }).select("groupId").limit(100).all();
  if (memberships.length) {
    const groups = await db.orm.public.CustomerGroup.where({ tenantId }).where((g) => g.id.in(memberships.map((m) => m.groupId))).select("priceListId").limit(100).all();
    const withList = groups.find((g) => g.priceListId && active.has(g.priceListId));
    if (withList?.priceListId) return withList.priceListId;
  }
  return fallback;
}

export type ListPricing = { list: number | null; tiers: PriceTierInput[] };

/** Precio de lista y escalones por producto en una lista (solo productos que tienen alguno). Sin lista, vacío. */
export async function pricingFor(tenantId: string, listId: string | null, productIds?: readonly string[]): Promise<Record<string, ListPricing>> {
  if (!listId) return {};
  const [items, tiers] = await Promise.all([
    db.orm.public.PriceListItem.where({ tenantId, priceListId: listId }).where((i) => i.variantId.isNull()).select("productId", "price").limit(20_000).all(),
    db.orm.public.PriceTier.where({ tenantId, priceListId: listId }).select("productId", "minQty", "price").limit(20_000).all(),
  ]);
  const want = productIds ? new Set(productIds) : null;
  const out: Record<string, ListPricing> = {};
  const row = (id: string) => (out[id] ??= { list: null, tiers: [] });
  for (const i of items) if (!want || want.has(i.productId)) row(i.productId).list = toNumber(i.price);
  for (const t of tiers) if (!want || want.has(t.productId)) row(t.productId).tiers.push({ minQty: t.minQty, price: toNumber(t.price) });
  return out;
}

/** Escalones de un producto en una lista, de menor a mayor cantidad. */
export async function listTiers(tenantId: string, priceListId: string, productId: string): Promise<PriceTierInput[]> {
  const rows = await db.orm.public.PriceTier.where({ tenantId, priceListId, productId }).orderBy((t) => t.minQty.asc()).limit(20).all();
  return rows.map((t) => ({ minQty: t.minQty, price: toNumber(t.price) }));
}

/** Reemplaza los escalones de un producto en una lista. */
export async function saveTiers(tenantId: string, priceListId: string, productId: string, tiers: PriceTierInput[]): Promise<{ ok: true } | { ok: false; message: string }> {
  const problem = validateTiers(tiers);
  if (problem) return { ok: false, message: problem };
  if (!(await db.orm.public.PriceList.where({ tenantId, id: priceListId }).first())) return { ok: false, message: "Esa lista ya no existe." };
  if (!(await db.orm.public.Product.where({ tenantId, id: productId }).select("id").first())) return { ok: false, message: "Ese producto ya no existe." };
  await db.transaction(async (tx) => {
    await tx.orm.public.PriceTier.where({ tenantId, priceListId, productId }).deleteAll();
    if (tiers.length) await tx.orm.public.PriceTier.createAll(tiers.map((t) => ({ tenantId, priceListId, productId, minQty: t.minQty, price: t.price.toFixed(2) }))).toArray();
  });
  return { ok: true };
}

/** Asigna (o quita, con `null`) la lista de precios de un cliente o de un grupo. */
export async function assignPriceList(tenantId: string, target: { customerId?: string; groupId?: string }, priceListId: string | null): Promise<{ ok: true } | { ok: false; message: string }> {
  if (priceListId && !(await db.orm.public.PriceList.where({ tenantId, id: priceListId }).first())) return { ok: false, message: "Esa lista ya no existe." };
  if (target.customerId) {
    if (!(await db.orm.public.Customer.where({ tenantId, id: target.customerId }).select("id").first())) return { ok: false, message: "No encontramos ese cliente." };
    await db.orm.public.Customer.where({ tenantId, id: target.customerId }).update({ priceListId });
    return { ok: true };
  }
  if (target.groupId) {
    if (!(await db.orm.public.CustomerGroup.where({ tenantId, id: target.groupId }).select("id").first())) return { ok: false, message: "No encontramos ese grupo." };
    await db.orm.public.CustomerGroup.where({ tenantId, id: target.groupId }).update({ priceListId });
    return { ok: true };
  }
  return { ok: false, message: "Elige un cliente o un grupo." };
}
