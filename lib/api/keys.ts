import { createHash, randomBytes } from "node:crypto";
import { db } from "@/prisma/db";

/** Las columnas de fecha del ORM son `Temporal.Instant` (`lib/temporal.d.ts`). */
const instant = (d: Date) => Temporal.Instant.fromEpochMilliseconds(d.getTime());
const msOf = (value: unknown): number | null => {
  if (!value) return null;
  const v = value as { epochMilliseconds?: number };
  return typeof v.epochMilliseconds === "number" ? v.epochMilliseconds : new Date(value as string).getTime();
};

/**
 * Llaves de API por negocio. Formato `nx_live_<32 hex>` / `nx_test_<32 hex>`:
 * de la llave completa solo se guarda el SHA-256 (se muestra UNA vez al crearla)
 * y un prefijo visible para reconocerla. El rol efectivo de la llave es el de
 * quien la creó; los alcances solo recortan.
 */
export type ApiEnvironment = "live" | "test";

export const KEY_PATTERN = /^nx_(live|test)_[0-9a-f]{32}$/;

export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

export function generateKey(environment: ApiEnvironment) {
  const secret = `nx_${environment}_${randomBytes(16).toString("hex")}`;
  return { secret, prefix: secret.slice(0, 12), hash: hashKey(secret) };
}

/** Lo que se muestra en la lista (nunca la llave ni su hash). */
export type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  environment: ApiEnvironment;
  scopes: string[];
  createdByRole: string | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

const iso = (d: unknown) => (msOf(d) === null ? null : new Date(msOf(d) as number).toISOString());
const toRow = (k: Record<string, unknown>): ApiKeyRow => ({
  id: String(k.id),
  name: String(k.name),
  keyPrefix: String(k.keyPrefix),
  environment: k.environment === "test" ? "test" : "live",
  scopes: (k.scopes as string[]) ?? [],
  createdByRole: (k.createdByRole as string | null) ?? null,
  expiresAt: iso(k.expiresAt),
  lastUsedAt: iso(k.lastUsedAt),
  revokedAt: iso(k.revokedAt),
  createdAt: iso(k.createdAt) as string,
});

export async function createApiKey(
  tenantId: string,
  input: { name: string; environment: ApiEnvironment; scopes: string[]; expiresAt?: Date | null; ipAllowlist?: string[]; createdById: string | null; createdByRole: string },
): Promise<{ row: ApiKeyRow; secret: string }> {
  const { secret, prefix, hash } = generateKey(input.environment);
  const created = await db.orm.public.ApiKey.create({
    tenantId,
    name: input.name.trim().slice(0, 80),
    keyPrefix: prefix,
    keyHash: hash,
    environment: input.environment,
    scopes: input.scopes,
    ipAllowlist: input.ipAllowlist ?? [],
    createdById: input.createdById,
    createdByRole: input.createdByRole,
    expiresAt: input.expiresAt ? instant(input.expiresAt) : null,
  });
  return { row: toRow(created as unknown as Record<string, unknown>), secret };
}

export async function listApiKeys(tenantId: string): Promise<ApiKeyRow[]> {
  const rows = await db.orm.public.ApiKey.where({ tenantId }).orderBy((k) => k.createdAt.desc()).all();
  return rows.map((r) => toRow(r as unknown as Record<string, unknown>));
}

/** Revoca (no borra: el historial de uso conserva su llave). Devuelve false si no es de este negocio. */
export async function revokeApiKey(tenantId: string, id: string): Promise<boolean> {
  const found = await db.orm.public.ApiKey.where({ id, tenantId }).first();
  if (!found) return false;
  if (!found.revokedAt) await db.orm.public.ApiKey.where({ id, tenantId }).update({ revokedAt: instant(new Date()) });
  return true;
}

export type AuthenticatedKey = {
  id: string;
  tenantId: string;
  name: string;
  environment: ApiEnvironment;
  scopes: string[];
  ipAllowlist: string[];
  createdByRole: string | null;
};

export type AuthResult = { ok: true; key: AuthenticatedKey } | { ok: false; reason: "missing" | "malformed" | "unknown" | "revoked" | "expired" };

/** Autentica el valor de `Authorization: Bearer nx_…`. */
export async function authenticateApiKey(header: string | null, now = new Date()): Promise<AuthResult> {
  if (!header) return { ok: false, reason: "missing" };
  const secret = /^Bearer\s+(\S+)$/i.exec(header)?.[1];
  if (!secret || !KEY_PATTERN.test(secret)) return { ok: false, reason: "malformed" };
  const row = await db.orm.public.ApiKey.where({ keyHash: hashKey(secret) }).first();
  if (!row) return { ok: false, reason: "unknown" };
  if (row.revokedAt) return { ok: false, reason: "revoked" };
  const expires = msOf(row.expiresAt);
  if (expires !== null && expires <= now.getTime()) return { ok: false, reason: "expired" };
  // «Último uso»: se escribe como mucho una vez por minuto (no una escritura por petición).
  const last = msOf(row.lastUsedAt) ?? 0;
  if (now.getTime() - last > 60_000) {
    await db.orm.public.ApiKey.where({ id: row.id }).update({ lastUsedAt: instant(now) }).catch(() => undefined);
  }
  return {
    ok: true,
    key: {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      environment: row.environment === "test" ? "test" : "live",
      scopes: (row.scopes as string[]) ?? [],
      ipAllowlist: (row.ipAllowlist as string[]) ?? [],
      createdByRole: (row.createdByRole as string | null) ?? null,
    },
  };
}

/** Registro de uso (sin cuerpos ni secretos): quién llamó, qué, cuándo y con qué resultado. */
export async function recordApiRequest(entry: {
  tenantId: string;
  apiKeyId: string | null;
  requestId: string;
  method: string;
  path: string;
  operationId: string | null;
  status: number;
  durationMs: number;
  ip: string | null;
}) {
  await db.orm.public.ApiRequestLog.create(entry);
}
