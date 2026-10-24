import { randomBytes } from "node:crypto";
import { db } from "@/prisma/db";
import { EVENT_TYPES } from "./outbox";
import { msOf, toInstant } from "./instant";
import { decryptSecret, encryptSecret } from "./secrets";
import { checkWebhookUrl } from "./ssrf";

/** Suscripciones de un negocio a sus eventos. El secreto completo se muestra una sola vez. */
export const ROTATION_GRACE_MS = 24 * 3_600_000;
export const MAX_ENDPOINTS = 10;

export type EndpointRow = {
  id: string;
  url: string;
  description: string | null;
  eventTypes: string[];
  active: boolean;
  consecutiveFailures: number;
  disabledReason: string | null;
  createdAt: string;
};

const iso = (v: unknown) => new Date(msOf(v) ?? 0).toISOString();
const toRow = (e: Record<string, unknown>): EndpointRow => ({
  id: String(e.id),
  url: String(e.url),
  description: (e.description as string | null) ?? null,
  eventTypes: (e.eventTypes as string[]) ?? [],
  active: e.active === true,
  consecutiveFailures: Number(e.consecutiveFailures ?? 0),
  disabledReason: (e.disabledReason as string | null) ?? null,
  createdAt: iso(e.createdAt),
});

export type EndpointResult<T> = ({ ok: true } & T) | { ok: false; message: string };

export async function createEndpoint(
  tenantId: string,
  input: { url: string; description?: string; eventTypes?: string[]; createdById?: string | null },
): Promise<EndpointResult<{ row: EndpointRow; secret: string }>> {
  const checked = checkWebhookUrl(input.url.trim());
  if (!checked.ok) return { ok: false, message: checked.reason };
  const types = [...new Set(input.eventTypes ?? [])];
  const unknown = types.find((t) => !(EVENT_TYPES as readonly string[]).includes(t));
  if (unknown) return { ok: false, message: `El evento «${unknown}» no existe.` };
  const existing = await db.orm.public.WebhookEndpoint.where({ tenantId }).all();
  if (existing.length >= MAX_ENDPOINTS) return { ok: false, message: `Máximo ${MAX_ENDPOINTS} webhooks por negocio.` };

  const secret = `whsec_${randomBytes(24).toString("hex")}`;
  const created = await db.orm.public.WebhookEndpoint.create({
    tenantId,
    url: checked.url.toString(),
    description: input.description?.trim().slice(0, 120) || null,
    secretEnc: encryptSecret(secret),
    eventTypes: types,
    createdById: input.createdById ?? null,
  });
  return { ok: true, row: toRow(created as unknown as Record<string, unknown>), secret };
}

export async function listEndpoints(tenantId: string): Promise<EndpointRow[]> {
  const rows = await db.orm.public.WebhookEndpoint.where({ tenantId }).orderBy((e) => e.createdAt.desc()).all();
  return rows.map((r) => toRow(r as unknown as Record<string, unknown>));
}

export async function setEndpointActive(tenantId: string, id: string, active: boolean): Promise<boolean> {
  const found = await db.orm.public.WebhookEndpoint.where({ id, tenantId }).first();
  if (!found) return false;
  await db.orm.public.WebhookEndpoint.where({ id, tenantId }).update({
    active,
    consecutiveFailures: 0,
    disabledAt: active ? null : toInstant(Date.now()),
    disabledReason: active ? null : "Desactivado por una persona",
  });
  return true;
}

export async function deleteEndpoint(tenantId: string, id: string): Promise<boolean> {
  const found = await db.orm.public.WebhookEndpoint.where({ id, tenantId }).first();
  if (!found) return false;
  await db.orm.public.WebhookEndpoint.where({ id, tenantId }).delete();
  return true;
}

/** Secreto nuevo; el anterior sigue firmando junto al nuevo 24 h para migrar sin cortes. */
export async function rotateSecret(tenantId: string, id: string, now = Date.now()): Promise<EndpointResult<{ secret: string }>> {
  const found = await db.orm.public.WebhookEndpoint.where({ id, tenantId }).first();
  if (!found) return { ok: false, message: "No se encontró ese webhook en tu negocio." };
  const secret = `whsec_${randomBytes(24).toString("hex")}`;
  await db.orm.public.WebhookEndpoint.where({ id, tenantId }).update({
    secretEnc: encryptSecret(secret),
    previousSecretEnc: found.secretEnc,
    previousSecretUntil: toInstant(now + ROTATION_GRACE_MS),
  });
  return { ok: true, secret };
}

/** Secretos con los que se firma ahora (el vigente y, en rotación, el anterior). */
export function signingSecrets(endpoint: { secretEnc: string; previousSecretEnc?: unknown; previousSecretUntil?: unknown }, now = Date.now()): string[] {
  const out = [decryptSecret(endpoint.secretEnc)];
  const until = msOf(endpoint.previousSecretUntil);
  if (typeof endpoint.previousSecretEnc === "string" && until !== null && until > now) out.push(decryptSecret(endpoint.previousSecretEnc));
  return out;
}

export type DeliveryRow = {
  id: string;
  endpointId: string;
  eventId: string;
  attempt: number;
  status: string;
  responseStatus: number | null;
  responseExcerpt: string | null;
  createdAt: string;
};

export async function listDeliveries(tenantId: string, opts: { status?: "PENDING" | "SUCCESS" | "FAILED"; limit?: number } = {}): Promise<DeliveryRow[]> {
  const base = db.orm.public.WebhookDelivery.where({ tenantId });
  const rows = await (opts.status ? base.where({ status: opts.status }) : base)
    .orderBy((d) => d.createdAt.desc())
    .limit(Math.min(100, Math.max(1, opts.limit ?? 50)))
    .all();
  return rows.map((d) => ({
    id: d.id,
    endpointId: d.endpointId,
    eventId: d.eventId,
    attempt: d.attempt,
    status: d.status,
    responseStatus: d.responseStatus ?? null,
    responseExcerpt: d.responseExcerpt ?? null,
    createdAt: iso(d.createdAt),
  }));
}

/** Reenvío manual desde la bandeja de fallidos: vuelve a pendiente con los intentos en cero. */
export async function resendDelivery(tenantId: string, id: string): Promise<boolean> {
  const found = await db.orm.public.WebhookDelivery.where({ id, tenantId }).first();
  if (!found) return false;
  await db.orm.public.WebhookDelivery.where({ id, tenantId }).update({ status: "PENDING", attempt: 0, nextAttemptAt: toInstant(Date.now()), deliveredAt: null });
  return true;
}
