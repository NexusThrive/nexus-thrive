/**
 * Integridad de lo que entra al sistema (HU-integridad-01): límites de monto y de cantidad, y transiciones de estado
 * válidas. Reglas puras, sin base de datos. Los límites tienen un valor por defecto y cada negocio puede cambiarlos
 * en `Tenant.settings.limits` (un negocio grande no debe quedar frenado por el tope general).
 */

export type IntegrityLimits = {
  /** Monto máximo de un solo ingreso o cobro, en pesos. */
  maxAmount: number;
  /** Cantidad máxima de unidades en una línea de venta o pedido. */
  maxQuantity: number;
};

export const DEFAULT_LIMITS: IntegrityLimits = { maxAmount: 50_000_000, maxQuantity: 10_000 };

/** Tope absoluto que ningún negocio puede superar por configuración. */
const HARD_CAPS: IntegrityLimits = { maxAmount: 10_000_000_000, maxQuantity: 1_000_000 };

const positiveNumber = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null);

/** Límites efectivos de un negocio: lo configurado (acotado al tope absoluto) o el valor por defecto. */
export function resolveLimits(settings: unknown): IntegrityLimits {
  const raw = settings && typeof settings === "object" ? (settings as Record<string, unknown>).limits : null;
  const limits = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    maxAmount: Math.min(positiveNumber(limits.maxAmount) ?? DEFAULT_LIMITS.maxAmount, HARD_CAPS.maxAmount),
    maxQuantity: Math.min(positiveNumber(limits.maxQuantity) ?? DEFAULT_LIMITS.maxQuantity, HARD_CAPS.maxQuantity),
  };
}

const fmt = (n: number) => n.toLocaleString("es-CO");

/** Valida el monto de un ingreso: número finito, no negativo y dentro del tope. Devuelve el problema legible o `null`. */
export function validateAmount(amount: number, limits: IntegrityLimits = DEFAULT_LIMITS): string | null {
  if (!Number.isFinite(amount)) return "El valor no es válido.";
  if (amount < 0) return "El valor no puede ser negativo.";
  if (amount > limits.maxAmount) return `El valor supera el máximo permitido de $ ${fmt(limits.maxAmount)} por operación. Revísalo o pide a Nexus ampliar el límite de tu negocio.`;
  return null;
}

/** Valida una cantidad de venta o pedido: entero mayor que cero y dentro del tope. */
export function validateQuantity(quantity: number, limits: IntegrityLimits = DEFAULT_LIMITS): string | null {
  if (!Number.isInteger(quantity) || quantity <= 0) return "La cantidad debe ser un número entero mayor que cero.";
  if (quantity > limits.maxQuantity) return `La cantidad supera el máximo permitido de ${fmt(limits.maxQuantity)} unidades.`;
  return null;
}

/** Estados del pedido de la tienda y a cuáles puede pasar. Un estado final no se reabre. */
export const ORDER_TRANSITIONS: Record<string, readonly string[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELED", "ABANDONED"],
  ABANDONED: ["PAID", "CANCELED"],
  PAID: [],
  CANCELED: [],
};

/** ¿Puede un pedido pasar de `from` a `to`? Un estado desconocido nunca transiciona. */
export function canTransitionOrder(from: string, to: string): boolean {
  return (ORDER_TRANSITIONS[from] ?? []).includes(to);
}

/** Ventana en la que dos cobros idénticos se consideran el mismo envío repetido (doble clic, reintento del navegador). */
export const DUPLICATE_WINDOW_SECONDS = 10;

export type PaymentFingerprint = { customerId: string | null; amount: string; method: string; description: string | null; sourceType: string | null; sourceId: string | null };

/**
 * ¿Es `candidate` el mismo cobro que `previous` enviado otra vez? Solo cuando el cobro está atado a un cliente o a un
 * origen: dos ventas iguales de mostrador, sin cliente ni origen, son legítimas y nunca se tratan como repetidas.
 */
export function isDuplicatePayment(previous: PaymentFingerprint, candidate: PaymentFingerprint): boolean {
  if (!candidate.customerId && !candidate.sourceId) return false;
  return (
    previous.customerId === candidate.customerId &&
    Number(previous.amount) === Number(candidate.amount) &&
    previous.method === candidate.method &&
    (previous.description ?? "") === (candidate.description ?? "") &&
    previous.sourceType === candidate.sourceType &&
    previous.sourceId === candidate.sourceId
  );
}
