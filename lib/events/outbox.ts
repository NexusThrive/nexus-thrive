import type { MoneyTx } from "@/lib/business/money-service";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/**
 * Catálogo de eventos de dominio. Cada uno es un contrato versionado: el
 * `payload` solo gana campos (nunca cambia el significado de uno existente);
 * un cambio incompatible sube `version`.
 */
export const EVENT_TYPES = ["sale.completed", "sale.returned", "provider.event_received"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type DomainEvent = {
  type: EventType;
  version?: number;
  resourceType?: string;
  resourceId?: string;
  payload: { [key: string]: Json };
};

/**
 * Anota un hecho en el outbox **dentro de la misma transacción** que lo causó:
 * si la transacción se deshace, el evento también; si se confirma, el evento
 * existe aunque el servidor se caiga justo después. El envío lo hace el
 * despachador (`dispatcher.ts`), nunca esta función.
 */
export async function emitEvent(tx: MoneyTx, tenantId: string, event: DomainEvent): Promise<void> {
  await tx.orm.public.OutboxEvent.create({
    tenantId,
    type: event.type,
    version: event.version ?? 1,
    resourceType: event.resourceType ?? null,
    resourceId: event.resourceId ?? null,
    payload: event.payload,
  });
}
