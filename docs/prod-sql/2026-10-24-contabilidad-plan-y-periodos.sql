-- ============================================================================
-- 2026-10-24 · Contabilidad: plan de cuentas, períodos, reglas y centros de costo
--
-- Equivale a la migración migrations/app/20261024T1238_contabilidad_plan_y_periodos.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."Account" (
  "active" bool DEFAULT true NOT NULL,
  "code" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "nature" text NOT NULL,
  "postable" bool DEFAULT true NOT NULL,
  "tenantId" text NOT NULL,
  "type" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."AccountingPeriod" (
  "closedAt" timestamptz,
  "closedById" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "month" int4 NOT NULL,
  "note" text,
  "reopenedAt" timestamptz,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "tenantId" text NOT NULL,
  "year" int4 NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."AccountingRule" (
  "active" bool DEFAULT true NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "event" text NOT NULL,
  "id" text NOT NULL,
  "lines" json NOT NULL,
  "name" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."CostCenter" (
  "active" bool DEFAULT true NOT NULL,
  "code" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "kind" text DEFAULT 'CENTER' NOT NULL,
  "name" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_tenantId_code_key" UNIQUE ("tenantId", "code");

ALTER TABLE "public"."AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_tenantId_year_month_key" UNIQUE ("tenantId", "year", "month");

ALTER TABLE "public"."AccountingRule" ADD CONSTRAINT "AccountingRule_tenantId_event_key" UNIQUE ("tenantId", "event");

ALTER TABLE "public"."CostCenter" ADD CONSTRAINT "CostCenter_tenantId_code_key" UNIQUE ("tenantId", "code");

CREATE INDEX "Account_tenantId_idx_c93ed4f1" ON "public"."Account" ("tenantId");

CREATE INDEX "AccountingPeriod_tenantId_idx_c93ed4f1" ON "public"."AccountingPeriod" ("tenantId");

CREATE INDEX "AccountingRule_tenantId_idx_c93ed4f1" ON "public"."AccountingRule" ("tenantId");

CREATE INDEX "CostCenter_tenantId_idx_c93ed4f1" ON "public"."CostCenter" ("tenantId");

ALTER TABLE "public"."Account"
ADD CONSTRAINT "Account_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."AccountingPeriod"
ADD CONSTRAINT "AccountingPeriod_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."AccountingRule"
ADD CONSTRAINT "AccountingRule_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."CostCenter"
ADD CONSTRAINT "CostCenter_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."Account" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."AccountingPeriod" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."AccountingRule" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."CostCenter" ENABLE ROW LEVEL SECURITY;

COMMIT;
