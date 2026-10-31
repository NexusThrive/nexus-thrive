import type { EventSubscriber } from "@/lib/core/events/dispatcher";
import { refreshPresence } from "./pillars-db";

/**
 * Suscriptor de presencia digital: recalcula la presencia del negocio cuando ocurre algo que la mueve
 * (una venta, un cobro o un evento de pasarela). El despachador de eventos (Core) no conoce este
 * módulo: quien lo invoca (la ruta de cron) lo entrega en `subscribers`.
 */
export const presenceSubscriber: EventSubscriber = {
  name: "presencia",
  matches: (type) => /^(sale\.|provider\.)/.test(type),
  handle: async (tenantId) => {
    await refreshPresence(tenantId);
  },
};
