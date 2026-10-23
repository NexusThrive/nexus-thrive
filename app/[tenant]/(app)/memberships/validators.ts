import { PAYMENT_METHODS, type PaymentMethodValue } from "@/lib/finance";
import {
  MEMBERSHIP_TYPES,
  parsePlainDate,
  type MembershipTypeValue,
} from "@/lib/business/memberships";

export type MembershipFormValues = {
  customerId: string;
  type: MembershipTypeValue | "";
  startDate: string;
  endDate: string;
  price: string;
  provider: PaymentMethodValue | "";
  registerInitialPayment: boolean;
};

/** `MembershipFormValues` con tipo y método ya garantizados. */
export type MembershipValidValues = {
  customerId: string;
  type: MembershipTypeValue;
  startDate: string;
  endDate: string;
  price: string;
  provider: PaymentMethodValue;
  registerInitialPayment: boolean;
};

export type MembershipFieldErrors = Partial<
  Record<keyof MembershipFormValues, string>
>;

export type MembershipValidation =
  | { ok: true; values: MembershipValidValues }
  | {
      ok: false;
      errors: MembershipFieldErrors;
      values: MembershipFormValues;
    };

export type RenewalFormValues = {
  membershipId: string;
  provider: PaymentMethodValue | "";
  registerPayment: boolean;
};

export type RenewalFieldErrors = Partial<
  Record<keyof RenewalFormValues, string>
>;

export type RenewalValidation =
  | { ok: true; values: RenewalFormValues & { provider: PaymentMethodValue } }
  | {
      ok: false;
      errors: RenewalFieldErrors;
      values: RenewalFormValues;
    };

function readPrice(raw: string): { number: number; error?: string } {
  if (!raw) {
    return { number: Number.NaN, error: "Ingresa el precio." };
  }
  const amountNumber = Number(raw.replace(",", "."));
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return { number: amountNumber, error: "El precio debe ser mayor que cero." };
  }
  if (amountNumber > 100_000_000) {
    return { number: amountNumber, error: "El precio no puede superar $100.000.000." };
  }
  return { number: amountNumber };
}

/**
 * Validación de creación de membresía en el servidor. El tipo debe
 * pertenecer al contrato; `startDate` debe ser una fecha calendario real
 * (`YYYY-MM-DD`). `endDate` se valida en formato pero la vigencia final la
 * SIEMPRE calcula el servidor (startDate + duración del plan), para que la
 * regla de negocio viva en un solo lugar.
 */
export function validateMembership(formData: FormData): MembershipValidation {
  const rawType = String(formData.get("type") ?? "").trim();
  const rawProvider = String(formData.get("provider") ?? "").trim();

  const values: MembershipFormValues = {
    customerId: String(formData.get("customerId") ?? "").trim(),
    type: MEMBERSHIP_TYPES.some((option) => option.value === rawType)
      ? (rawType as MembershipTypeValue)
      : "",
    startDate: String(formData.get("startDate") ?? "").trim(),
    endDate: String(formData.get("endDate") ?? "").trim(),
    price: String(formData.get("price") ?? "").trim(),
    provider: PAYMENT_METHODS.some((option) => option.value === rawProvider)
      ? (rawProvider as PaymentMethodValue)
      : "",
    registerInitialPayment: formData.get("registerInitialPayment") === "on",
  };

  const errors: MembershipFieldErrors = {};

  if (!values.customerId) {
    errors.customerId = "Selecciona un cliente.";
  }

  if (!MEMBERSHIP_TYPES.some((option) => option.value === values.type)) {
    errors.type = "Selecciona un plan válido.";
  }

  if (!parsePlainDate(values.startDate)) {
    errors.startDate = "Fecha de inicio no válida (AAAA-MM-DD).";
  }

  // La endDate viene calculada del form; se exige formato solo para que el
  // dato del cliente no viaje corrupto (la vigencia real la recalcula el server).
  if (values.endDate && !parsePlainDate(values.endDate)) {
    errors.endDate = "Fecha de vencimiento no válida (AAAA-MM-DD).";
  }

  const price = readPrice(values.price);
  if (price.error) {
    errors.price = price.error;
  }

  if (values.registerInitialPayment) {
    if (!PAYMENT_METHODS.some((option) => option.value === values.provider)) {
      errors.provider = "Selecciona un método de pago válido.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }

  return {
    ok: true,
    values: {
      customerId: values.customerId,
      type: values.type as MembershipTypeValue,
      startDate: values.startDate,
      endDate: values.endDate,
      price: values.price,
      provider: (values.provider || "CASH") as PaymentMethodValue,
      registerInitialPayment: values.registerInitialPayment,
    },
  };
}

/**
 * Validación de renovación: la membresía debe existir (verifica el server)
 * y, si se registra cobro, el método de pago debe ser del contrato.
 */
export function validateRenewal(formData: FormData): RenewalValidation {
  const rawProvider = String(formData.get("provider") ?? "").trim();

  const values: RenewalFormValues = {
    membershipId: String(formData.get("membershipId") ?? "").trim(),
    provider: PAYMENT_METHODS.some((option) => option.value === rawProvider)
      ? (rawProvider as PaymentMethodValue)
      : "",
    registerPayment: formData.get("registerPayment") === "on",
  };

  const errors: RenewalFieldErrors = {};

  if (!values.membershipId) {
    errors.membershipId = "Membresía no especificada.";
  }

  if (values.registerPayment) {
    if (!PAYMENT_METHODS.some((option) => option.value === values.provider)) {
      errors.provider = "Selecciona un método de pago válido.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }

  return {
    ok: true,
    values: {
      ...values,
      provider: (values.provider || "CASH") as PaymentMethodValue,
    },
  };
}
