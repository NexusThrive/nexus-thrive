/**
 * Cumplimiento del pedido (HU-pedidos-01), reglas puras: de recibido a entregado, SEPARADO del estado de pago (`StoreOrder.status`).
 * Una transición que no está en la tabla se rechaza. Entregado y cancelado son finales.
 */
export const FULFILLMENT_STATES = ["RECEIVED", "CONFIRMED", "IN_PRODUCTION", "READY", "SHIPPED", "DELIVERED", "CANCELED"] as const;
export type Fulfillment = (typeof FULFILLMENT_STATES)[number];

export const FULFILLMENT_TEXT: Record<Fulfillment, string> = { RECEIVED: "Recibido", CONFIRMED: "Confirmado", IN_PRODUCTION: "En producción", READY: "Listo", SHIPPED: "Enviado", DELIVERED: "Entregado", CANCELED: "Cancelado" };

const NEXT: Record<Fulfillment, readonly Fulfillment[]> = {
  RECEIVED: ["CONFIRMED", "CANCELED"],
  CONFIRMED: ["IN_PRODUCTION", "READY", "CANCELED"],
  IN_PRODUCTION: ["READY", "CANCELED"],
  READY: ["SHIPPED", "DELIVERED", "CANCELED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELED: [],
};

export const isFulfillment = (value: string): value is Fulfillment => (FULFILLMENT_STATES as readonly string[]).includes(value);

/** Estados a los que puede pasar desde `from` (vacío si es final o desconocido). */
export const allowedNext = (from: string): readonly Fulfillment[] => (isFulfillment(from) ? NEXT[from] : []);

/** ¿Es válido el paso de `from` a `to`? */
export const canAdvance = (from: string, to: string): boolean => allowedNext(from).includes(to as Fulfillment);

export const isFinal = (state: string) => state === "DELIVERED" || state === "CANCELED";

/** Mensaje claro de por qué no se puede pasar de un estado a otro. */
export function transitionProblem(from: string, to: string): string | null {
  if (!isFulfillment(to)) return "Ese estado no existe.";
  if (!isFulfillment(from)) return "El pedido tiene un estado desconocido.";
  if (from === to) return `El pedido ya está ${FULFILLMENT_TEXT[from].toLowerCase()}.`;
  if (isFinal(from)) return `Un pedido ${FULFILLMENT_TEXT[from].toLowerCase()} ya no cambia de estado.`;
  return canAdvance(from, to) ? null : `No se puede pasar de «${FULFILLMENT_TEXT[from]}» a «${FULFILLMENT_TEXT[to]}». Siguientes posibles: ${allowedNext(from).map((s) => FULFILLMENT_TEXT[s]).join(", ")}.`;
}
