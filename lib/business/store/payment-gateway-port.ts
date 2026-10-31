import { definePort } from "@/lib/foundation/ports";

/**
 * Contrato entre la tienda en línea (Business) y los cobros en línea (Finance/Payments).
 *
 * Al hacer un pedido, la tienda pide un cobro para ese pedido y le muestra al cliente la referencia. Qué pasarelas
 * tiene conectadas el negocio, cómo se crea la intención de pago y cómo se concilia son de Payments; la tienda solo
 * conoce este contrato.
 */

export type GatewayOption = { value: string; label: string };

export type IntentRequest = { amount: number; description: string; expiresInHours?: number; provider?: string };

export type IntentResult = { ok: true; id: string; reference: string } | { ok: false; message: string };

export type PaymentGatewayPort = {
  /** Pasarelas de pago conectadas del negocio. */
  connectedGateways(tenantId: string): Promise<GatewayOption[]>;
  /** Crea la intención de cobro. `userId` identifica quién la origina (p. ej. «tienda»). */
  createIntent(tenantId: string, input: IntentRequest, userId: string): Promise<IntentResult>;
};

export const paymentGatewayPort = definePort<PaymentGatewayPort>("payment-gateway");
