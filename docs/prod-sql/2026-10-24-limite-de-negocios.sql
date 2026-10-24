-- ============================================================================
-- 2026-10-24 · Límite de negocios por persona
--
-- Equivale a la migración migrations/app/20261024T1534_limite_de_negocios.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."AccountLimit" (
  "email" text NOT NULL,
  "maxOrganizations" int4 NOT NULL,
  "note" text,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("email")
);

ALTER TABLE "public"."AccountLimit" ENABLE ROW LEVEL SECURITY;

COMMIT;
