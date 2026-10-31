import type { DbWriter } from "@/lib/foundation/db/db-transaction";
import { definePort } from "@/lib/foundation/ports";

/**
 * Contrato de aprovisionamiento de un negocio nuevo (Core).
 *
 * Al crear un negocio, Core ejecuta esto dentro de la misma transacción para que los dominios dejen listo lo suyo
 * (hoy, Finance siembra el plan de cuentas y las reglas contables de partida). Core no sabe qué se hace: solo avisa.
 * Si algo falla, el negocio no se crea.
 */
export type TenantProvisioningPort = {
  onCreated(tx: DbWriter, tenantId: string): Promise<void>;
};

export const tenantProvisioningPort = definePort<TenantProvisioningPort>("tenant-provisioning");
