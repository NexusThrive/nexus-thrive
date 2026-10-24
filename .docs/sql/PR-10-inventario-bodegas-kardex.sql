-- ============================================================================
-- PR-10-inventario-bodegas-kardex · Inventario completo I: bodegas, existencias y kardex con costo
-- PR-10 de .docs/hoja-de-ruta-implementacion.md
--
-- BORRADOR DE DISEÑO PARA REVISAR, no para correr. La migración real sale de
-- editar prisma/contract.prisma y ejecutar `prisma migration plan` (ver la
-- hoja de ruta, «Cómo se migra»). Este archivo fija las tablas, las columnas, las
-- llaves y los índices que esa edición debe producir. Aditivo e idempotente.
--
-- Bodegas, existencias por bodega y variante, y el kardex: cada movimiento lleva el
-- costo unitario y el saldo posterior (costo promedio ponderado). Product.stock pasa a
-- ser un valor derivado (se conserva por compatibilidad).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."Warehouse" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "name" text NOT NULL,
  "code" text,
  "address" text,
  "isDefault" bool DEFAULT false NOT NULL,
  "active" bool DEFAULT true NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "Warehouse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Warehouse_tenantId_idx" ON "public"."Warehouse" ("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "Warehouse_tenantId_name_key" ON "public"."Warehouse" ("tenantId", "name");
ALTER TABLE "public"."Warehouse" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."StockLevel" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "warehouseId" text NOT NULL,
  "productId" text NOT NULL,
  "variantId" text,
  "quantity" numeric DEFAULT 0 NOT NULL,
  "reserved" numeric DEFAULT 0 NOT NULL,
  "avgCost" numeric DEFAULT 0 NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "StockLevel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "StockLevel_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse" ("id") ON DELETE CASCADE,
  CONSTRAINT "StockLevel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product" ("id") ON DELETE CASCADE,
  CONSTRAINT "StockLevel_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."ProductVariant" ("id") ON DELETE CASCADE,
  CONSTRAINT "StockLevel_check_1" CHECK ("reserved" >= 0)
);
CREATE INDEX IF NOT EXISTS "StockLevel_tenantId_productId_idx" ON "public"."StockLevel" ("tenantId", "productId");
CREATE UNIQUE INDEX IF NOT EXISTS "StockLevel_level_key" ON "public"."StockLevel" ("warehouseId", "productId", COALESCE("variantId", ''));
ALTER TABLE "public"."StockLevel" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."StockMovement" ADD COLUMN IF NOT EXISTS "warehouseId" text;
ALTER TABLE "public"."StockMovement" ADD COLUMN IF NOT EXISTS "variantId" text;
ALTER TABLE "public"."StockMovement" ADD COLUMN IF NOT EXISTS "unitCost" numeric;
ALTER TABLE "public"."StockMovement" ADD COLUMN IF NOT EXISTS "balanceAfter" numeric;
ALTER TABLE "public"."StockMovement" ADD COLUMN IF NOT EXISTS "documentType" text;
ALTER TABLE "public"."StockMovement" ADD COLUMN IF NOT EXISTS "documentId" text;
ALTER TABLE "public"."StockMovement" ADD COLUMN IF NOT EXISTS "reason" text;
CREATE INDEX IF NOT EXISTS "StockMovement_warehouseId_idx" ON "public"."StockMovement" ("warehouseId");
CREATE INDEX IF NOT EXISTS "StockMovement_document_idx" ON "public"."StockMovement" ("documentType", "documentId");

-- Relleno: una bodega «Principal» por negocio (isDefault) y un StockLevel por producto con trackStock = Product.stock. El saldo de cada movimiento se calcula en el servicio de inventario dentro de la misma transacción (bloqueo de fila del StockLevel).

COMMIT;
