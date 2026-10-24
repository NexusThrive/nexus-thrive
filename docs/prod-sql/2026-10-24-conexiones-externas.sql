-- ============================================================================
-- 2026-10-24 · Conexiones externas y eventos de proveedores (PR-06)
--
-- Equivale a la migración migrations/app/20261024T0214_conexiones_externas.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."ExternalConnection" (
  "config" json,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "credentialsEnc" text,
  "credentialsKeyId" text,
  "environment" text DEFAULT 'sandbox' NOT NULL,
  "id" text NOT NULL,
  "kind" text NOT NULL,
  "lastCheckedAt" timestamptz,
  "lastError" text,
  "provider" text NOT NULL,
  "status" text DEFAULT 'DISCONNECTED' NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."ProviderEvent" (
  "connectionId" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "error" text,
  "eventType" text NOT NULL,
  "externalId" text NOT NULL,
  "id" text NOT NULL,
  "kind" text NOT NULL,
  "processedAt" timestamptz,
  "provider" text NOT NULL,
  "rawBody" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."ExternalConnection" ADD CONSTRAINT "ExternalConnection_tenantId_kind_provider_environment_key" UNIQUE ("tenantId", "kind", "provider", "environment");

ALTER TABLE "public"."ProviderEvent" ADD CONSTRAINT "ProviderEvent_tenantId_provider_externalId_key" UNIQUE ("tenantId", "provider", "externalId");

CREATE INDEX "ExternalConnection_tenantId_idx_c93ed4f1" ON "public"."ExternalConnection" ("tenantId");

CREATE INDEX "ExternalConnection_tenantId_kind_idx_1e76dd5c" ON "public"."ExternalConnection" ("tenantId", "kind");

CREATE INDEX "ProviderEvent_connectionId_idx_b3eeb6ac" ON "public"."ProviderEvent" ("connectionId");

CREATE INDEX "ProviderEvent_processedAt_idx_e83f4a54" ON "public"."ProviderEvent" ("processedAt");

CREATE INDEX "ProviderEvent_tenantId_createdAt_idx_88162366" ON "public"."ProviderEvent" ("tenantId", "createdAt");

CREATE INDEX "ProviderEvent_tenantId_idx_c93ed4f1" ON "public"."ProviderEvent" ("tenantId");

ALTER TABLE "public"."ExternalConnection"
ADD CONSTRAINT "ExternalConnection_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."ProviderEvent"
ADD CONSTRAINT "ProviderEvent_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."ProviderEvent"
ADD CONSTRAINT "ProviderEvent_connectionId_fkey"
FOREIGN KEY ("connectionId")
REFERENCES "public"."ExternalConnection" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."ExternalConnection" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."ProviderEvent" ENABLE ROW LEVEL SECURITY;

COMMIT;
