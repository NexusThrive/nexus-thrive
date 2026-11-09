import { canonicalPhone } from "@/lib/foundation/kernel/phone";
import { updatePartyDetails } from "@/lib/core/parties/parties-db";
import { db } from "@/prisma/db";
import { saveCustomer } from "./customers-db";
import { cleanDocument, phoneDigits, validateNewCustomer, type NewCustomerInput } from "./new-customer";

/**
 * Alta completa de un cliente. Reutiliza `saveCustomer` (límite del plan, teléfono normalizado, tercero fiscal y evento) y
 * completa el tercero con los datos fiscales, el origen y la nota interna. Todo por `tenantId`.
 */
export type NewCustomerResult = { ok: true; id: string } | { ok: false; message: string; errors?: Partial<Record<keyof NewCustomerInput, string>> };

export async function createFullCustomer(tenantId: string, input: NewCustomerInput, userId: string | null): Promise<NewCustomerResult> {
  const errors = validateNewCustomer(input);
  if (Object.keys(errors).length) return { ok: false, message: "Revisa los campos marcados.", errors };
  const tags = [...new Set(input.tags.split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 12);
  const document = cleanDocument(input.documentNumber).slice(0, 40);
  const saved = await saveCustomer(tenantId, null, {
    name: input.name.trim().slice(0, 120),
    email: input.email.trim().toLowerCase() || null,
    phone: phoneDigits(input.phone) || null,
    documentId: document || null,
    birthDate: null,
    city: input.city.trim().slice(0, 80) || null,
    tags,
    profile: {},
  });
  if (!saved.ok) return { ok: false, message: saved.message };

  if (input.source) await db.orm.public.Customer.where({ tenantId, id: saved.id }).update({ source: input.source.slice(0, 40) });
  const customer = await db.orm.public.Customer.where({ tenantId, id: saved.id }).select("partyId").first();
  if (customer?.partyId) {
    await updatePartyDetails(tenantId, customer.partyId, {
      kind: input.kind,
      documentType: document ? input.documentType : null,
      addressLine: input.address.trim().slice(0, 160) || null,
      region: input.region.trim().slice(0, 80) || null,
      countryCode: input.country,
      taxResponsibility: input.taxResponsibility || null,
      invoiceEmail: input.invoiceEmail.trim().toLowerCase() || null,
    });
  }
  if (input.notes.trim()) await db.orm.public.CustomerNote.create({ tenantId, customerId: saved.id, content: input.notes.trim().slice(0, 2000), createdBy: userId });
  return { ok: true, id: saved.id };
}

/** Cliente activo que ya tiene ese teléfono o correo (aviso de posible duplicado; no bloquea el alta). */
export async function findCustomerByContact(tenantId: string, probe: { phone?: string; email?: string }): Promise<{ id: string; name: string; field: "phone" | "email" } | null> {
  const phone = probe.phone ? canonicalPhone(phoneDigits(probe.phone)) : "";
  if (phone) {
    const byPhone = await db.orm.public.Customer.where({ tenantId, active: true, phoneNorm: phone }).select("id", "name").first();
    if (byPhone) return { id: byPhone.id, name: byPhone.name, field: "phone" };
  }
  const email = probe.email?.trim().toLowerCase();
  if (email) {
    const byEmail = await db.orm.public.Customer.where({ tenantId, active: true, email }).select("id", "name").first();
    if (byEmail) return { id: byEmail.id, name: byEmail.name, field: "email" };
  }
  return null;
}

/** Valores del formulario para editar un cliente existente (`null` si no es del negocio). */
export async function customerFormValues(tenantId: string, customerId: string): Promise<NewCustomerInput | null> {
  const c = await db.orm.public.Customer.where({ tenantId, id: customerId }).first();
  if (!c) return null;
  const p = c.partyId ? await db.orm.public.Party.where({ tenantId, id: c.partyId }).first() : null;
  return {
    kind: p?.kind === "COMPANY" ? "COMPANY" : "PERSON",
    name: c.name,
    phone: c.phone ?? "",
    email: c.email ?? "",
    documentType: p?.documentType ?? "CC",
    documentNumber: c.documentId ?? "",
    address: p?.addressLine ?? "",
    city: c.city ?? "",
    region: p?.region ?? "",
    country: p?.countryCode ?? "CO",
    tags: (c.tags ?? []).join(", "),
    source: c.source && c.source !== "MANUAL" ? c.source : "",
    notes: "",
    invoiceEmail: p?.email && p.email !== (c.email ?? "").toLowerCase() ? p.email : "",
    taxResponsibility: p?.taxResponsibility ?? "",
  };
}

/** Actualiza un cliente desde el formulario completo. Conserva la fecha de nacimiento y el perfil del rubro (no están en este formulario). */
export async function updateFullCustomer(tenantId: string, customerId: string, input: NewCustomerInput): Promise<NewCustomerResult> {
  const errors = validateNewCustomer(input);
  if (Object.keys(errors).length) return { ok: false, message: "Revisa los campos marcados.", errors };
  const current = await db.orm.public.Customer.where({ tenantId, id: customerId }).first();
  if (!current) return { ok: false, message: "No se encontró el cliente." };
  const document = cleanDocument(input.documentNumber).slice(0, 40);
  const saved = await saveCustomer(tenantId, customerId, {
    name: input.name.trim().slice(0, 120),
    email: input.email.trim().toLowerCase() || null,
    phone: phoneDigits(input.phone) || null,
    documentId: document || null,
    birthDate: current.birthDate ?? null,
    city: input.city.trim().slice(0, 80) || null,
    tags: [...new Set(input.tags.split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 12),
    profile: (current.profile ?? {}) as Record<string, string | number>,
  });
  if (!saved.ok) return { ok: false, message: saved.message };
  await db.orm.public.Customer.where({ tenantId, id: customerId }).update({ source: input.source ? input.source.slice(0, 40) : current.source });
  const fresh = await db.orm.public.Customer.where({ tenantId, id: customerId }).select("partyId").first();
  if (fresh?.partyId) {
    await updatePartyDetails(tenantId, fresh.partyId, {
      kind: input.kind,
      documentType: document ? input.documentType : null,
      addressLine: input.address.trim().slice(0, 160) || null,
      region: input.region.trim().slice(0, 80) || null,
      countryCode: input.country,
      taxResponsibility: input.taxResponsibility || null,
      invoiceEmail: input.invoiceEmail.trim().toLowerCase() || null,
    });
  }
  return { ok: true, id: customerId };
}

/** Copia un cliente (sin documento: el documento identifica al tercero fiscal y no puede repetirse). */
export async function duplicateCustomer(tenantId: string, customerId: string, userId: string | null): Promise<NewCustomerResult> {
  const values = await customerFormValues(tenantId, customerId);
  if (!values) return { ok: false, message: "No se encontró el cliente." };
  return createFullCustomer(tenantId, { ...values, name: `${values.name} (copia)`.slice(0, 120), documentNumber: "" }, userId);
}

/** ¿Tiene historial que impida borrarlo? (ventas, citas o facturas): en ese caso se archiva en lugar de eliminar. */
export async function customerHasHistory(tenantId: string, customerId: string): Promise<boolean> {
  const [payment, booking, invoice] = await Promise.all([
    db.orm.public.Payment.where({ tenantId, customerId }).select("id").first(),
    db.orm.public.Booking.where({ tenantId, customerId }).select("id").first(),
    db.orm.public.Invoice.where({ tenantId, customerId }).select("id").first(),
  ]);
  return Boolean(payment || booking || invoice);
}
