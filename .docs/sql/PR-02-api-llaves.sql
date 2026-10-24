-- ============================================================================
-- PR-02-api-llaves · API: llaves por negocio, registro de uso e idempotencia
-- PR-02 de .docs/hoja-de-ruta-implementacion.md
--
-- BORRADOR DE DISEÑO PARA REVISAR, no para correr. La migración real sale de
-- editar prisma/contract.prisma y ejecutar `prisma migration plan` (ver la
-- hoja de ruta, «Cómo se migra»). Este archivo fija las tablas, las columnas, las
-- llaves y los índices que esa edición debe producir. Aditivo e idempotente.
--
-- Llaves de API por negocio (solo su hash), registro de cada llamada y respuestas
-- guardadas para la idempotencia. Sustenta /api/v1 y el MCP.
-- Reglas: la llave completa se muestra una sola vez; el rol de la llave nunca supera el de quien la creó.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."ApiKey" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "name" text NOT NULL,
  "keyPrefix" text NOT NULL,
  "keyHash" text NOT NULL,
  "environment" text DEFAULT 'live' NOT NULL,
  "scopes" text[] DEFAULT '{}' NOT NULL,
  "ipAllowlist" text[] DEFAULT '{}' NOT NULL,
  "createdById" text,
  "createdByRole" text,
  "expiresAt" timestamptz,
  "lastUsedAt" timestamptz,
  "revokedAt" timestamptz,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "ApiKey_check_1" CHECK ("environment" IN ('live','test'))
);
CREATE INDEX IF NOT EXISTS "ApiKey_tenantId_idx" ON "public"."ApiKey" ("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_keyHash_key" ON "public"."ApiKey" ("keyHash");
ALTER TABLE "public"."ApiKey" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."ApiRequestLog" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "apiKeyId" text,
  "requestId" text NOT NULL,
  "method" text NOT NULL,
  "path" text NOT NULL,
  "operationId" text,
  "status" int4 NOT NULL,
  "durationMs" int4 NOT NULL,
  "idempotencyKey" text,
  "ip" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "ApiRequestLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "ApiRequestLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "public"."ApiKey" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "ApiRequestLog_tenantId_createdAt_idx" ON "public"."ApiRequestLog" ("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "ApiRequestLog_apiKeyId_createdAt_idx" ON "public"."ApiRequestLog" ("apiKeyId", "createdAt");
ALTER TABLE "public"."ApiRequestLog" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."IdempotencyRecord" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "apiKeyId" text NOT NULL,
  "key" text NOT NULL,
  "requestHash" text NOT NULL,
  "responseStatus" int4 NOT NULL,
  "responseBody" jsonb NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "IdempotencyRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "IdempotencyRecord_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "public"."ApiKey" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IdempotencyRecord_expiresAt_idx" ON "public"."IdempotencyRecord" ("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyRecord_apiKeyId_key_key" ON "public"."IdempotencyRecord" ("apiKeyId", "key");
ALTER TABLE "public"."IdempotencyRecord" ENABLE ROW LEVEL SECURITY;

-- Limpieza: un cron borra IdempotencyRecord vencidos (24 h) y ApiRequestLog según la retención del plan.

COMMIT;
