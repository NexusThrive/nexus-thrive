-- ============================================================================
-- 2026-10-24 · API: llaves por negocio, registro de uso e idempotencia
--
-- Equivale a la migración migrations/app/20261024T0129_api_llaves.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."ApiKey" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "createdByRole" text,
  "environment" text DEFAULT 'live' NOT NULL,
  "expiresAt" timestamptz,
  "id" text NOT NULL,
  "ipAllowlist" text[] NOT NULL,
  "keyHash" text NOT NULL,
  "keyPrefix" text NOT NULL,
  "lastUsedAt" timestamptz,
  "name" text NOT NULL,
  "revokedAt" timestamptz,
  "scopes" text[] NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "ApiKey_ipAllowlist_elem_not_null_5be915d1" CHECK (array_position("ipAllowlist", NULL) IS NULL),
  CONSTRAINT "ApiKey_scopes_elem_not_null_de6fcc8e" CHECK (array_position("scopes", NULL) IS NULL)
);

CREATE TABLE "public"."ApiRequestLog" (
  "apiKeyId" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "durationMs" int4 NOT NULL,
  "id" text NOT NULL,
  "idempotencyKey" text,
  "ip" text,
  "method" text NOT NULL,
  "operationId" text,
  "path" text NOT NULL,
  "requestId" text NOT NULL,
  "status" int4 NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."IdempotencyRecord" (
  "apiKeyId" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "id" text NOT NULL,
  "key" text NOT NULL,
  "requestHash" text NOT NULL,
  "responseBody" json NOT NULL,
  "responseStatus" int4 NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."ApiKey" ADD CONSTRAINT "ApiKey_keyHash_key" UNIQUE ("keyHash");

ALTER TABLE "public"."IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_apiKeyId_key_key" UNIQUE ("apiKeyId", "key");

CREATE INDEX "ApiKey_tenantId_idx_c93ed4f1" ON "public"."ApiKey" ("tenantId");

CREATE INDEX "ApiRequestLog_apiKeyId_createdAt_idx_a8ac7019" ON "public"."ApiRequestLog" ("apiKeyId", "createdAt");

CREATE INDEX "ApiRequestLog_apiKeyId_idx_7bbbe9ea" ON "public"."ApiRequestLog" ("apiKeyId");

CREATE INDEX "ApiRequestLog_tenantId_createdAt_idx_88162366" ON "public"."ApiRequestLog" ("tenantId", "createdAt");

CREATE INDEX "ApiRequestLog_tenantId_idx_c93ed4f1" ON "public"."ApiRequestLog" ("tenantId");

CREATE INDEX "IdempotencyRecord_apiKeyId_idx_7bbbe9ea" ON "public"."IdempotencyRecord" ("apiKeyId");

CREATE INDEX "IdempotencyRecord_expiresAt_idx_6b6b8c10" ON "public"."IdempotencyRecord" ("expiresAt");

CREATE INDEX "IdempotencyRecord_tenantId_idx_c93ed4f1" ON "public"."IdempotencyRecord" ("tenantId");

ALTER TABLE "public"."ApiKey"
ADD CONSTRAINT "ApiKey_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."ApiRequestLog"
ADD CONSTRAINT "ApiRequestLog_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."ApiRequestLog"
ADD CONSTRAINT "ApiRequestLog_apiKeyId_fkey"
FOREIGN KEY ("apiKeyId")
REFERENCES "public"."ApiKey" ("id")
ON DELETE SET NULL;

ALTER TABLE "public"."IdempotencyRecord"
ADD CONSTRAINT "IdempotencyRecord_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."IdempotencyRecord"
ADD CONSTRAINT "IdempotencyRecord_apiKeyId_fkey"
FOREIGN KEY ("apiKeyId")
REFERENCES "public"."ApiKey" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."ApiKey" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."ApiRequestLog" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."IdempotencyRecord" ENABLE ROW LEVEL SECURITY;

COMMIT;
