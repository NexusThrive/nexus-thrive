"use server";

import { revalidatePath } from "next/cache";
import { cleanProfile, profileFor } from "@/lib/business/customers/customer-fields";
import { getCustomer, saveCustomer, setCustomerPhoto } from "@/lib/business/customers/customers-db";
import { activeMembershipFor, cancelActiveMemberships, enrollInPlan } from "@/lib/industry/gym/enrollment-db";
import { typeLabel } from "@/lib/industry/gym/memberships";
import { addAttachment, checkAttachment } from "@/lib/business/sales/finance-db";
import { getProduct, planOptions } from "@/lib/business/catalog/products-db";
import { moneyOutcome } from "@/lib/business/sales/money-error";
import { amountProblem } from "@/lib/business/sales/money-service";
import { PAYMENT_METHODS } from "@/lib/foundation/kernel/payment-vocabulary";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { can } from "@/lib/core/auth/permissions";

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
  /** Membresía vigente (gym): plan y vencimiento, para asignar o retirar desde la ficha. */
  membership: { productId: string | null; planName: string; endDate: string } | null;
};

export async function getCustomerForEditAction(slug: string, id: string): Promise<CustomerEdit | null> {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx) return null;
  const c = await getCustomer(ctx.tenantId, id);
  if (!c) return null;
  const active = profileFor(ctx.vertical).planOnCreate ? await activeMembershipFor(ctx.tenantId, id) : null;
  const plan = active?.productId ? await getProduct(ctx.tenantId, active.productId) : null;
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
    membership: active ? { productId: active.productId, planName: plan?.name ?? typeLabel(active.status), endDate: active.endDate } : null,
  };
}

/** Crea o actualiza un cliente con su ficha del rubro, foto y (gym) el plan con el que entra. */
export async function saveCustomerAction(form: FormData): Promise<CustomerSaveResult> {
  const slug = String(form.get("slug") ?? "");
  const ctx = await requireTenantContext(slug, "/crm");
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
  const saved = await saveCustomer(ctx.tenantId, id, data);
  if (!saved.ok) return { ok: false, message: saved.message };
  const customerId = saved.id;
  if (photo instanceof File && photo.size > 0) {
    const photoId = await addAttachment(ctx.tenantId, "CUSTOMER_PHOTO", customerId, photo, ctx.memberId);
    await setCustomerPhoto(ctx.tenantId, customerId, photoId);
  }

  // Gimnasio: el plan con el que entra crea la membresía y, si se cobra, el pago con recibo.
  let extra = "";
  const gym = profileFor(ctx.vertical).planOnCreate;
  const planId = String(form.get("planId") ?? "");
  if (!id && planId && gym) {
    const plan = await getProduct(ctx.tenantId, planId);
    if (plan && plan.kind === "PLAN" && plan.durationDays) {
      const durationDays = plan.durationDays;
      const method = String(form.get("paymentMethod") ?? "");
      // Cobrar exige manejar dinero (SEC-05): sin ese permiso se inscribe sin cobro.
      const pay = PAYMENT_METHODS.some((m) => m.value === method) && can(ctx.role, "money.handle");
      // Membresía y cobro (recibo y caja) juntos o nada: lib/business/sales/money-service.ts.
      const enrolled = await moneyOutcome(() =>
        enrollInPlan(
          ctx.tenantId,
          { customerId: customerId, customerName: name, plan: { id: plan.id, name: plan.name, price: plan.price, durationDays }, method: pay ? method : null },
          ctx.memberId,
        ),
      );
      // El cliente ya quedó guardado: se avisa que el plan no se registró y por qué, sin duplicar el registro al reintentar.
      if (!enrolled.ok) return { ok: true, id: customerId, message: `Cliente registrado, pero no se registró el plan: ${enrolled.message}` };
      extra = ` con ${plan.name}`;
      if (pay) extra += " y su pago";
    }
  }

  // Gimnasio, ficha existente: asignar, cambiar o retirar la membresía. El
  // selector manda "" (mantener), "none" (retirar) o el id del plan.
  if (id && gym) {
    const choice = String(form.get("membershipChoice") ?? "").trim();
    if (choice) {
      const current = await activeMembershipFor(ctx.tenantId, customerId);
      const target = choice === "none" ? null : choice;
      if (target !== (current?.productId ?? null)) {
        if (target) {
          const next = await getProduct(ctx.tenantId, target);
          const willPay = PAYMENT_METHODS.some((m) => m.value === String(form.get("paymentMethod") ?? "")) && can(ctx.role, "money.handle");
          const overLimit = next && willPay ? await amountProblem(ctx.tenantId, next.price) : null;
          if (overLimit) return { ok: false, message: overLimit };
        }
        if (current) await cancelActiveMemberships(ctx.tenantId, customerId, target ? "Cambio de plan desde la ficha" : "Retiro desde la ficha");
        if (target) {
          const plan = await getProduct(ctx.tenantId, target);
          if (plan && plan.kind === "PLAN" && plan.durationDays) {
            const durationDays = plan.durationDays;
            const method = String(form.get("paymentMethod") ?? "");
            const pay = PAYMENT_METHODS.some((m) => m.value === method) && can(ctx.role, "money.handle");
            const enrolled = await moneyOutcome(() =>
              enrollInPlan(
                ctx.tenantId,
                { customerId, customerName: name, plan: { id: plan.id, name: plan.name, price: plan.price, durationDays }, method: pay ? method : null },
                ctx.memberId,
              ),
            );
            if (!enrolled.ok) return { ok: false, message: `Los cambios se guardaron, pero no se registró el plan: ${enrolled.message}` };
            extra = ` con ${plan.name}`;
            if (pay) extra += " y su pago";
          }
        } else {
          extra = ", sin membresía";
        }
      }
    }
  }
  revalidatePath(`/${slug}/crm`);
  revalidatePath(`/${slug}/crm/${customerId}`);
  revalidatePath(`/${slug}/memberships`);
  revalidatePath(`/${slug}/finance`);
  return { ok: true, id: customerId, message: id ? `Cambios guardados${extra}` : `Registrado${extra}` };
}

