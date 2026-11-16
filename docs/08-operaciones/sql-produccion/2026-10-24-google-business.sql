-- ============================================================================
-- 2026-10-24 · Ficha de Google Business
--
-- Equivale a la migración migrations/app/20261024T1337_google_business.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."GoogleListing" (
  "address" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "lastError" text,
  "name" text,
  "phone" text,
  "placeId" text NOT NULL,
  "rating" numeric,
  "ratingCount" int4,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "syncedAt" timestamptz,
  "tenantId" text NOT NULL,
  "website" text,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."GoogleListing" ADD CONSTRAINT "GoogleListing_tenantId_key" UNIQUE ("tenantId");

ALTER TABLE "public"."GoogleListing"
ADD CONSTRAINT "GoogleListing_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."GoogleListing" ENABLE ROW LEVEL SECURITY;

COMMIT;
