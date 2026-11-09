import { db } from "@/prisma/db";
import { IDEMPOTENCY_STALE_MS, IDEMPOTENCY_TTL_MS, type IdempotencyClaim, type IdempotencyStore } from "./idempotency";

const instant = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms);
const msOf = (value: unknown) => new Date(String(value)).getTime();

/** Almacén de idempotencia sobre `IdempotencyRecord`: la llave se reclama con un INSERT (único por llave de API + `Idempotency-Key`). */
export const idempotencyStore: IdempotencyStore = {
  async claim({ tenantId, apiKeyId, key, hash }): Promise<IdempotencyClaim> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await db.orm.public.IdempotencyRecord.create({ tenantId, apiKeyId, key, requestHash: hash, responseStatus: 0, responseBody: {} as never, expiresAt: instant(Date.now() + IDEMPOTENCY_TTL_MS) });
        return { state: "new" };
      } catch (error) {
        const existing = await db.orm.public.IdempotencyRecord.where({ tenantId, apiKeyId, key }).first();
        if (!existing) throw error;
        const expired = msOf(existing.expiresAt) < Date.now();
        const stale = existing.responseStatus === 0 && Date.now() - msOf(existing.createdAt) > IDEMPOTENCY_STALE_MS;
        if (expired || stale) {
          await db.orm.public.IdempotencyRecord.where({ tenantId, id: existing.id }).deleteAll();
          continue;
        }
        if (existing.requestHash !== hash) return { state: "conflict" };
        if (existing.responseStatus === 0) return { state: "in_progress" };
        return { state: "replay", status: existing.responseStatus, body: existing.responseBody };
      }
    }
    return { state: "in_progress" };
  },
  async complete({ tenantId, apiKeyId, key, status, body }) {
    await db.orm.public.IdempotencyRecord.where({ tenantId, apiKeyId, key }).update({ responseStatus: status, responseBody: body as never });
  },
  async release({ tenantId, apiKeyId, key }) {
    await db.orm.public.IdempotencyRecord.where({ tenantId, apiKeyId, key }).deleteAll();
  },
};
