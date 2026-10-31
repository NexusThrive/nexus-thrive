import { seedAccounting } from "@/lib/accounting/accounting-db";
import { cashAccountFor, postByRule, reverseSource } from "@/lib/accounting/ledger-db";
import { accountingPort } from "@/lib/business/sales/accounting-port";
import { fiscalQueuePort } from "@/lib/business/sales/fiscal-port";
import { numberingPort } from "@/lib/business/sales/numbering-port";
import { paymentGatewayPort } from "@/lib/store/payment-gateway-port";
import { checkoutPort } from "@/lib/payments/checkout-port";
import { connectedGateways, createIntent } from "@/lib/payments/intents-db";
import { listingPort } from "@/lib/presence/listing-port";
import { enqueueFiscal } from "@/lib/einvoice/einvoice-db";
import { listingView } from "@/lib/google/google-db";
import { decryptCredentials } from "@/lib/providers/connections";
import { wompiCheckoutUrl } from "@/lib/providers/wompi";
import { providedPorts } from "@/lib/ports";
import { allocateNumber, commitNumber, withholdingsFor } from "@/lib/domains/finance/tax/tax-db";
import { tenantProvisioningPort } from "@/lib/tenant/provisioning-port";

/**
 * Raíz de composición: conecta cada puerto declarado por un dominio con la implementación de otro.
 *
 * Es el único lugar que conoce a los dos lados (por eso está en la capa `runtime`, que puede importarlo todo y a la que nadie de `lib/` llama). Se ejecuta
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

  // Facturación electrónica: Business informa que existe un documento; la integración decide si lo deja en cola.
  fiscalQueuePort.provide({ enqueue: (tx, tenantId, doc) => enqueueFiscal(tx, tenantId, doc) });

  // Checkout alojado de la pasarela: los cobros guardan la intención, el adaptador del proveedor arma el enlace.
  checkoutPort.provide({
    hostedCheckoutUrl: ({ provider, credentialsEnc, reference, amount }) => {
      if (provider !== "wompi") return null;
      const c = decryptCredentials(credentialsEnc);
      return wompiCheckoutUrl({ publicKey: c.publicKey ?? "", integritySecret: c.integritySecret ?? "", reference, amount });
    },
  });

  // Ficha de Google para el pilar de presencia.
  listingPort.provide({
    summary: async (tenantId) => {
      const view = await listingView(tenantId);
      return { connected: view.connected, status: view.status, napMatches: view.napMatches };
    },
  });

  // Un negocio nuevo trae su plan de cuentas y sus reglas contables de partida.
  tenantProvisioningPort.provide({
    onCreated: async (tx, tenantId) => {
      await seedAccounting(tenantId, tx);
    },
  });

  return providedPorts();
}
