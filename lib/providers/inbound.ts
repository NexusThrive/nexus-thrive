import { db } from "@/prisma/db";
import { emitEvent } from "@/lib/events/outbox";
import { toInstant } from "@/lib/events/instant";
import { handlePaymentEvent } from "@/lib/payments/intents-db";
import { decryptCredentials } from "./connections";
import { adapterFor } from "./registry";

/**
 * Webhooks entrantes de proveedores. Orden estricto:
 *  1. La URL lleva el id de la conexión (imposible de adivinar); sin conexión
 *     activa → 404 (igual para «no existe» y «apagada»: no se enumera nada).
 *  2. Firma sobre el cuerpo CRUDO con las credenciales de ESA conexión; si no
 *     cuadra → 401 y **no se guarda nada** (un atacante no puede ocupar ids).
 *  3. Se guarda una sola vez por (negocio, proveedor, id externo).
 *  4. Se procesa: queda en el outbox como `provider.event_received` para que
 *     n8n o un webhook de salida reaccionen. Si el proceso falla, el evento
 *     queda guardado con su error y se reintenta (`processPendingProviderEvents`).
 */
export const MAX_BODY_BYTES = 256 * 1024;

export type InboundResult = { status: number; body: Record<string, unknown> };

export async function receiveProviderWebhook(input: { provider: string; connectionId: string; rawBody: string; headers: Headers }): Promise<InboundResult> {
  if (Buffer.byteLength(input.rawBody) > MAX_BODY_BYTES) return { status: 413, body: { error: "Cuerpo demasiado grande." } };
  const adapter = adapterFor(input.provider);
  const connection = adapter ? await db.orm.public.ExternalConnection.where({ id: input.connectionId }).first() : null;
  if (!adapter || !connection || connection.provider !== adapter.provider || connection.status !== "CONNECTED" || !connection.credentialsEnc) {
    return { status: 404, body: { error: "No encontrado." } };
  }

  let credentials;
  try {
    credentials = decryptCredentials(connection.credentialsEnc);
  } catch (error) {
    console.error(`[providers] no se pudieron leer las credenciales de ${connection.id}:`, error);
    return { status: 503, body: { error: "Conexión no disponible." } };
  }
  if (!adapter.verifyWebhook(input.rawBody, input.headers, credentials)) return { status: 401, body: { error: "Firma inválida." } };

  const event = adapter.parseWebhook(input.rawBody);
  if (!event) return { status: 200, body: { ignored: true } };

  let stored;
  try {
    stored = await db.orm.public.ProviderEvent.create({
      tenantId: connection.tenantId,
      connectionId: connection.id,
      provider: adapter.provider,
      kind: adapter.kind,
      eventType: event.type,
      externalId: event.externalId,
      rawBody: input.rawBody,
    });
  } catch {
    return { status: 200, body: { duplicate: true } }; // ya lo teníamos: el proveedor reintentó
  }
  const processed = await processProviderEvent(stored.id);
  return { status: 200, body: { received: true, processed } };
}

/** Procesa un evento guardado; devuelve si quedó procesado. Nunca lanza. */
export async function processProviderEvent(eventId: string): Promise<boolean> {
  const stored = await db.orm.public.ProviderEvent.where({ id: eventId }).first();
  if (!stored || stored.processedAt) return Boolean(stored?.processedAt);
  const adapter = adapterFor(stored.provider);
  const event = adapter?.parseWebhook(stored.rawBody);
  try {
    if (!event) throw new Error("El proveedor ya no está disponible o el evento no se entiende.");
    // Los eventos de una pasarela confirman (o fallan) el cobro en línea que referencian. Es idempotente:
    // si el evento se reprocesa, el cobro ya pagado no vuelve a registrar el ingreso.
    const warning = stored.kind === "PAYMENT" ? await handlePaymentEvent(stored.tenantId, event) : null;
    await db.transaction(async (tx) => {
      await emitEvent(tx, stored.tenantId, {
        type: "provider.event_received",
        resourceType: "provider_event",
        resourceId: stored.id,
        payload: { provider: stored.provider, kind: stored.kind, event_type: event.type, external_id: event.externalId, reference: event.reference ?? null, amount: event.amount ?? null, connection_id: stored.connectionId },
      });
      await tx.orm.public.ProviderEvent.where({ id: stored.id }).update({ processedAt: toInstant(Date.now()), error: warning ? warning.slice(0, 300) : null });
    });
    return true;
  } catch (error) {
    await db.orm.public.ProviderEvent.where({ id: stored.id }).update({ error: (error instanceof Error ? error.message : "Error").slice(0, 300) });
    return false;
  }
}

/** Reintenta los eventos guardados que no se llegaron a procesar. */
export async function processPendingProviderEvents(limit = 50, tenantIds?: readonly string[]): Promise<number> {
  const only = tenantIds ? [...tenantIds] : null;
  const pending = await db.orm.public.ProviderEvent.where((e) => e.processedAt.isNull()).where((e) => (only ? e.tenantId.in(only) : e.processedAt.isNull())).orderBy((e) => e.createdAt.asc()).limit(limit).all();
  let done = 0;
  for (const event of pending) if (await processProviderEvent(event.id)) done++;
  return done;
}
