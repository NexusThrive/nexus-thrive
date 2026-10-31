/**
 * Contacto de NEXUS para coordinar el pago del acceso.
 *
 * En el piloto no hay cobro automático (Wompi): la persona que quiere un plan
 * escribe a NEXUS, se confirma el pago por fuera y NEXUS emite un código de
 * acceso con los días pagados.
 */

/** Número de WhatsApp de NEXUS (formato internacional, solo dígitos). */
const DEFAULT_WHATSAPP = "573237453913";

export const NEXUS_WHATSAPP_NUMBER: string = (
  process.env.NEXT_PUBLIC_NEXUS_WHATSAPP?.trim() || DEFAULT_WHATSAPP
).replace(/\D/g, "");

/** Enlace de WhatsApp con el mensaje listo para enviar. */
export function whatsappLink(message: string): string {
  return `https://wa.me/${NEXUS_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** Mensaje que la persona envía al elegir un plan (con su negocio). */
export function accessRequestMessage(input: {
  planName: string;
  businessName?: string;
  city?: string;
}): string {
  const lines = [
    `Hola, quiero activar NEXUS THRIVE (plan ${input.planName}).`,
    input.businessName ? `Mi negocio: ${input.businessName}.` : null,
    input.city ? `Ciudad: ${input.city}.` : null,
    "¿Cuánto pago y cómo lo hago?",
  ];
  return lines.filter(Boolean).join(" ");
}
