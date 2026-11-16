-- ============================================================================
-- 2026-10-24 · Mini-sitio público del negocio
--
-- Equivale a la migración migrations/app/20261024T1319_mini_sitio.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."SiteConfig" (
  "about" text,
  "accent" text DEFAULT '#D4AF37' NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "description" text,
  "enabled" bool DEFAULT false NOT NULL,
  "heroSubtitle" text,
  "heroTitle" text,
  "id" text NOT NULL,
  "showCatalog" bool DEFAULT true NOT NULL,
  "showMap" bool DEFAULT true NOT NULL,
  "siteSlug" text NOT NULL,
  "template" text DEFAULT 'clasica' NOT NULL,
  "tenantId" text NOT NULL,
  "title" text,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."SiteConfig" ADD CONSTRAINT "SiteConfig_tenantId_key" UNIQUE ("tenantId");

ALTER TABLE "public"."SiteConfig" ADD CONSTRAINT "SiteConfig_siteSlug_key" UNIQUE ("siteSlug");

ALTER TABLE "public"."SiteConfig"
ADD CONSTRAINT "SiteConfig_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."SiteConfig" ENABLE ROW LEVEL SECURITY;

COMMIT;
