-- ============================================================================
-- PR-21-contabilidad-plan-y-periodos · Contabilidad I: plan de cuentas, centros de costo, períodos y reglas
-- PR-21 de .docs/hoja-de-ruta-implementacion.md
--
-- BORRADOR DE DISEÑO PARA REVISAR, no para correr. La migración real sale de
-- editar prisma/contract.prisma y ejecutar `prisma migration plan` (ver la
-- hoja de ruta, «Cómo se migra»). Este archivo fija las tablas, las columnas, las
-- llaves y los índices que esa edición debe producir. Aditivo e idempotente.
--
-- Plan de cuentas (PUC) por negocio sembrado desde una plantilla para pymes, centros de
-- costo, períodos con cierre y las reglas que dicen qué asiento genera cada evento.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."Account" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "nature" text NOT NULL,
  "level" int4 NOT NULL,
  "parentId" text,
  "acceptsPosting" bool DEFAULT false NOT NULL,
  "thirdPartyRequired" bool DEFAULT false NOT NULL,
  "costCenterRequired" bool DEFAULT false NOT NULL,
  "active" bool DEFAULT true NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "Account_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "Account_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Account" ("id") ON DELETE SET NULL,
  CONSTRAINT "Account_check_1" CHECK ("nature" IN ('D','C'))
);
CREATE INDEX IF NOT EXISTS "Account_tenantId_parentId_idx" ON "public"."Account" ("tenantId", "parentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Account_tenantId_code_key" ON "public"."Account" ("tenantId", "code");
ALTER TABLE "public"."Account" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."CostCenter" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "active" bool DEFAULT true NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "CostCenter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CostCenter_tenantId_code_key" ON "public"."CostCenter" ("tenantId", "code");
ALTER TABLE "public"."CostCenter" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."AccountingPeriod" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "year" int4 NOT NULL,
  "month" int4 NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "closedAt" timestamptz,
  "closedById" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "AccountingPeriod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "AccountingPeriod_check_1" CHECK ("month" BETWEEN 1 AND 12),
  CONSTRAINT "AccountingPeriod_check_2" CHECK ("status" IN ('OPEN','CLOSED'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "AccountingPeriod_tenantId_year_month_key" ON "public"."AccountingPeriod" ("tenantId", "year", "month");
ALTER TABLE "public"."AccountingPeriod" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."PostingRule" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "eventType" text NOT NULL,
  "name" text NOT NULL,
  "active" bool DEFAULT true NOT NULL,
  "lines" jsonb NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "PostingRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PostingRule_tenantId_eventType_key" ON "public"."PostingRule" ("tenantId", "eventType");
ALTER TABLE "public"."PostingRule" ENABLE ROW LEVEL SECURITY;

-- PostingRule.lines: [{ side: 'D'|'C', account: '<código>', amount: 'total'|'subtotal'|'tax'|'cost'|..., party: true|false }]. Reglas iniciales para sale.completed, payment.confirmed, purchase.received, cash.expense_recorded, sale.voided.

COMMIT;
