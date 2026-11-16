-- ============================================================================
-- 2026-10-24 · Inventario: bodegas, existencias por bodega y kardex con costo (PR-10)
--
-- Equivale a la migración migrations/app/20261024T0315_inventario_bodegas_kardex.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."StockLevel" (
  "avgCost" numeric DEFAULT '0'::numeric NOT NULL,
  "id" text NOT NULL,
  "productId" text NOT NULL,
  "quantity" int4 DEFAULT 0 NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "variantId" text,
  "warehouseId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."Warehouse" (
  "active" bool DEFAULT true NOT NULL,
  "address" text,
  "code" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "isDefault" bool DEFAULT false NOT NULL,
  "name" text NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."StockMovement" ADD COLUMN "balanceAfter" int4;

ALTER TABLE "public"."StockMovement" ADD COLUMN "documentId" text;

ALTER TABLE "public"."StockMovement" ADD COLUMN "documentType" text;

ALTER TABLE "public"."StockMovement" ADD COLUMN "reason" text;

ALTER TABLE "public"."StockMovement" ADD COLUMN "unitCost" numeric;

ALTER TABLE "public"."StockMovement" ADD COLUMN "variantId" text;

ALTER TABLE "public"."StockMovement" ADD COLUMN "warehouseId" text;

ALTER TABLE "public"."Tenant" ADD COLUMN "costingMethod" text DEFAULT 'AVG' NOT NULL;

ALTER TABLE "public"."Warehouse" ADD CONSTRAINT "Warehouse_tenantId_name_key" UNIQUE ("tenantId", "name");

CREATE INDEX "StockLevel_productId_idx_5858600a" ON "public"."StockLevel" ("productId");

CREATE UNIQUE INDEX "StockLevel_product_key_d6b3c447" ON "public"."StockLevel" ("warehouseId", "productId") WHERE ("variantId" IS NULL);

CREATE INDEX "StockLevel_tenantId_idx_c93ed4f1" ON "public"."StockLevel" ("tenantId");

CREATE INDEX "StockLevel_tenantId_productId_idx_b55a019b" ON "public"."StockLevel" ("tenantId", "productId");

CREATE INDEX "StockLevel_variantId_idx_e16bb45d" ON "public"."StockLevel" ("variantId");

CREATE UNIQUE INDEX "StockLevel_variant_key_666fadbc" ON "public"."StockLevel" ("warehouseId", "productId", "variantId") WHERE ("variantId" IS NOT NULL);

CREATE INDEX "StockLevel_warehouseId_idx_8ff93e70" ON "public"."StockLevel" ("warehouseId");

CREATE INDEX "StockMovement_documentType_documentId_idx_b8a84a62" ON "public"."StockMovement" ("documentType", "documentId");

CREATE INDEX "StockMovement_warehouseId_idx_8ff93e70" ON "public"."StockMovement" ("warehouseId");

CREATE INDEX "Warehouse_tenantId_idx_c93ed4f1" ON "public"."Warehouse" ("tenantId");

ALTER TABLE "public"."StockLevel"
ADD CONSTRAINT "StockLevel_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."StockLevel"
ADD CONSTRAINT "StockLevel_warehouseId_fkey"
FOREIGN KEY ("warehouseId")
REFERENCES "public"."Warehouse" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."StockLevel"
ADD CONSTRAINT "StockLevel_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "public"."Product" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."StockLevel"
ADD CONSTRAINT "StockLevel_variantId_fkey"
FOREIGN KEY ("variantId")
REFERENCES "public"."ProductVariant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."Warehouse"
ADD CONSTRAINT "Warehouse_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."StockMovement"
ADD CONSTRAINT "StockMovement_warehouseId_fkey"
FOREIGN KEY ("warehouseId")
REFERENCES "public"."Warehouse" ("id")
ON DELETE SET NULL;

ALTER TABLE "public"."StockLevel" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."Warehouse" ENABLE ROW LEVEL SECURITY;

COMMIT;
