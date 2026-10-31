import type { DbWriter } from "@/lib/foundation/db/db-transaction";
import { definePort } from "@/lib/foundation/ports";

/**
 * Contrato entre los documentos comerciales (Business) y la numeración fiscal y las retenciones (Finance/Tax).
 *
 * Al emitir un documento, Business necesita (1) el número y el prefijo de la resolución vigente, que luego confirma
 * una vez creado el documento, y (2) las retenciones que corresponden a los códigos indicados. Qué resolución está en
 * vigor, los rangos y las tarifas son de Finance; Business solo recibe el resultado, dentro de su misma transacción.
 */

/** Número asignado dentro de una resolución de numeración. */
export type NumberAllocation = { resolutionId: string; prefix: string; number: number };

export type WithholdingLine = { code: string; name: string; kind: string; ratePct: number; base: number; amount: number };

export type NumberingPort = {
  /** Reserva el siguiente número de la resolución vigente para ese tipo de documento y día; `null` si no hay resolución. */
  allocate(tx: DbWriter, tenantId: string, documentKind: string, date: string): Promise<NumberAllocation | null>;
  /** Confirma el número reservado (avanza el consecutivo de la resolución). */
  commit(tx: DbWriter, tenantId: string, allocation: NumberAllocation): Promise<void>;
  /** Retenciones vigentes a esa fecha para los códigos indicados, calculadas sobre la base y el impuesto del documento. */
  withholdings(tx: DbWriter, tenantId: string, codes: readonly string[], totals: { taxable: number; tax: number }, date: string): Promise<WithholdingLine[]>;
};

export const numberingPort = definePort<NumberingPort>("numbering");
