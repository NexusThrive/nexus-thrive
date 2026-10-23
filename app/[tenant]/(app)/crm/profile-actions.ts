"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/prisma/db";
import { cleanProfile, membershipTypeFor, profileFor } from "@/lib/business/customer-fields";
import { addAttachment, checkAttachment } from "@/lib/business/finance-db";
import { getProduct } from "@/lib/business/products-db";
import { PAYMENT_METHODS } from "@/lib/finance";
import { bogotaEndOfDay, bogotaStartOfDay, bogotaToday, computeMembershipStatus } from "@/lib/business/memberships";
import { requireTenantContext } from "@/lib/tenant/context";
import { moneyTransaction, recordIncome } from "@/lib/business/money-service";
import { can } from "@/lib/business/permissions";

export type CustomerSaveResult = { ok: true; id: string; message: string } | { ok: false; message: string; errors?: Record<string, string> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export type CustomerEdit = {
  id: string;
  name: string;
  email: string;
  phone: string;
  documentId: string;
  birthDate: string;
  city: string;
  tags: string;
  profile: Record<string, string | number>;
  photoId: string | null;
};

export async function getCustomerForEditAction(slug: string, id: string): Promise<CustomerEdit | null> {
  const ctx = await requireTenantContext(slug);
  if (!ctx) return null;
  const c = await db.orm.public.Customer.where({ tenantId: ctx.tenantId, id }).first();
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? "",
    phone: c.phone ?? "",
    documentId: c.documentId ?? "",
    birthDate: c.birthDate ? String(c.birthDate).slice(0, 10) : "",
    city: c.city ?? "",
    tags: (c.tags ?? []).join(", "),
    profile: (c.profile as Record<string, string | number> | null) ?? {},
    photoId: c.photoId,
  };
}

/** Crea o actualiza un cliente con su ficha del rubro, foto y (gym) el plan con el que entra. */
export async function saveCustomerAction(form: FormData): Promise<CustomerSaveResult> {
  const slug = String(form.get("slug") ?? "");
  const ctx = await requireTenantContext(slug);
  if (!ctx) return { ok: false, message: "No tienes acceso a este negocio." };
  const id = String(form.get("id") ?? "") || null;
  const errors: Record<string, string> = {};
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const phone = String(form.get("phone") ?? "").trim();
  const documentId = String(form.get("documentId") ?? "").trim();
  const birthDate = String(form.get("birthDate") ?? "").trim();
  const city = String(form.get("city") ?? "").trim();
  const tags = [...new Set(String(form.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 12).map((t) => t.slice(0, 30));
  if (name.length < 2 || name.length > 120) errors.name = "Escribe el nombre (2 a 120 caracteres).";
  if (email && !EMAIL.test(email)) errors.email = "Correo no válido.";
  if (phone && phone.replace(/\D/g, "").length < 7) errors.phone = "Teléfono incompleto.";
  if (birthDate && (!DATE.test(birthDate) || birthDate > new Date().toISOString().slice(0, 10))) errors.birthDate = "Fecha no válida.";
  const raw: Record<string, unknown> = {};
  for (const f of profileFor(ctx.vertical).fields) raw[f.key] = form.get(`p_${f.key}`);
  const profile = cleanProfile(ctx.vertical, raw);
  if (!profile.ok) errors[`p_${profile.field}`] = profile.message;
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const err = checkAttachment(photo);
    if (err || !photo.type.startsWith("image/")) errors.photo = err ?? "La foto debe ser una imagen.";
  }
  if (Object.keys(errors).length) return { ok: false, message: "Revisa los campos marcados.", errors };

  const data = {
    name,
    email: email || null,
    phone: phone || null,
    documentId: documentId.slice(0, 40) || null,
    birthDate: birthDate ? Temporal.Instant.from(`${birthDate}T12:00:00Z`) : null,
    city: city.slice(0, 80) || null,
    tags,
    profile: profile.ok ? profile.value : {},
  };
  let customerId = id;
  if (id) {
    const exists = await db.orm.public.Customer.where({ tenantId: ctx.tenantId, id }).select("id").first();
    if (!exists) return { ok: false, message: "No se encontró." };
    await db.orm.public.Customer.where({ tenantId: ctx.tenantId, id }).update(data);
  } else {
    customerId = (await db.orm.public.Customer.create({ tenantId: ctx.tenantId, ...data, active: true })).id;
  }
  if (photo instanceof File && photo.size > 0) {
    const photoId = await addAttachment(ctx.tenantId, "CUSTOMER_PHOTO", customerId!, photo, ctx.memberId);
    await db.orm.public.Customer.where({ tenantId: ctx.tenantId, id: customerId! }).update({ photoId });
  }

  // Gimnasio: el plan con el que entra crea la membresía y, si se cobra, el pago con recibo.
  let extra = "";
  const planId = String(form.get("planId") ?? "");
  if (!id && planId && profileFor(ctx.vertical).planOnCreate) {
    const plan = await getProduct(ctx.tenantId, planId);
    if (plan && plan.kind === "PLAN" && plan.durationDays) {
      const start = bogotaToday();
      const startInstant = bogotaStartOfDay(start);
      const endDate = new Date(Date.UTC(start.year, start.month - 1, start.day + plan.durationDays - 1));
      const endInstant = bogotaEndOfDay({ year: endDate.getUTCFullYear(), month: endDate.getUTCMonth() + 1, day: endDate.getUTCDate() });
      const now = Temporal.Instant.fromEpochMilliseconds(Date.now());
      const method = String(form.get("paymentMethod") ?? "");
      // Cobrar exige manejar dinero (SEC-05): sin ese permiso se inscribe sin cobro.
      const pay = PAYMENT_METHODS.some((m) => m.value === method) && can(ctx.role, "money.handle");
      // Membresía y cobro (recibo y caja) juntos o nada: lib/business/money-service.ts.
      await moneyTransaction(async (tx) => {
        const membership = await tx.orm.public.Membership.create({
          tenantId: ctx.tenantId,
          customerId: customerId!,
          type: membershipTypeFor(plan.durationDays!),
          startDate: startInstant,
          endDate: endInstant,
          status: computeMembershipStatus(endInstant, now),
          price: plan.price.toFixed(2),
        });
        if (pay) {
          await recordIncome(
            tx,
            ctx.tenantId,
            {
              amount: plan.price,
              method,
              customerId: customerId!,
              membershipId: membership.id,
              description: `${plan.name} — inscripción`,
              cashDescription: `${plan.name} — ${name}`,
              sourceType: "MEMBERSHIP",
              sourceId: membership.id,
            },
            ctx.memberId,
          );
        }
      });
      extra = ` con ${plan.name}`;
      if (pay) extra += " y su pago";
    }
  }
  revalidatePath(`/${slug}/crm`);
  revalidatePath(`/${slug}/memberships`);
  revalidatePath(`/${slug}/finance`);
  return { ok: true, id: customerId!, message: id ? "Cambios guardados" : `Registrado${extra}` };
}

/** Lo que el formulario necesita: rubro y (gym) los planes para inscribir. */
export async function customerFormDataAction(slug: string) {
  const ctx = await requireTenantContext(slug);
  if (!ctx) return null;
  const plans = profileFor(ctx.vertical).planOnCreate
    ? (await db.orm.public.Product.where({ tenantId: ctx.tenantId, kind: "PLAN", active: true }).select("id", "name", "price", "durationDays").orderBy((p) => p.price.asc()).all()).map((p) => ({ id: p.id, name: p.name, price: Number(p.price), days: p.durationDays ?? 30 }))
    : [];
  return { vertical: ctx.vertical, plans };
}
