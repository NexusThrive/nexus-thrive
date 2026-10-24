-- ============================================================================
-- 2026-10-24 · Presencia v2: foto diaria para la tendencia
--
-- Equivale a la migración migrations/app/20261024T1312_presencia_v2.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."PresenceSnapshot" (
  "coverage" int4 NOT NULL,
  "day" text NOT NULL,
  "id" text NOT NULL,
  "phase" text NOT NULL,
  "pillars" json NOT NULL,
  "score" int4 NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."PresenceSnapshot" ADD CONSTRAINT "PresenceSnapshot_tenantId_day_key" UNIQUE ("tenantId", "day");

CREATE INDEX "PresenceSnapshot_tenantId_idx_c93ed4f1" ON "public"."PresenceSnapshot" ("tenantId");

ALTER TABLE "public"."PresenceSnapshot"
ADD CONSTRAINT "PresenceSnapshot_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."PresenceSnapshot" ENABLE ROW LEVEL SECURITY;

COMMIT;
