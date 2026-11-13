import type { StatusTone } from "@/components/atoms/badge";
import type { Fulfillment } from "@/lib/business/store/fulfillment";

/** Estado del cobro del pedido (separado del cumplimiento). */
export const PAY = {
  PENDING_PAYMENT: { label: "Esperando pago", tone: "warning" },
  PAID: { label: "Pagado", tone: "success" },
  ABANDONED: { label: "Sin pagar", tone: "secondary" },
  CANCELED: { label: "Cancelado", tone: "secondary" },
} as const;

/** Acción principal de cada estado: el siguiente paso más común, a un toque. */
export const PRIMARY: Partial<Record<Fulfillment, Fulfillment>> = { RECEIVED: "CONFIRMED", CONFIRMED: "IN_PRODUCTION", IN_PRODUCTION: "READY", READY: "DELIVERED", SHIPPED: "DELIVERED" };

/** Lo que dice el botón de cada paso. */
export const VERB: Record<string, string> = { CONFIRMED: "Confirmar", IN_PRODUCTION: "A producción", READY: "Marcar listo", SHIPPED: "Marcar enviado", DELIVERED: "Marcar entregado", CANCELED: "Cancelar" };

/** Glifo del estado en su insignia: lo nuevo llama la atención, lo terminado se calma. */
export const FULFILLMENT_TONE: Record<Fulfillment, StatusTone> = {
  RECEIVED: "warning",
  CONFIRMED: "neutral",
  IN_PRODUCTION: "neutral",
  READY: "success",
  SHIPPED: "neutral",
  DELIVERED: "success",
  CANCELED: "muted",
};

/** Pasos que se muestran en el recorrido del pedido (Enviado solo aparece si el pedido salió con envío). */
export const flowOf = (current: string): readonly Fulfillment[] =>
  current === "SHIPPED" ? ["RECEIVED", "CONFIRMED", "IN_PRODUCTION", "READY", "SHIPPED", "DELIVERED"] : ["RECEIVED", "CONFIRMED", "IN_PRODUCTION", "READY", "DELIVERED"];

/** Acción que mueve un pedido a otro paso (la resuelve la lista: confirma, abre el diálogo de envío o de entrega, o llama al servidor). */
export type MoveOrder = (orderId: string, to: Fulfillment) => void;
