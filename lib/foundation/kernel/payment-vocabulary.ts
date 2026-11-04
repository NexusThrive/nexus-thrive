/**
 * Constantes y tipos del dominio financiero.
 *
 * Los valores corresponden EXACTAMENTE a los enums del contrato Prisma
 * (`PaymentProvider`, `PaymentStatus`) y a las categorías de gasto definidas
 * para la caja menor. Un solo lugar de verdad para capa de datos y UI.
 */

export const PAYMENT_METHODS = [
  { value: "CASH", label: "Efectivo" },
  { value: "TRANSFER", label: "Transferencia" },
] as const;

/** Medios que ya no se ofrecen pero siguen en pagos antiguos: solo se muestran, no se eligen. */
const LEGACY_METHOD_LABELS: Record<string, string> = { NEQUI: "Nequi", WOMPI: "Wompi" };

export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]["value"] | "NEQUI" | "WOMPI";

export const PAYMENT_STATUSES = [
  { value: "APPROVED", label: "Pagado" },
  { value: "PENDING", label: "Pendiente" },
  { value: "DECLINED", label: "Rechazado" },
  { value: "VOIDED", label: "Anulado" },
] as const;

export type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number]["value"];

export const EXPENSE_CATEGORIES = [
  "Servicios",
  "Nómina",
  "Insumos",
  "Arriendo",
  "Otros",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Nombre para mostrar de un medio de pago. */
export function paymentMethodLabel(method: PaymentMethodValue): string {
  return (
    PAYMENT_METHODS.find((option) => option.value === method)?.label ?? LEGACY_METHOD_LABELS[method] ?? method
  );
}

/** Nombre para mostrar de un estado de pago. */
export function paymentStatusLabel(status: PaymentStatusValue): string {
  return (
    PAYMENT_STATUSES.find((option) => option.value === status)?.label ?? status
  );
}