"use server";

import { requireTenantContext as requireSharedTenantContext } from "@/lib/tenant/context";
import { revalidatePath } from "next/cache";
import { db } from "@/prisma/db";
import { getAppBaseUrl } from "@/lib/app-url";
import { formatCurrency } from "@/lib/format";
import { receiptCode } from "@/lib/business/invoice";
import { canHandleCash } from "@/lib/business/roles";
import { addAttachment, addCashMovement, checkAttachment, currentCashSession, receiptToken } from "@/lib/business/finance-db";
import {
  validateExpense,
  validatePayment,
  type ExpenseFieldErrors,
  type ExpenseFormValues,
  type PaymentFieldErrors,
  type PaymentFormValues,
} from "./validators";
import { recordIncomeNow } from "@/lib/business/money-service";

export type PaymentFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: PaymentFieldErrors;
  values?: PaymentFormValues;
  /** En éxito: datos del comprobante (recibo consecutivo, fecha y enlace público). */
  receipt?: { reference: string; createdAt: string; paymentId: string; link: string };
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
  const context = await requireSharedTenantContext(tenantSlug, "/finance");
  if (!context || !canHandleCash(context.role)) {
    return ACCESS_DENIED_PAYMENT;
  }
  const tenantDb = context.tenantDb;

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

  // Pago, recibo consecutivo y (en efectivo con caja abierta) la caja, en una
  // sola transacción: ver lib/business/money-service.ts.
  const created = await recordIncomeNow(
    context.tenantId,
    { amount, method: provider, status, providerRefId: providerRefId || null, description: description || null, customerId: customerId || null },
    context.memberId,
  );
  const number = created.receiptNumber;

  revalidatePath(`/${tenantSlug}/finance`);
  revalidatePath(`/${tenantSlug}`);
  return {
    status: "ok",
    receipt: {
      reference: receiptCode(number),
      createdAt: String(created.createdAt),
      paymentId: created.paymentId,
      link: `${await getAppBaseUrl()}/r/${receiptToken(created.paymentId)}`,
    },
  };
}

export type ScannedPaymentFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: PaymentFieldErrors;
  values?: PaymentFormValues;
  /** En éxito: datos del comprobante (recibo consecutivo, fecha y enlace público). */
  receipt?: { reference: string; createdAt: string; paymentId: string; link: string };
};

/**
 * Registra un pago a partir de un comprobante escaneado (FLU·05): la foto
 * llega como archivo y se guarda como soporte del pago (Attachment PAYMENT).
 * El monto y el método los confirmó el personal en el diálogo; la validación
 * es la misma que `createPaymentAction`.
 */
export async function registerScannedPaymentAction(
  _prevState: ScannedPaymentFormState,
  formData: FormData,
): Promise<ScannedPaymentFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const context = await requireSharedTenantContext(tenantSlug, "/finance");
  if (!context || !canHandleCash(context.role)) {
    return ACCESS_DENIED_PAYMENT;
  }
  const tenantDb = context.tenantDb;

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return { status: "error", message: "Adjunta la foto del comprobante." };
  }
  const photoError = checkAttachment(photo);
  if (photoError) {
    return { status: "error", message: photoError };
  }

  // Estado fijo APPROVED: el personal confirma el pago en el diálogo.
  formData.set("status", "APPROVED");
  const validation = validatePayment(formData);
  if (!validation.ok) {
    return { status: "error", errors: validation.errors, values: validation.values };
  }
  const { customerId, provider, amount, description } = validation.values;

  if (customerId) {
    const customer = await tenantDb.customers.get(customerId);
    if (!customer) {
      return { status: "error", message: "El cliente seleccionado no fue encontrado en este negocio.", values: validation.values };
    }
  }

  // Referencia del QR si la trae: única en todo el sistema (mismo criterio
  // que createPaymentAction).
  const providerRefId = String(formData.get("providerRefId") ?? "").trim();
  if (providerRefId) {
    const existing = await db.orm.public.Payment.where({ providerRefId }).first();
    if (existing) {
      return { status: "error", message: "Ya existe un pago con esa referencia. Revisa el dato e inténtalo de nuevo.", values: validation.values };
    }
  }

  const created = await recordIncomeNow(
    context.tenantId,
    { amount, method: provider, providerRefId: providerRefId || null, description: description || null, customerId: customerId || null },
    context.memberId,
  );
  const number = created.receiptNumber;

  // Soporte: la foto del comprobante (Nequi, transferencia, etc.).
  await addAttachment(context.tenantId, "PAYMENT", created.paymentId, photo, context.memberId);

  revalidatePath(`/${tenantSlug}/finance`);
  revalidatePath(`/${tenantSlug}`);
  return {
    status: "ok",
    receipt: {
      reference: receiptCode(number),
      createdAt: String(created.createdAt),
      paymentId: created.paymentId,
      link: `${await getAppBaseUrl()}/r/${receiptToken(created.paymentId)}`,
    },
  };
}

/** Registra un gasto de caja menor. Revalida Finanzas y el dashboard. */
export async function createExpenseAction(
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const context = await requireSharedTenantContext(tenantSlug, "/finance");
  if (!context || !canHandleCash(context.role)) {
    return ACCESS_DENIED_EXPENSE;
  }
  const tenantDb = context.tenantDb;

  const validation = validateExpense(formData);
  if (!validation.ok) {
    return {
      status: "error",
      errors: validation.errors,
      values: validation.values,
    };
  }

  const { category, description, amount } = validation.values;
  const supplier = String(formData.get("supplier") ?? "").trim().slice(0, 120) || null;
  const paidFrom = ["CASH", "BANK", "CARD"].includes(String(formData.get("paidFrom"))) ? String(formData.get("paidFrom")) : "BANK";
  const projectId = String(formData.get("projectId") ?? "") || null;

  // Pagado desde la caja menor: necesita un turno abierto con efectivo suficiente.
  const cash = paidFrom === "CASH" ? await currentCashSession(context.tenantId) : null;
  if (paidFrom === "CASH") {
    if (!cash) return { status: "error", message: "Abre la caja menor antes de registrar un gasto en efectivo.", values: validation.values };
    if (Number(amount) > cash.available) return { status: "error", message: `En la caja solo hay ${formatCurrency(cash.available)}.`, values: validation.values };
  }

  const expense = await tenantDb.expenses.create({
    category,
    description,
    amount,
    supplier,
    paidFrom,
    projectId,
    createdById: context.memberId,
    cashSessionId: cash?.sessionId ?? null,
  });
  if (cash) {
    await addCashMovement(context.tenantId, { sessionId: cash.sessionId, kind: "EXPENSE", amount: Number(amount), description: `${category}: ${description}`, expenseId: expense.id }, context.memberId);
  }
  // Soporte (foto o PDF de la factura).
  const file = formData.get("receipt");
  if (file instanceof File && file.size > 0) {
    const err = checkAttachment(file);
    if (!err) await addAttachment(context.tenantId, "EXPENSE", expense.id, file, context.memberId);
  }

  revalidatePath(`/${tenantSlug}/finance`);
  revalidatePath(`/${tenantSlug}`);
  return { status: "ok" };
}