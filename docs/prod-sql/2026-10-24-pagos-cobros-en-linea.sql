-- ============================================================================
-- 2026-10-24 · Cobros en línea: intenciones, reembolsos y conciliación
--
-- Equivale a la migración migrations/app/20261024T1210_pagos_cobros_en_linea.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."PaymentIntent" (
  "amount" numeric NOT NULL,
  "channel" text DEFAULT 'LINK' NOT NULL,
  "confirmedBy" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "customerId" text,
  "description" text NOT NULL,
  "evidence" text,
  "expiresAt" timestamptz NOT NULL,
  "id" text NOT NULL,
  "invoiceId" text,
  "paidAt" timestamptz,
  "paymentId" text,
  "provider" text DEFAULT 'sandbox' NOT NULL,
  "providerRefId" text,
  "reference" text NOT NULL,
  "refundedTotal" numeric DEFAULT '0'::numeric NOT NULL,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."PaymentRefund" (
  "amount" numeric NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "id" text NOT NULL,
  "intentId" text NOT NULL,
  "reason" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."ReconciliationRun" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "day" text NOT NULL,
  "differences" json NOT NULL,
  "expected" numeric NOT NULL,
  "id" text NOT NULL,
  "matched" int4 NOT NULL,
  "provider" text NOT NULL,
  "reported" numeric NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."PaymentIntent" ADD CONSTRAINT "PaymentIntent_reference_key" UNIQUE ("reference");

CREATE INDEX "PaymentIntent_tenantId_createdAt_idx_88162366" ON "public"."PaymentIntent" ("tenantId", "createdAt");

CREATE INDEX "PaymentIntent_tenantId_idx_c93ed4f1" ON "public"."PaymentIntent" ("tenantId");

CREATE INDEX "PaymentIntent_tenantId_status_idx_d3d04256" ON "public"."PaymentIntent" ("tenantId", "status");

CREATE INDEX "PaymentRefund_intentId_idx_e8967b69" ON "public"."PaymentRefund" ("intentId");

CREATE INDEX "PaymentRefund_tenantId_idx_c93ed4f1" ON "public"."PaymentRefund" ("tenantId");

CREATE INDEX "PaymentRefund_tenantId_intentId_idx_78c4c2b6" ON "public"."PaymentRefund" ("tenantId", "intentId");

CREATE INDEX "ReconciliationRun_tenantId_day_idx_4f30fc67" ON "public"."ReconciliationRun" ("tenantId", "day");

CREATE INDEX "ReconciliationRun_tenantId_idx_c93ed4f1" ON "public"."ReconciliationRun" ("tenantId");

ALTER TABLE "public"."PaymentIntent"
ADD CONSTRAINT "PaymentIntent_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."PaymentRefund"
ADD CONSTRAINT "PaymentRefund_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."PaymentRefund"
ADD CONSTRAINT "PaymentRefund_intentId_fkey"
FOREIGN KEY ("intentId")
REFERENCES "public"."PaymentIntent" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."ReconciliationRun"
ADD CONSTRAINT "ReconciliationRun_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."PaymentIntent" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."PaymentRefund" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."ReconciliationRun" ENABLE ROW LEVEL SECURITY;

COMMIT;
