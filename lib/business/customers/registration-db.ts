import { db } from "@/prisma/db";
import { canonicalPhone } from "@/lib/foundation/kernel/phone";
import { emitEvent } from "@/lib/core/events/outbox";

/**
 * Registro público de clientes del gimnasio (sin sesión).
 *
 * El enlace solo funciona si el negocio está activo y su registro está
 * habilitado. No asigna membresías ni cobra: eso lo hace el personal desde la
 * ficha. Deduplica por documento, correo o teléfono y deja el alta en el
 * outbox (`customer.registered`) para avisar al equipo en la campana.
 */

export type RegistrationTenant = {
  id: string;
  name: string;
  vertical: string;
  logoId: string | null;
};

/** Negocio público con registro habilitado, o `null` (no se revela si existe). */
export async function registrationTenant(slug: string): Promise<RegistrationTenant | null> {
  const tenant = await db.orm.public.Tenant
    .where({ slug, active: true, registrationEnabled: true })
    .select("id", "name", "vertical", "logoId")
    .first();
  return tenant ? { id: tenant.id, name: tenant.name, vertical: tenant.vertical, logoId: tenant.logoId } : null;
}

export async function setRegistrationEnabled(tenantId: string, enabled: boolean): Promise<void> {
  await db.orm.public.Tenant.where({ id: tenantId }).update({ registrationEnabled: enabled });
}

export async function setTenantLogo(tenantId: string, logoId: string | null): Promise<void> {
  await db.orm.public.Tenant.where({ id: tenantId }).update({ logoId });
}

/** Configuración del registro para el panel del negocio. */
export async function registrationSettings(tenantId: string): Promise<{ enabled: boolean; logoId: string | null }> {
  const row = await db.orm.public.Tenant
    .where({ id: tenantId })
    .select("registrationEnabled", "logoId")
    .first();
  return { enabled: row?.registrationEnabled ?? false, logoId: row?.logoId ?? null };
}

export type PublicTenantLogo = { fileName: string; mimeType: string; sha256: string; data: Uint8Array };

/**
 * Logotipo público del negocio para su enlace de registro. Solo devuelve el
 * archivo si el registro está habilitado y es el logo del propio negocio; en
 * cualquier otro caso `null` (ni siquiera se revela que existe).
 */
export async function publicTenantLogo(slug: string): Promise<PublicTenantLogo | null> {
  const tenant = await registrationTenant(slug);
  if (!tenant?.logoId) return null;
  const file = await db.orm.public.Attachment
    .where({ tenantId: tenant.id, id: tenant.logoId, kind: "TENANT_LOGO" })
    .select("fileName", "mimeType", "sha256", "data")
    .first();
  return file
    ? { fileName: file.fileName, mimeType: file.mimeType, sha256: file.sha256, data: file.data as Uint8Array }
    : null;
}

export type PublicCustomerInput = {
  name: string;
  phone: string;
  email: string;
  documentId: string;
  birthDate: string;
  city: string;
};

export type RegisterResult =
  | { ok: true; id: string; alreadyRegistered: boolean }
  | { ok: false; message: string };

/**
 * Crea el cliente si no existe (documento, correo o teléfono) y emite el
 * evento de alta en la misma transacción. Si ya existe, no duplica y lo
 * informa para que la persona no vuelva a llenar el formulario.
 */
export async function registerPublicCustomer(tenantId: string, input: PublicCustomerInput): Promise<RegisterResult> {
  const phone = input.phone.trim();
  const email = input.email.trim().toLowerCase();
  const documentId = input.documentId.trim();

  const [byDocument, byEmail, byPhone] = await Promise.all([
    documentId
      ? db.orm.public.Customer.where({ tenantId, documentId }).select("id").first()
      : Promise.resolve(null),
    email
      ? db.orm.public.Customer.where({ tenantId, email }).select("id").first()
      : Promise.resolve(null),
    phone
      ? db.orm.public.Customer.where({ tenantId, phone }).select("id").first()
      : Promise.resolve(null),
  ]);
  const existing = byDocument ?? byEmail ?? byPhone;
  if (existing) return { ok: true, id: existing.id, alreadyRegistered: true };

  const data = {
    tenantId,
    name: input.name.trim(),
    email: email || null,
    phone: phone || null,
    phoneNorm: canonicalPhone(phone) || null,
    source: "REGISTRATION",
    stage: "CUSTOMER",
    documentId: documentId || null,
    birthDate: input.birthDate ? Temporal.Instant.from(`${input.birthDate}T12:00:00Z`) : null,
    city: input.city.trim() || null,
    tags: ["registro público"],
    profile: {},
    active: true,
  };

  let customerId = "";
  await db.transaction(async (tx) => {
    const customer = await tx.orm.public.Customer.create(data);
    customerId = customer.id;
    await emitEvent(tx, tenantId, {
      type: "customer.registered",
      resourceType: "customer",
      resourceId: customer.id,
      payload: {
        customer_id: customer.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        source: "public_registration",
      },
    });
  });
  return { ok: true, id: customerId, alreadyRegistered: false };
}
