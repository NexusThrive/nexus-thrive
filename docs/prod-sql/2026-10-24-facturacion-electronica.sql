-- ============================================================================
-- 2026-10-24 · Facturación electrónica: documento fiscal y marca por negocio
--
-- Equivale a la migración migrations/app/20261024T1218_facturacion_electronica.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."FiscalDocument" (
  "attempts" int4 DEFAULT 0 NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "cufe" text,
  "id" text NOT NULL,
  "invoiceId" text,
  "kind" text NOT NULL,
  "lastAttemptAt" timestamptz,
  "payload" json NOT NULL,
  "provider" text,
  "providerRef" text,
  "rejectReason" text,
  "status" text DEFAULT 'PENDING_PROVIDER' NOT NULL,
  "supplierInvoiceId" text,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."Tenant" ADD COLUMN "einvoiceEnabled" bool DEFAULT false NOT NULL;

ALTER TABLE "public"."FiscalDocument" ADD CONSTRAINT "FiscalDocument_tenantId_invoiceId_key" UNIQUE ("tenantId", "invoiceId");

ALTER TABLE "public"."FiscalDocument" ADD CONSTRAINT "FiscalDocument_tenantId_supplierInvoiceId_key" UNIQUE ("tenantId", "supplierInvoiceId");

CREATE INDEX "FiscalDocument_tenantId_idx_c93ed4f1" ON "public"."FiscalDocument" ("tenantId");

CREATE INDEX "FiscalDocument_tenantId_status_idx_d3d04256" ON "public"."FiscalDocument" ("tenantId", "status");

ALTER TABLE "public"."FiscalDocument"
ADD CONSTRAINT "FiscalDocument_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."FiscalDocument" ENABLE ROW LEVEL SECURITY;

COMMIT;