/** Lo que el formulario necesita: rubro y (gym) los planes para inscribir. */
export async function customerFormDataAction(slug: string) {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx) return null;
  const plans = profileFor(ctx.vertical).planOnCreate
    ? await planOptions(ctx.tenantId)
    : [];
  return { vertical: ctx.vertical, plans };
}

export type AssignMembershipResult = { ok: true; message: string } | { ok: false; message: string };

/**
 * Asigna una membresía desde la ficha del cliente: crea la membresía del plan
 * elegido (con su duración) y, si quien registra maneja dinero, el cobro con
 * recibo. Si ya tenía una vigente, la reemplaza (queda en el histórico).
 */
export async function assignMembershipAction(slug: string, customerId: string, planId: string, method: string): Promise<AssignMembershipResult> {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx || !profileFor(ctx.vertical).planOnCreate) return { ok: false, message: "No tienes acceso a este negocio." };
  const customer = await getCustomer(ctx.tenantId, customerId);
  if (!customer) return { ok: false, message: "El cliente no existe en este negocio." };
  const plan = planId ? await getProduct(ctx.tenantId, planId) : null;
  if (!plan || plan.kind !== "PLAN" || !plan.active || !plan.durationDays) return { ok: false, message: "Elige un tipo de membresía válido." };

  const pay = PAYMENT_METHODS.some((m) => m.value === method) && can(ctx.role, "money.handle");
  // Antes de cancelar el plan vigente: si el cobro no va a pasar, no se toca nada.
  const overLimit = pay ? await amountProblem(ctx.tenantId, plan.price) : null;
  if (overLimit) return { ok: false, message: overLimit };
  const durationDays = plan.durationDays;
  const current = await activeMembershipFor(ctx.tenantId, customerId);
  if (current) await cancelActiveMemberships(ctx.tenantId, customerId, "Cambio de plan desde la ficha");
  const enrolled = await moneyOutcome(() =>
    enrollInPlan(
      ctx.tenantId,
      { customerId, customerName: customer.name, plan: { id: plan.id, name: plan.name, price: plan.price, durationDays }, method: pay ? method : null },
      ctx.memberId,
    ),
  );
  if (!enrolled.ok) return { ok: false, message: enrolled.message };

  revalidatePath(`/${slug}/crm`);
  revalidatePath(`/${slug}/crm/${customerId}`);
  revalidatePath(`/${slug}/memberships`);
  revalidatePath(`/${slug}/finance`);
  return { ok: true, message: `${plan.name} asignada${pay ? " y cobrada" : ""}` };
}
