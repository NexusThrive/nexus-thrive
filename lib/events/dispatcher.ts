import { db } from "@/prisma/db";
import { signingSecrets } from "./endpoints";
import { msOf, toInstant } from "./instant";
import { signPayload } from "./signing";
import { checkWebhookUrl, resolvesPublic } from "./ssrf";

/**
 * Despachador del outbox. Dos pasos por corrida:
 *  1. **Repartir**: cada evento sin procesar crea una entrega PENDING por cada
 *     webhook activo del negocio que lo pida.
 *  2. **Enviar**: cada entrega vencida se POSTea firmada; si falla se reintenta
 *     con espera creciente y a los 8 intentos pasa a FAILED (bandeja de
 *     fallidos, reenviable a mano).
 *
 * Entrega **al menos una vez**: el receptor debe deduplicar por el id del
 * evento (cabecera `NexusThrive-Event-Id`). Un webhook con 20 fallos seguidos
 * se desactiva solo.
 */
export const MAX_ATTEMPTS = 8;
export const AUTO_DISABLE_AFTER = 20;
const BACKOFF_MS = [60_000, 300_000, 1_800_000, 7_200_000, 21_600_000, 43_200_000, 86_400_000];
const CLAIM_MS = 120_000;
const TIMEOUT_MS = 10_000;
const EXCERPT = 200;

export type DispatchDeps = {
  fetchImpl?: typeof fetch;
  now?: () => number;
  resolveHost?: (host: string) => Promise<boolean>;
  batch?: number;
};

export type DispatchResult = { fannedOut: number; sent: number; succeeded: number; failed: number; deadLettered: number };

export function backoffMs(attemptsDone: number): number {
  return BACKOFF_MS[Math.min(attemptsDone, BACKOFF_MS.length) - 1] ?? BACKOFF_MS[0];
}

export async function dispatchPending(deps: DispatchDeps = {}): Promise<DispatchResult> {
  const doFetch = deps.fetchImpl ?? fetch;
  const nowMs = deps.now ?? Date.now;
  const resolveHost = deps.resolveHost ?? ((h: string) => resolvesPublic(h));
  const batch = deps.batch ?? 50;
  const result: DispatchResult = { fannedOut: 0, sent: 0, succeeded: 0, failed: 0, deadLettered: 0 };

  // 1) Repartir eventos nuevos.
  const events = await db.orm.public.OutboxEvent.where((e) => e.processedAt.isNull()).orderBy((e) => e.createdAt.asc()).limit(100).all();
  for (const event of events) {
    const endpoints = await db.orm.public.WebhookEndpoint.where({ tenantId: event.tenantId, active: true }).all();
    for (const endpoint of endpoints) {
      const types = (endpoint.eventTypes as string[]) ?? [];
      if (types.length && !types.includes(event.type)) continue;
      try {
        await db.orm.public.WebhookDelivery.create({ tenantId: event.tenantId, endpointId: endpoint.id, eventId: event.id, nextAttemptAt: toInstant(nowMs()) });
        result.fannedOut++;
      } catch {
        /* ya existía (otra corrida lo repartió): la llave única lo impide */
      }
    }
    await db.orm.public.OutboxEvent.where({ id: event.id }).update({ processedAt: toInstant(nowMs()) });
  }

  // 2) Enviar las entregas vencidas.
  const due = await db.orm.public.WebhookDelivery
    .where({ status: "PENDING" })
    .where((d) => d.nextAttemptAt.lte(toInstant(nowMs())))
    .orderBy((d) => d.createdAt.asc())
    .limit(batch)
    .all();

  for (const delivery of due) {
    // Reclamo: si otra corrida la toma a la vez, la espera de 2 min evita el doble envío en el caso común.
    await db.orm.public.WebhookDelivery.where({ id: delivery.id }).update({ nextAttemptAt: toInstant(nowMs() + CLAIM_MS) });
    const endpoint = await db.orm.public.WebhookEndpoint.where({ id: delivery.endpointId }).first();
    const event = await db.orm.public.OutboxEvent.where({ id: delivery.eventId }).first();
    if (!endpoint || !event) continue;

    const finish = async (fields: Record<string, unknown>) => db.orm.public.WebhookDelivery.where({ id: delivery.id }).update(fields);
    if (!endpoint.active) {
      await finish({ status: "FAILED", responseExcerpt: "El webhook está desactivado.", nextAttemptAt: null });
      result.deadLettered++;
      continue;
    }

    const attempt = delivery.attempt + 1;
    const started = nowMs();
    let status: number | null = null;
    let excerpt: string | null = null;
    let ok = false;

    const checked = checkWebhookUrl(endpoint.url);
    if (!checked.ok || !(await resolveHost(checked.url.hostname))) {
      excerpt = "Destino no permitido (no es público).";
    } else {
      const body = JSON.stringify({
        id: event.id,
        type: event.type,
        version: event.version,
        created_at: new Date(msOf(event.createdAt) ?? started).toISOString(),
        tenant_id: event.tenantId,
        data: event.payload,
      });
      try {
        const res = await doFetch(checked.url, {
          method: "POST",
          redirect: "manual", // seguir un redirect saltaría la validación de destino
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: {
            "content-type": "application/json",
            "user-agent": "NexusThrive-Webhooks/1",
            "nexusthrive-signature": signPayload(signingSecrets(endpoint, started), body, Math.floor(started / 1000)),
            "nexusthrive-event-id": event.id,
            "nexusthrive-event-type": event.type,
            "nexusthrive-delivery-id": delivery.id,
          },
          body,
        });
        status = res.status;
        ok = res.status >= 200 && res.status < 300;
        excerpt = (await res.text().catch(() => "")).slice(0, EXCERPT) || null;
      } catch (error) {
        excerpt = (error instanceof Error ? error.message : "Error de red").slice(0, EXCERPT);
      }
    }

    result.sent++;
    const durationMs = nowMs() - started;
    if (ok) {
      result.succeeded++;
      await finish({ status: "SUCCESS", attempt, responseStatus: status, responseExcerpt: excerpt, durationMs, nextAttemptAt: null, deliveredAt: toInstant(nowMs()) });
      if (endpoint.consecutiveFailures > 0) await db.orm.public.WebhookEndpoint.where({ id: endpoint.id }).update({ consecutiveFailures: 0 });
      continue;
    }

    result.failed++;
    const dead = attempt >= MAX_ATTEMPTS;
    if (dead) result.deadLettered++;
    await finish({
      status: dead ? "FAILED" : "PENDING",
      attempt,
      responseStatus: status,
      responseExcerpt: excerpt,
      durationMs,
      nextAttemptAt: dead ? null : toInstant(nowMs() + backoffMs(attempt)),
    });
    const failures = endpoint.consecutiveFailures + 1;
    await db.orm.public.WebhookEndpoint.where({ id: endpoint.id }).update(
      failures >= AUTO_DISABLE_AFTER
        ? { consecutiveFailures: failures, active: false, disabledAt: toInstant(nowMs()), disabledReason: `${AUTO_DISABLE_AFTER} fallos seguidos` }
        : { consecutiveFailures: failures },
    );
  }
  return result;
}
