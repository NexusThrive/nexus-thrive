-- ============================================================================
-- 2026-10-24 · Impuestos con vigencia y numeración por resolución
--
-- Equivale a la migración migrations/app/20261024T0600_impuestos_y_numeracion.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."NumberingResolution" (
  "active" bool DEFAULT true NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "documentKind" text NOT NULL,
  "id" text NOT NULL,
  "nextNumber" int4 NOT NULL,
  "prefix" text DEFAULT '' NOT NULL,
  "rangeFrom" int4 NOT NULL,
  "rangeTo" int4 NOT NULL,
  "resolutionNumber" text NOT NULL,
  "tenantId" text NOT NULL,
  "validFrom" timestamptz NOT NULL,
  "validTo" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."TaxRate" (
  "active" bool DEFAULT true NOT NULL,
  "code" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "kind" text NOT NULL,
  "minBase" numeric DEFAULT '0'::numeric NOT NULL,
  "name" text NOT NULL,
  "ratePct" numeric NOT NULL,
  "tenantId" text NOT NULL,
  "validFrom" timestamptz NOT NULL,
  "validTo" timestamptz,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."Invoice" ADD COLUMN "prefix" text;

ALTER TABLE "public"."Invoice" ADD COLUMN "resolutionId" text;

ALTER TABLE "public"."Invoice" ADD COLUMN "withholdingTotal" numeric DEFAULT '0'::numeric NOT NULL;

ALTER TABLE "public"."Invoice" ADD COLUMN "withholdings" json;

CREATE INDEX "NumberingResolution_tenantId_documentKind_idx_c74e69cb" ON "public"."NumberingResolution" ("tenantId", "documentKind");

CREATE INDEX "NumberingResolution_tenantId_idx_c93ed4f1" ON "public"."NumberingResolution" ("tenantId");

CREATE INDEX "TaxRate_tenantId_code_idx_84f464d7" ON "public"."TaxRate" ("tenantId", "code");

CREATE INDEX "TaxRate_tenantId_idx_c93ed4f1" ON "public"."TaxRate" ("tenantId");

CREATE INDEX "TaxRate_tenantId_kind_idx_1e76dd5c" ON "public"."TaxRate" ("tenantId", "kind");

ALTER TABLE "public"."NumberingResolution"
ADD CONSTRAINT "NumberingResolution_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."TaxRate"
ADD CONSTRAINT "TaxRate_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."NumberingResolution" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."TaxRate" ENABLE ROW LEVEL SECURITY;

COMMIT;
