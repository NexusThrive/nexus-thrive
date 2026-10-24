-- ============================================================================
-- 2026-10-24 · Bitácora con origen y medidores de uso (PR-05)
--
-- Equivale a la migración migrations/app/20261024T0200_uso_y_origen.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."UsageCounter" (
  "id" text NOT NULL,
  "limitQuantity" int4,
  "meter" text NOT NULL,
  "period" text NOT NULL,
  "quantity" int4 DEFAULT 0 NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."AuditLog" ADD COLUMN "actorType" text DEFAULT 'USER' NOT NULL;

ALTER TABLE "public"."AuditLog" ADD COLUMN "apiKeyId" text;

ALTER TABLE "public"."AuditLog" ADD COLUMN "requestId" text;

ALTER TABLE "public"."UsageCounter" ADD CONSTRAINT "UsageCounter_tenantId_meter_period_key" UNIQUE ("tenantId", "meter", "period");

CREATE INDEX "AuditLog_apiKeyId_idx_7bbbe9ea" ON "public"."AuditLog" ("apiKeyId");

CREATE INDEX "UsageCounter_tenantId_idx_c93ed4f1" ON "public"."UsageCounter" ("tenantId");

CREATE INDEX "UsageCounter_tenantId_period_idx_f0994702" ON "public"."UsageCounter" ("tenantId", "period");

ALTER TABLE "public"."UsageCounter"
ADD CONSTRAINT "UsageCounter_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."UsageCounter" ENABLE ROW LEVEL SECURITY;

COMMIT;
