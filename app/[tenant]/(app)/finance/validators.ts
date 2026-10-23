import { copAmountExceeds, parseCopAmount } from "@/lib/finance/cop-amount";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type ExpenseCategory,
  type PaymentMethodValue,
  type PaymentStatusValue,
} from "@/lib/finance";

/** Tope por movimiento, en pesos enteros. */
const MAX_AMOUNT_COP = BigInt(100_000_000);

export type PaymentFormValues = {
  customerId: string;
  provider: PaymentMethodValue | "";
  status: PaymentStatusValue | "";
  amount: string;
  providerRefId: string;
  description: string;
};

/** Igual a `PaymentFormValues` pero con método/estado ya garantizados. */
export type PaymentValidValues = Omit<
  PaymentFormValues,
  "provider" | "status"
> & {
  provider: PaymentMethodValue;
  status: PaymentStatusValue;
};

export type PaymentFieldErrors = Partial<
  Record<keyof PaymentFormValues, string>
>;

export type PaymentValidation =
  | { ok: true; values: PaymentValidValues }
  | { ok: false; errors: PaymentFieldErrors; values: PaymentFormValues };

const REF_PATTERN = /^[A-Za-z0-9._-]{1,80}$/;

/**
 * Validación de un cobro en el servidor. El método y el estado deben
 * coincidir con los enums del contrato (validación estricta, sin casts
 * silenciosos). `customerId` es opcional (pago sin cliente vinculado).
 */
export function validatePayment(formData: FormData): PaymentValidation {
  const rawProvider = String(formData.get("provider") ?? "").trim();
  const rawStatus = String(formData.get("status") ?? "").trim();

  const values: PaymentFormValues = {
    customerId: String(formData.get("customerId") ?? "").trim(),
    provider: PAYMENT_METHODS.some(
      (option) => option.value === rawProvider,
    )
      ? (rawProvider as PaymentMethodValue)
      : "",
    status: PAYMENT_STATUSES.some((option) => option.value === rawStatus)
      ? (rawStatus as PaymentStatusValue)
      : "",
    amount: String(formData.get("amount") ?? "").trim(),
    providerRefId: String(formData.get("providerRefId") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
  };

  const errors: PaymentFieldErrors = {};

  if (!PAYMENT_METHODS.some((option) => option.value === values.provider)) {
    errors.provider = "Selecciona un método de pago válido.";
  }

  if (!PAYMENT_STATUSES.some((option) => option.value === values.status)) {
    errors.status = "Estado de pago no válido.";
  }

  // Miles con punto o coma ("150.000") y decimales con coma o punto; ver
  // `parseCopAmount`. El valor normalizado es el que se persiste.
  const amount = parseCopAmount(values.amount);
  if (!values.amount) {
    errors.amount = "Ingresa el monto.";
  } else if (amount === null) {
    errors.amount = "El monto debe ser mayor que cero.";
  } else if (copAmountExceeds(amount, MAX_AMOUNT_COP)) {
    errors.amount = "El monto no puede superar $100.000.000.";
  }

  if (values.providerRefId && !REF_PATTERN.test(values.providerRefId)) {
    errors.providerRefId =
      "Referencia no válida (letras, números, puntos, guiones; máx. 80).";
  }

  if (values.description.length > 300) {
    errors.description = "Máximo 300 caracteres.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }

  // La validación garantizó que provider y status son valores del enum.
  return {
    ok: true,
    values: {
      customerId: values.customerId,
      provider: values.provider as PaymentMethodValue,
      status: values.status as PaymentStatusValue,
      amount: amount as string,
      providerRefId: values.providerRefId,
      description: values.description,
    },
  };
}

export type ExpenseFormValues = {
  category: ExpenseCategory | "";
  description: string;
  amount: string;
};

export type ExpenseFieldErrors = Partial<
  Record<keyof ExpenseFormValues, string>
>;

export type ExpenseValidation =
  | { ok: true; values: ExpenseFormValues }
  | { ok: false; errors: ExpenseFieldErrors; values: ExpenseFormValues };

/**
 * Validación de un gasto de caja menor. La categoría debe pertenecer al
 * conjunto definido (Servicios/Nómina/Insumos/Arriendo/Otros).
 */
export function validateExpense(formData: FormData): ExpenseValidation {
  const rawCategory = String(formData.get("category") ?? "").trim();

  const values: ExpenseFormValues = {
    category: EXPENSE_CATEGORIES.some(
      (category) => category === rawCategory,
    )
      ? (rawCategory as ExpenseCategory)
      : "",
    description: String(formData.get("description") ?? "").trim(),
    amount: String(formData.get("amount") ?? "").trim(),
  };

  const errors: ExpenseFieldErrors = {};

  if (!EXPENSE_CATEGORIES.some((category) => category === values.category)) {
    errors.category = "Selecciona una categoría válida.";
  }

  if (values.description.length < 2) {
    errors.description = "Describe brevemente el gasto.";
  } else if (values.description.length > 300) {
    errors.description = "Máximo 300 caracteres.";
  }

  // Miles con punto o coma ("150.000") y decimales con coma o punto; ver
  // `parseCopAmount`. El valor normalizado es el que se persiste.
  const amount = parseCopAmount(values.amount);
  if (!values.amount) {
    errors.amount = "Ingresa el monto.";
  } else if (amount === null) {
    errors.amount = "El monto debe ser mayor que cero.";
  } else if (copAmountExceeds(amount, MAX_AMOUNT_COP)) {
    errors.amount = "El monto no puede superar $100.000.000.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }

  // La validación garantizó que category es una categoría definida.
  return {
    ok: true,
    values: {
      category: values.category as ExpenseCategory,
      description: values.description,
      amount: amount as string,
    },
  };
}