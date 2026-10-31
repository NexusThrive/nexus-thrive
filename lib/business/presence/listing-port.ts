import { definePort } from "@/lib/foundation/ports";

/**
 * Contrato entre la presencia en línea (Business) y la ficha de Google (Integrations).
 *
 * Para medir el pilar de Google, la presencia solo necesita saber si hay una ficha conectada, cómo quedó su última
 * sincronización y cuántos de los cuatro datos (nombre, dirección, teléfono, sitio) coinciden con los de NEXUS.
 * Cómo se conecta, se sincroniza o se consulta la ficha es del adaptador de Google.
 */

export type GoogleListingSummary = {
  connected: boolean;
  status: "PENDING" | "OK" | "ERROR" | null;
  /** De 4 datos, cuántos coinciden con los del negocio en NEXUS. */
  napMatches: number;
};

export type ListingPort = {
  summary(tenantId: string): Promise<GoogleListingSummary>;
};

export const listingPort = definePort<ListingPort>("google-listing");
