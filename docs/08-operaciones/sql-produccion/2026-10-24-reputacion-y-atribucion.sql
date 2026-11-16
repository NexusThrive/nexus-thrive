-- ============================================================================
-- 2026-10-24 · Reputación y atribución
--
-- Equivale a la migración migrations/app/20261024T1344_reputacion_y_atribucion.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."ContactLead" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "email" text,
  "id" text NOT NULL,
  "message" text,
  "name" text NOT NULL,
  "origin" json,
  "phone" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."Review" (
  "comment" text,
  "contact" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "customerName" text,
  "handledAt" timestamptz,
  "id" text NOT NULL,
  "rating" int4 NOT NULL,
  "source" text DEFAULT 'INTERNAL' NOT NULL,
  "status" text DEFAULT 'NEW' NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."TrackedLink" (
  "active" bool DEFAULT true NOT NULL,
  "clicks" int4 DEFAULT 0 NOT NULL,
  "code" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "path" text DEFAULT '' NOT NULL,
  "spend" numeric DEFAULT '0'::numeric NOT NULL,
  "tenantId" text NOT NULL,
  "utmCampaign" text NOT NULL,
  "utmMedium" text NOT NULL,
  "utmSource" text NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."StoreOrder" ADD COLUMN "origin" json;

ALTER TABLE "public"."TrackedLink" ADD CONSTRAINT "TrackedLink_code_key" UNIQUE ("code");

CREATE INDEX "ContactLead_tenantId_createdAt_idx_88162366" ON "public"."ContactLead" ("tenantId", "createdAt");

CREATE INDEX "ContactLead_tenantId_idx_c93ed4f1" ON "public"."ContactLead" ("tenantId");

CREATE INDEX "Review_tenantId_createdAt_idx_88162366" ON "public"."Review" ("tenantId", "createdAt");

CREATE INDEX "Review_tenantId_idx_c93ed4f1" ON "public"."Review" ("tenantId");

CREATE INDEX "TrackedLink_tenantId_idx_c93ed4f1" ON "public"."TrackedLink" ("tenantId");

ALTER TABLE "public"."ContactLead"
ADD CONSTRAINT "ContactLead_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."Review"
ADD CONSTRAINT "Review_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."TrackedLink"
ADD CONSTRAINT "TrackedLink_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."ContactLead" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."Review" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."TrackedLink" ENABLE ROW LEVEL SECURITY;

COMMIT;
