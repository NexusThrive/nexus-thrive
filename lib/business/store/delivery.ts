/** Entrega (HU-entregas-01), reglas puras: método, datos obligatorios según el método y saldo pendiente al entregar. */
export const DELIVERY_METHODS = ["PICKUP", "COURIER", "OWN"] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];
export const METHOD_TEXT: Record<DeliveryMethod, string> = { PICKUP: "Recoge en el negocio", COURIER: "Transportadora", OWN: "Reparto propio" };

export type DeliveryInput = { method: string; carrier?: string; trackingCode?: string; scheduledFor?: string; note?: string };

export const isMethod = (v: string): v is DeliveryMethod => (DELIVERY_METHODS as readonly string[]).includes(v);

/** Problema por campo al despachar (marcar enviado), o `{}` si está completo. Recoger en el negocio no se despacha: se entrega directo. */
export function dispatchProblems(input: DeliveryInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isMethod(input.method)) errors.method = "Elige cómo se entrega.";
  else if (input.method === "PICKUP") errors.method = "Recoger en el negocio no se envía: confirma la entrega cuando el cliente recoja.";
  if (input.method === "COURIER") {
    if (!input.carrier?.trim()) errors.carrier = "Escribe la transportadora.";
    if (!input.trackingCode?.trim()) errors.trackingCode = "Escribe el número de guía.";
  }
  if (input.scheduledFor && !/^\d{4}-\d{2}-\d{2}$/.test(input.scheduledFor)) errors.scheduledFor = "La fecha no es válida.";
  return errors;
}

/** Saldo por cobrar al entregar: un pedido que no está pagado se avisa, no se bloquea (el cobro contra entrega es legítimo). */
export const balanceDueOnDelivery = (paymentStatus: string, total: number): number => (paymentStatus === "PAID" ? 0 : Math.max(0, total));
