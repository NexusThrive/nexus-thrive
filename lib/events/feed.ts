import { db } from "@/prisma/db";
import { msOf, toInstant } from "./instant";

/**
 * Lectura del outbox para ponerse al día: un cliente (n8n en casa, un agente)
 * pregunta «qué pasó desde el último evento que vi» y recibe los eventos en
 * orden, con un cursor (`next`). Es el respaldo de los webhooks: si el receptor
 * estuvo apagado más de lo que reintentan, nada se pierde.
 */
export const MAX_FEED_LIMIT = 100;

export type FeedEvent = { id: string; type: string; version: number; createdAt: string; data: unknown };
export type Feed = { events: FeedEvent[]; next: string | null };

export async function listEvents(tenantId: string, opts: { after?: string; since?: string; type?: string; limit?: number } = {}): Promise<Feed | { error: string }> {
  const limit = Math.min(MAX_FEED_LIMIT, Math.max(1, Math.trunc(opts.limit ?? 50)));
  let fromMs: number | null = null;
  let afterId: string | null = null;
  if (opts.after) {
    const anchor = await db.orm.public.OutboxEvent.where({ id: opts.after, tenantId }).first();
    if (!anchor) return { error: "El evento de referencia (`after`) no existe en este negocio." };
    fromMs = msOf(anchor.createdAt);
    afterId = anchor.id;
  } else if (opts.since) {
    const ms = Date.parse(opts.since);
    if (Number.isNaN(ms)) return { error: "`since` debe ser una fecha ISO 8601." };
    fromMs = ms;
  }

  let query = db.orm.public.OutboxEvent.where({ tenantId });
  if (opts.type) query = query.where({ type: opts.type });
  if (fromMs !== null) {
    const from = toInstant(fromMs);
    query = query.where((e) => e.createdAt.gte(from));
  }
  // Orden estable (fecha, id). Se sobre-lee para poder saltar lo ya visto con la misma fecha.
  const rows = await query.orderBy((e) => e.createdAt.asc()).limit(limit + 200).all();
  const fresh = rows
    .filter((e) => (opts.after ? !(msOf(e.createdAt) === fromMs && String(e.id) <= (afterId as string)) : true))
    .sort((x, y) => (msOf(x.createdAt) ?? 0) - (msOf(y.createdAt) ?? 0) || String(x.id).localeCompare(String(y.id)))
    .slice(0, limit);
  const events = fresh.map((e) => ({ id: e.id, type: e.type, version: e.version, createdAt: new Date(msOf(e.createdAt) ?? 0).toISOString(), data: e.payload }));
  return { events, next: events.length ? events[events.length - 1].id : (opts.after ?? null) };
}
