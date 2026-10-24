import { syncCustomerParty } from "@/lib/parties/parties-db";
import { db } from "@/prisma/db";
import { withinLimit } from "@/lib/benefits/benefits";

/**
 * Clientes activos del negocio para elegir en un formulario (cobro, cuenta de
 * cobro, venta): solo id y nombre, en orden alfabético.
 */
export async function customerOptions(tenantId: string, limit = 300): Promise<{ id: string; name: string }[]> {
  return db.orm.public.Customer.where({ tenantId, active: true }).select("id", "name").orderBy((c) => c.name.asc()).limit(limit).all();
}

/** ¿El cliente es de este negocio? (antes de asociarlo a una venta o cobro) */
export async function customerBelongs(tenantId: string, customerId: string): Promise<boolean> {
  return (await db.orm.public.Customer.where({ tenantId, id: customerId }).select("id").first()) !== null;
}

/** Todos los clientes del negocio (activos y archivados), id y nombre, por nombre. */
export async function allCustomerOptions(tenantId: string): Promise<{ id: string; name: string }[]> {
  return db.orm.public.Customer.where({ tenantId }).orderBy((c) => c.name.asc()).select("id", "name").all();
}

/** Nombre y contacto de un cliente del negocio (documentos impresos). */
export async function customerContact(tenantId: string, customerId: string) {
  return db.orm.public.Customer.where({ id: customerId, tenantId }).select("name", "email", "phone").first();
}

/** Nombre de un cliente del negocio, o `null` si no es de este negocio. */
export async function customerNameIn(tenantId: string, customerId: string): Promise<string | null> {
  const row = await db.orm.public.Customer.where({ tenantId, id: customerId }).select("name").first();
  return row?.name ?? null;
}

/** Lo que va en el carné del cliente. */
export async function customerCard(tenantId: string, customerId: string) {
  return db.orm.public.Customer.where({ tenantId, id: customerId }).select("id", "name", "documentId", "photoId").first();
}

/** Datos extra de la ficha 360° (perfil del rubro, documento, acceso). */
export async function customerProfileExtras(tenantId: string, customerId: string) {
  return db.orm.public.Customer.where({ tenantId, id: customerId })
    .select("profile", "documentId", "birthDate", "city", "tags", "photoId", "accessCode", "nfcUid")
    .first();
}

/** Ficha completa de un cliente del negocio (para editarla). */
export async function getCustomer(tenantId: string, id: string) {
  return db.orm.public.Customer.where({ tenantId, id }).first();
}

type CustomerFields = {
  name: string;
  email: string | null;
  phone: string | null;
  documentId: string | null;
  birthDate: Temporal.Instant | null;
  city: string | null;
  tags: string[];
  profile: Record<string, string | number>;
};

/**
 * Límite de clientes acordado para el negocio (código a medida) y cuántos
 * activos tiene. `limit` null = sin límite propio.
 */
export async function customerLimit(tenantId: string): Promise<{ limit: number | null; used: number }> {
  const [t, used] = await Promise.all([
    db.orm.public.Tenant.where({ id: tenantId }).select("maxCustomers").first(),
    db.orm.public.Customer.where({ tenantId, active: true }).aggregate((a) => ({ n: a.count() })),
  ]);
  return { limit: t?.maxCustomers ?? null, used: Number(used.n) };
}

/**
 * Crea un cliente (activo) o actualiza uno del negocio. Al crear respeta el
 * límite de clientes acordado. `{ ok: false }` si `id` no es de este negocio o
 * si ya se llegó al límite.
 */
export async function saveCustomer(
  tenantId: string,
  id: string | null,
  data: CustomerFields,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  if (id) {
    const exists = await db.orm.public.Customer.where({ tenantId, id }).select("id").first();
    if (!exists) return { ok: false, message: "No se encontró." };
    await db.orm.public.Customer.where({ tenantId, id }).update(data);
    await syncCustomerParty(tenantId, id);
    return { ok: true, id };
  }
  const { limit, used } = await customerLimit(tenantId);
  if (!withinLimit(limit, used)) {
    return { ok: false, message: `Tu acuerdo incluye ${limit} clientes activos. Archiva alguno o escríbenos para ampliarlo.` };
  }
  const created = await db.orm.public.Customer.create({ tenantId, ...data, active: true });
  await syncCustomerParty(tenantId, created.id);
  return { ok: true, id: created.id };
}

/** Asocia la foto (adjunto ya guardado) a la ficha del cliente. */
export async function setCustomerPhoto(tenantId: string, customerId: string, photoId: string) {
  await db.orm.public.Customer.where({ tenantId, id: customerId }).update({ photoId });
}
