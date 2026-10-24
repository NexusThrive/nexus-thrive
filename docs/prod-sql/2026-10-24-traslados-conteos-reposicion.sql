-- ============================================================================
-- 2026-10-24 · Traslados, conteos físicos y niveles de reposición (PR-11b)
--
-- Equivale a la migración migrations/app/20261024T0517_traslados_conteos_reposicion.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."StockCount" (
  "completedAt" timestamptz,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "id" text NOT NULL,
  "note" text,
  "number" int4 NOT NULL,
  "status" text DEFAULT 'DRAFT' NOT NULL,
  "tenantId" text NOT NULL,
  "warehouseId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."StockCountLine" (
  "adjustment" int4,
  "countId" text NOT NULL,
  "counted" int4,
  "expected" int4 NOT NULL,
  "id" text NOT NULL,
  "productId" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."StockTransfer" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "fromWarehouseId" text NOT NULL,
  "id" text NOT NULL,
  "note" text,
  "number" int4 NOT NULL,
  "tenantId" text NOT NULL,
  "toWarehouseId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."StockTransferLine" (
  "id" text NOT NULL,
  "productId" text NOT NULL,
  "quantity" int4 NOT NULL,
  "tenantId" text NOT NULL,
  "transferId" text NOT NULL,
  "unitCost" numeric NOT NULL,
  "variantId" text,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."Product" ADD COLUMN "maxStock" int4;

ALTER TABLE "public"."Product" ADD COLUMN "reorderPoint" int4;

ALTER TABLE "public"."StockCount" ADD CONSTRAINT "StockCount_tenantId_number_key" UNIQUE ("tenantId", "number");

ALTER TABLE "public"."StockTransfer" ADD CONSTRAINT "StockTransfer_tenantId_number_key" UNIQUE ("tenantId", "number");

CREATE INDEX "StockCount_tenantId_idx_c93ed4f1" ON "public"."StockCount" ("tenantId");

CREATE INDEX "StockCount_tenantId_status_idx_d3d04256" ON "public"."StockCount" ("tenantId", "status");

CREATE INDEX "StockCount_warehouseId_idx_8ff93e70" ON "public"."StockCount" ("warehouseId");

CREATE INDEX "StockCountLine_countId_idx_825076b6" ON "public"."StockCountLine" ("countId");

CREATE INDEX "StockCountLine_productId_idx_5858600a" ON "public"."StockCountLine" ("productId");

CREATE INDEX "StockCountLine_tenantId_idx_c93ed4f1" ON "public"."StockCountLine" ("tenantId");

CREATE INDEX "StockTransfer_fromWarehouseId_idx_4006b0b1" ON "public"."StockTransfer" ("fromWarehouseId");

CREATE INDEX "StockTransfer_tenantId_createdAt_idx_88162366" ON "public"."StockTransfer" ("tenantId", "createdAt");

CREATE INDEX "StockTransfer_tenantId_idx_c93ed4f1" ON "public"."StockTransfer" ("tenantId");

CREATE INDEX "StockTransfer_toWarehouseId_idx_f640a978" ON "public"."StockTransfer" ("toWarehouseId");

CREATE INDEX "StockTransferLine_productId_idx_5858600a" ON "public"."StockTransferLine" ("productId");

CREATE INDEX "StockTransferLine_tenantId_idx_c93ed4f1" ON "public"."StockTransferLine" ("tenantId");

CREATE INDEX "StockTransferLine_transferId_idx_2ecab561" ON "public"."StockTransferLine" ("transferId");

ALTER TABLE "public"."StockCount"
ADD CONSTRAINT "StockCount_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."StockCount"
ADD CONSTRAINT "StockCount_warehouseId_fkey"
FOREIGN KEY ("warehouseId")
REFERENCES "public"."Warehouse" ("id")
ON DELETE RESTRICT;

ALTER TABLE "public"."StockCountLine"
ADD CONSTRAINT "StockCountLine_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."StockCountLine"
ADD CONSTRAINT "StockCountLine_countId_fkey"
FOREIGN KEY ("countId")
REFERENCES "public"."StockCount" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."StockCountLine"
ADD CONSTRAINT "StockCountLine_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "public"."Product" ("id")
ON DELETE RESTRICT;

ALTER TABLE "public"."StockTransfer"
ADD CONSTRAINT "StockTransfer_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."StockTransfer"
ADD CONSTRAINT "StockTransfer_fromWarehouseId_fkey"
FOREIGN KEY ("fromWarehouseId")
REFERENCES "public"."Warehouse" ("id")
ON DELETE RESTRICT;

ALTER TABLE "public"."StockTransfer"
ADD CONSTRAINT "StockTransfer_toWarehouseId_fkey"
FOREIGN KEY ("toWarehouseId")
REFERENCES "public"."Warehouse" ("id")
ON DELETE RESTRICT;

ALTER TABLE "public"."StockTransferLine"
ADD CONSTRAINT "StockTransferLine_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."StockTransferLine"
ADD CONSTRAINT "StockTransferLine_transferId_fkey"
FOREIGN KEY ("transferId")
REFERENCES "public"."StockTransfer" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."StockTransferLine"
ADD CONSTRAINT "StockTransferLine_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "public"."Product" ("id")
ON DELETE RESTRICT;

ALTER TABLE "public"."StockCount" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."StockCountLine" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."StockTransfer" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."StockTransferLine" ENABLE ROW LEVEL SECURITY;

COMMIT;
