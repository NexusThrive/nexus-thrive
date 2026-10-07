"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import {
  validateExpense,
  validatePayment,
  type ExpenseFieldErrors,
  type ExpenseFormValues,
  type PaymentFieldErrors,
  type PaymentFormValues,
} from "./validators";

export type PaymentFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: PaymentFieldErrors;
  values?: PaymentFormValues;
};

export type ExpenseFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: ExpenseFieldErrors;
  values?: ExpenseFormValues;
};

const ACCESS_DENIED_PAYMENT: PaymentFormState = {
  status: "error",
  message: "No tienes acceso a este negocio.",
};

const ACCESS_DENIED_EXPENSE: ExpenseFormState = {
  status: "error",
  message: "No tienes acceso a este negocio.",
};

type TenantDb = ReturnType<typeof createTenantDb>;

/**
 * Verifica sesión de Clerk + tenant activo + membresía del usuario.
 * Devuelve `null` cuando algo falla (el caller responde con mensaje genérico).
 */
async function requireTenantDb(tenantSlug: string): Promise<TenantDb | null> {
  if (!tenantSlug || tenantSlug.trim() === "") {
    return null;
  }

  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();
  if (!tenantRecord) {
    return null;
  }

  const tenantDb = createTenantDb(tenantRecord.id);
  const member = await tenantDb.users.findByClerkUserId(userId);
  if (!member) {
    return null;
  }

  return tenantDb;
}

// ---------------------------------------------------------------------------
// Formularios — firma compatible con useActionState
// ---------------------------------------------------------------------------

/**
 * Registra un cobro. El `customerId` es opcional: si llega, debe pertenecer
 * al mismo tenant (aislamiento multi-tenant incluso en validación). La
 * referencia del proveedor, si existe, no puede estar ya registrada en el
 * negocio. Revalida Finanzas y el dashboard juntos.
 */
export async function createPaymentAction(
  _prevState: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const tenantDb = await requireTenantDb(tenantSlug);
  if (!tenantDb) {
    return ACCESS_DENIED_PAYMENT;
  }

  const validation = validatePayment(formData);
  if (!validation.ok) {
    return {
      status: "error",
      errors: validation.errors,
      values: validation.values,
    };
  }

  const { customerId, provider, status, amount, providerRefId, description } =
    validation.values;

  // El cliente (opcional) debe existir y pertenecer a este tenant.
  if (customerId) {
    const customer = await tenantDb.customers.get(customerId);
    if (!customer) {
      return {
        status: "error",
        message: "El cliente seleccionado no fue encontrado en este negocio.",
        values: validation.values,
      };
    }
  }

  // La referencia del proveedor es única en todo el sistema: evita el
  // choque con una referencia ajena devolviendo un error claro.
  if (providerRefId) {
    const existing = await db.orm.public.Payment.where({
      providerRefId,
    }).first();
    if (existing) {
      return {
        status: "error",
        message:
          "Ya existe un pago con esa referencia. Revisa el dato e inténtalo de nuevo.",
        values: validation.values,
      };
    }
  }

  await tenantDb.payments.create({
    customerId: customerId || null,
    provider,
    status,
    amount: String(Number(amount.replace(",", "."))),
    providerRefId: providerRefId || null,
    description: description || null,
  });

  revalidatePath(`/${tenantSlug}/finance`);
  revalidatePath(`/${tenantSlug}`);
  return { status: "ok" };
}

/** Registra un gasto de caja menor. Revalida Finanzas y el dashboard. */
export async function createExpenseAction(
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const tenantDb = await requireTenantDb(tenantSlug);
  if (!tenantDb) {
    return ACCESS_DENIED_EXPENSE;
  }

  const validation = validateExpense(formData);
  if (!validation.ok) {
    return {
      status: "error",
      errors: validation.errors,
      values: validation.values,
    };
  }

  const { category, description, amount } = validation.values;

  await tenantDb.expenses.create({
    category,
    description,
    amount: String(Number(amount.replace(",", "."))),
  });

  revalidatePath(`/${tenantSlug}/finance`);
  revalidatePath(`/${tenantSlug}`);
  return { status: "ok" };
}