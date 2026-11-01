import type { DocumentKind, DocumentLineInput } from "@/lib/business/commercial-document";
import type { DbWriter } from "@/lib/db-transaction";
import { definePort } from "@/lib/ports";

/**
 * Contrato entre los documentos comerciales (Business) y la facturación electrónica (Integrations).
 *
 * Al crear un documento, Business informa el hecho («este documento existe») y la facturación electrónica decide si
 * corresponde dejar un documento fiscal en cola: si el negocio la tiene activada y el tipo se factura. Ocurre en la misma
 * transacción que la venta y nunca la rechaza; el envío al proveedor es aparte, en orden y sin duplicar.
 */

export type FiscalDocumentFacts = {
  id: string;
  kind: DocumentKind;
  number: number;
  prefix: string | null;
  /** Día de negocio en Colombia, "YYYY-MM-DD". */
  issueDate: string;
  customerName: string;
  customerDoc: string | null;
  lines: readonly (DocumentLineInput & { total: number })[];
  totals: { subtotal: number; discountTotal: number; taxTotal: number; total: number };
  /** Documento al que ajusta una nota crédito o débito (por ejemplo «V-000012»). */
  relatedCode?: string | null;
  notes?: string | null;
};

export type FiscalQueuePort = {
  /** Deja en cola el documento fiscal si corresponde; no hace nada si la facturación electrónica no está activa. */
  enqueue(tx: DbWriter, tenantId: string, doc: FiscalDocumentFacts): Promise<void>;
};

export const fiscalQueuePort = definePort<FiscalQueuePort>("fiscal-queue");
