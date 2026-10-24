-- ============================================================================
-- 2026-10-24 · Cartera: saldo de cuentas por cobrar y pagos a proveedores
--
-- Equivale a la migración migrations/app/20261024T1102_cartera.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."SupplierPayment" (
  "amount" numeric NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "id" text NOT NULL,
  "method" text NOT NULL,
  "note" text,
  "supplierInvoiceId" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."Invoice" ADD COLUMN "paidTotal" numeric DEFAULT '0'::numeric NOT NULL;

ALTER TABLE "public"."SupplierInvoice" ADD COLUMN "paidTotal" numeric DEFAULT '0'::numeric NOT NULL;

CREATE INDEX "SupplierPayment_supplierInvoiceId_idx_7f6ba885" ON "public"."SupplierPayment" ("supplierInvoiceId");

CREATE INDEX "SupplierPayment_tenantId_idx_c93ed4f1" ON "public"."SupplierPayment" ("tenantId");

CREATE INDEX "SupplierPayment_tenantId_supplierInvoiceId_idx_ed90e67e" ON "public"."SupplierPayment" ("tenantId", "supplierInvoiceId");

ALTER TABLE "public"."SupplierPayment"
ADD CONSTRAINT "SupplierPayment_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."SupplierPayment"
ADD CONSTRAINT "SupplierPayment_supplierInvoiceId_fkey"
FOREIGN KEY ("supplierInvoiceId")
REFERENCES "public"."SupplierInvoice" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."SupplierPayment" ENABLE ROW LEVEL SECURITY;

COMMIT;
