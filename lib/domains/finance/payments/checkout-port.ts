import { definePort } from "@/lib/ports";

/**
 * Contrato entre los cobros en línea (Finance) y las pasarelas de pago (Integrations).
 *
 * Los cobros guardan la intención de pago y a qué pasarela corresponde; armar el enlace del checkout alojado de esa
 * pasarela (con sus credenciales cifradas) es del adaptador del proveedor. Hoy solo Wompi tiene checkout alojado.
 */

export type HostedCheckoutRequest = {
  provider: string;
  /** Credenciales de la conexión, tal como están guardadas (cifradas). */
  credentialsEnc: string;
  reference: string;
  amount: number;
};

export type CheckoutPort = {
  /** Enlace del checkout alojado, o `null` si la pasarela no tiene uno. Lanza si las credenciales no se pueden leer. */
  hostedCheckoutUrl(input: HostedCheckoutRequest): string | null;
};

export const checkoutPort = definePort<CheckoutPort>("payment-checkout");
