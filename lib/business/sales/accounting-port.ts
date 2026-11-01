import type { DbWriter } from "@/lib/foundation/db/db-transaction";
import { definePort } from "@/lib/foundation/ports";

/**
 * Contrato entre Business y la contabilidad (Finance).
 *
 * Business informa **hechos** de negocio (se emitió una venta, se cobró un pago, salió mercancía, se recibió una
 * compra) y pide revertir los de un origen. Qué asiento corresponde (si la contabilidad está activa, si hay una regla,
 * qué cuentas, si el período está abierto) lo decide Finance; Business no conoce ni cuentas ni períodos.
 *
 * Todo ocurre dentro de la transacción de quien llama: si la contabilidad falla (p. ej. período cerrado), se deshace
 * también lo que Business había escrito. Publicar un hecho no obliga a asentarlo: la implementación puede responder
 * `null` si la contabilidad del negocio está apagada o no hay regla para ese hecho.
 */

export type AccountingEvent = "SALE" | "CREDIT_NOTE" | "DEBIT_NOTE" | "PAYMENT_RECEIVED" | "SALE_COST" | "SALE_COST_RETURN" | "PURCHASE_RECEIVED";

/** Importes del hecho, con los nombres que usan las reglas contables. */
export type AccountingAmounts = Partial<Record<"total" | "subtotal" | "tax" | "cost" | "payment" | "withholding" | "tip", number>>;

export type AccountingFact = {
  event: AccountingEvent;
  amounts: AccountingAmounts;
  /** Día de negocio en Colombia, "YYYY-MM-DD". */
  date: string;
  description: string;
  /** Tipo y id del registro de Business que origina el hecho (para trazabilidad y para poder revertirlo). */
  sourceType: string;
  sourceId: string;
  partyId?: string | null;
  costCenterId?: string | null;
  /** Medio de pago de un cobro, para que la contabilidad decida si entra a Caja o a Bancos. */
  paymentMethod?: string;
};

export type AccountingPort = {
  /** Asienta el hecho si corresponde. Devuelve el asiento creado, o `null` si no hubo que asentar nada. */
  record(tx: DbWriter, tenantId: string, fact: AccountingFact, userId: string | null): Promise<{ id: string; number: number } | null>;
  /** Revierte los asientos de un origen que aún no estén reversados. Devuelve cuántos revirtió. */
  reverse(tx: DbWriter, tenantId: string, sourceType: string, sourceId: string, reason: string, userId: string | null): Promise<number>;
};

export const accountingPort = definePort<AccountingPort>("accounting");
