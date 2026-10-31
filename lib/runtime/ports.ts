import { seedAccounting } from "@/lib/accounting/accounting-db";
import { cashAccountFor, postByRule, reverseSource } from "@/lib/accounting/ledger-db";
import { accountingPort } from "@/lib/business/accounting-port";
import { numberingPort } from "@/lib/business/numbering-port";
import { paymentGatewayPort } from "@/lib/store/payment-gateway-port";
import { connectedGateways, createIntent } from "@/lib/payments/intents-db";
import { providedPorts } from "@/lib/ports";
import { allocateNumber, commitNumber, withholdingsFor } from "@/lib/tax/tax-db";
import { tenantProvisioningPort } from "@/lib/tenant/provisioning-port";

/**
 * Raíz de composición: conecta cada puerto declarado por un dominio con la implementación de otro.
 *
 * Es el único lugar que conoce a los dos lados (por eso está en la capa de experiencia, que puede importar todo). Se ejecuta
 * una vez al arrancar el servidor (`instrumentation.ts`) y en la preparación de las pruebas (`vitest.setup.ts`). Es idempotente:
 * volver a llamarla reemplaza las implementaciones por las mismas.
 *
 * Agregar un puerto = declararlo en el dominio que lo necesita, conectarlo aquí, y el test de arquitectura
 * (`tests/architecture/e5-puertos.test.ts`) exige que todo puerto declarado quede conectado.
 *
 * Devuelve los nombres de los puertos conectados.
 */
export function composePorts(): string[] {
  // Contabilidad: Business informa hechos; Finance decide si corresponde un asiento y con qué cuentas.
  accountingPort.provide({
    record: (tx, tenantId, fact, userId) =>
      postByRule(
        tx,
        tenantId,
        fact.event,
        fact.amounts,
        {
          date: fact.date,
          description: fact.description,
          sourceType: fact.sourceType,
          sourceId: fact.sourceId,
          partyId: fact.partyId,
          costCenterId: fact.costCenterId,
          // El medio de pago decide Caja o Bancos: los códigos del plan de cuentas son de Finance.
          swap: fact.paymentMethod ? cashAccountFor(fact.paymentMethod) : undefined,
        },
        userId,
      ),
    reverse: (tx, tenantId, sourceType, sourceId, reason, userId) => reverseSource(tx, tenantId, sourceType, sourceId, reason, userId),
  });

  // Numeración fiscal y retenciones de los documentos comerciales.
  numberingPort.provide({
    allocate: (tx, tenantId, documentKind, date) => allocateNumber(tx, tenantId, documentKind, date),
    commit: (tx, tenantId, allocation) => commitNumber(tx, tenantId, allocation),
    withholdings: (tx, tenantId, codes, totals, date) => withholdingsFor(tx, tenantId, codes, totals, date),
  });

  // Cobros en línea de la tienda.
  paymentGatewayPort.provide({ connectedGateways, createIntent });

  // Un negocio nuevo trae su plan de cuentas y sus reglas contables de partida.
  tenantProvisioningPort.provide({
    onCreated: async (tx, tenantId) => {
      await seedAccounting(tenantId, tx);
    },
  });

  return providedPorts();
}
