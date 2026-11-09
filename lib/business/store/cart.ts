import { documentTotals, type DocumentLineInput } from "@/lib/business/sales/commercial-document";

/**
 * Tienda en línea (reglas puras): validación del pedido, totales con impuestos, código y mensaje. El
 * servidor vuelve a calcular todo con los precios de la base; lo que mande el navegador nunca fija un valor.
 */
export type CartLine = { productId: string; quantity: number };
export type CustomerData = { name: string; phone: string; email: string; address: string; city: string; notes: string };

export const MAX_LINES = 40;
export const MAX_QTY = 99;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Problemas legibles de los datos del cliente, por campo. Vacío = todo bien. */
export function validateCustomer(c: CustomerData): Partial<Record<keyof CustomerData, string>> {
  const e: Partial<Record<keyof CustomerData, string>> = {};
  if (c.name.trim().length < 3) e.name = "Escribe tu nombre completo.";
  if (c.phone.replace(/\D/g, "").length < 10) e.phone = "Escribe un celular de 10 dígitos para coordinar la entrega.";
  if (c.email.trim() && !EMAIL.test(c.email.trim())) e.email = "Ese correo no parece válido.";
  if (c.address.length > 200) e.address = "La dirección es muy larga.";
  if (c.notes.length > 300) e.notes = "Las notas son muy largas (máximo 300).";
  return e;
}

/** Une repetidos y descarta cantidades inválidas; devuelve el error legible si el carrito no sirve. */
export function normalizeCart(lines: readonly CartLine[]): { ok: true; lines: CartLine[] } | { ok: false; message: string } {
  if (!lines.length) return { ok: false, message: "Tu carrito está vacío." };
  if (lines.length > MAX_LINES) return { ok: false, message: "El carrito tiene demasiados productos distintos." };
  const by = new Map<string, number>();
  for (const l of lines) {
    if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > MAX_QTY) return { ok: false, message: `La cantidad debe estar entre 1 y ${MAX_QTY}.` };
    by.set(l.productId, (by.get(l.productId) ?? 0) + l.quantity);
  }
  for (const q of by.values()) if (q > MAX_QTY) return { ok: false, message: `La cantidad por producto va hasta ${MAX_QTY}.` };
  return { ok: true, lines: [...by].map(([productId, quantity]) => ({ productId, quantity })) };
}

/** Totales de un pedido de la tienda con las mismas reglas de los documentos comerciales. */
export const orderTotals = (lines: readonly DocumentLineInput[]) => documentTotals(lines);
/** Código legible de un pedido de la tienda («T-0012»). */
export const orderCode = (n: number) => `T-${String(n).padStart(4, "0")}`;

/** Un pedido sin pagar tras este tiempo se considera abandonado. */
export const ABANDON_AFTER_MINUTES = 60;
/** ¿Un pedido sin pagar superó el tiempo para considerarse abandonado (60 minutos por defecto)? */
export const isAbandoned = (createdAtMs: number, nowMs: number, minutes = ABANDON_AFTER_MINUTES) => nowMs - createdAtMs >= minutes * 60_000;

const peso = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

/** Texto del pedido para enviarlo por WhatsApp al negocio. */
export function orderMessage(input: { code: string; business: string; lines: { name: string; quantity: number; unitPrice: number }[]; total: number; customer: Pick<CustomerData, "name" | "address" | "city">; payUrl?: string | null }): string {
  const items = input.lines.map((l) => `• ${l.quantity} × ${l.name} (${peso(l.unitPrice)})`).join("\n");
  const where = [input.customer.address, input.customer.city].filter(Boolean).join(", ");
  return [`Hola ${input.business}, hice el pedido ${input.code}:`, items, `Total: ${peso(input.total)}`, `A nombre de: ${input.customer.name}`, where ? `Entrega: ${where}` : "", input.payUrl ? `Enlace de pago: ${input.payUrl}` : ""].filter(Boolean).join("\n");
}

/** Canales por los que puede entrar un pedido (WEB es la tienda en línea propia). */
export const ORDER_CHANNELS = ["WEB", "API", "WHATSAPP", "SHOPIFY", "WOOCOMMERCE", "OTHER"] as const;
export type OrderChannel = (typeof ORDER_CHANNELS)[number];
export const CHANNEL_LABELS: Record<OrderChannel, string> = { WEB: "Tienda en línea", API: "API", WHATSAPP: "WhatsApp", SHOPIFY: "Shopify", WOOCOMMERCE: "WooCommerce", OTHER: "Otro canal" };

/** Identificador del pedido en el canal de origen: sin espacios en los bordes ni controles, hasta 80 caracteres; vacío = sin identificador. */
export function cleanExternalId(value: string | null | undefined): string | null {
  // eslint-disable-next-line no-control-regex -- se descartan caracteres de control del identificador externo
  const v = (value ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80);
  return v || null;
}
