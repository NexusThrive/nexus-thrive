-- ============================================================================
-- PR-13-impuestos-y-numeracion · Impuestos colombianos y numeración por resolución
-- PR-13 de .docs/hoja-de-ruta-implementacion.md
--
-- BORRADOR DE DISEÑO PARA REVISAR, no para correr. La migración real sale de
-- editar prisma/contract.prisma y ejecutar `prisma migration plan` (ver la
-- hoja de ruta, «Cómo se migra»). Este archivo fija las tablas, las columnas, las
-- llaves y los índices que esa edición debe producir. Aditivo e idempotente.
--
-- Tarifas de impuestos y retenciones por negocio (con su código DIAN) y la numeración
-- por tipo, prefijo y RESOLUCIÓN (rango, vigencia, ambiente). Estado fiscal en el
-- documento comercial. Es la base del puerto de facturación electrónica.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."TaxRate" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "kind" text NOT NULL,
  "ratePct" numeric NOT NULL,
  "dianCode" text,
  "active" bool DEFAULT true NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "TaxRate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "TaxRate_check_1" CHECK ("kind" IN ('SALES','WITHHOLDING','CONSUMPTION'))
);
CREATE INDEX IF NOT EXISTS "TaxRate_tenantId_kind_idx" ON "public"."TaxRate" ("tenantId", "kind");
CREATE UNIQUE INDEX IF NOT EXISTS "TaxRate_tenantId_code_key" ON "public"."TaxRate" ("tenantId", "code");
ALTER TABLE "public"."TaxRate" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."DocumentSequence" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "docKind" text NOT NULL,
  "prefix" text DEFAULT '' NOT NULL,
  "nextNumber" int4 DEFAULT 1 NOT NULL,
  "resolutionNumber" text,
  "resolutionDate" date,
  "validFrom" date,
  "validTo" date,
  "rangeFrom" int4,
  "rangeTo" int4,
  "technicalKey" text,
  "environment" text DEFAULT 'sandbox' NOT NULL,
  "active" bool DEFAULT true NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "DocumentSequence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "DocumentSequence_check_1" CHECK ("environment" IN ('sandbox','production')),
  CONSTRAINT "DocumentSequence_check_2" CHECK ("rangeTo" IS NULL OR "rangeFrom" IS NULL OR "rangeTo" >= "rangeFrom")
);
CREATE INDEX IF NOT EXISTS "DocumentSequence_tenantId_docKind_idx" ON "public"."DocumentSequence" ("tenantId", "docKind");
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentSequence_tenantId_docKind_prefix_environment_key" ON "public"."DocumentSequence" ("tenantId", "docKind", "prefix", "environment");
ALTER TABLE "public"."DocumentSequence" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."Invoice" ADD COLUMN IF NOT EXISTS "fiscalStatus" text DEFAULT 'NONE' NOT NULL;
ALTER TABLE "public"."Invoice" ADD COLUMN IF NOT EXISTS "fiscalPrefix" text;
ALTER TABLE "public"."Invoice" ADD COLUMN IF NOT EXISTS "sequenceId" text;
ALTER TABLE "public"."Invoice" ADD COLUMN IF NOT EXISTS "withholdingTotal" numeric DEFAULT 0 NOT NULL;
ALTER TABLE "public"."InvoiceLine" ADD COLUMN IF NOT EXISTS "taxCode" text;
ALTER TABLE "public"."InvoiceLine" ADD COLUMN IF NOT EXISTS "unitCode" text;
CREATE INDEX IF NOT EXISTS "Invoice_fiscalStatus_idx" ON "public"."Invoice" ("tenantId", "fiscalStatus");

-- fiscalStatus: NONE | PENDING_PROVIDER | SUBMITTED | ACCEPTED | REJECTED | ERROR. Plantilla de tarifas por negocio: IVA 19 %, IVA 5 %, excluido, exento, impoconsumo 8 %, retefuente, reteIVA, reteICA. Validar tarifas y códigos vigentes con la DIAN antes de sembrar.

COMMIT;
