-- ============================================================================
-- PR-11-traslados-conteos-compras · Inventario completo II: traslados, conteos físicos y compras
-- PR-11 de .docs/hoja-de-ruta-implementacion.md
--
-- BORRADOR DE DISEÑO PARA REVISAR, no para correr. La migración real sale de
-- editar prisma/contract.prisma y ejecutar `prisma migration plan` (ver la
-- hoja de ruta, «Cómo se migra»). Este archivo fija las tablas, las columnas, las
-- llaves y los índices que esa edición debe producir. Aditivo e idempotente.
--
-- Traslados entre bodegas, conteos físicos con ajuste, y órdenes de compra a
-- proveedores (el proveedor es un Party con rol SUPPLIER) con recepción parcial.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."StockTransfer" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "number" int4 NOT NULL,
  "fromWarehouseId" text NOT NULL,
  "toWarehouseId" text NOT NULL,
  "status" text DEFAULT 'DRAFT' NOT NULL,
  "note" text,
  "createdById" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "completedAt" timestamptz,
  PRIMARY KEY ("id"),
  CONSTRAINT "StockTransfer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "StockTransfer_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "public"."Warehouse" ("id") ON DELETE RESTRICT,
  CONSTRAINT "StockTransfer_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "public"."Warehouse" ("id") ON DELETE RESTRICT,
  CONSTRAINT "StockTransfer_check_1" CHECK ("fromWarehouseId" <> "toWarehouseId"),
  CONSTRAINT "StockTransfer_check_2" CHECK ("status" IN ('DRAFT','COMPLETED','CANCELED'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "StockTransfer_tenantId_number_key" ON "public"."StockTransfer" ("tenantId", "number");
ALTER TABLE "public"."StockTransfer" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."StockTransferLine" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "transferId" text NOT NULL,
  "productId" text NOT NULL,
  "variantId" text,
  "quantity" numeric NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "StockTransferLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "StockTransferLine_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "public"."StockTransfer" ("id") ON DELETE CASCADE,
  CONSTRAINT "StockTransferLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product" ("id") ON DELETE RESTRICT,
  CONSTRAINT "StockTransferLine_check_1" CHECK ("quantity" > 0)
);
CREATE INDEX IF NOT EXISTS "StockTransferLine_transferId_idx" ON "public"."StockTransferLine" ("transferId");
ALTER TABLE "public"."StockTransferLine" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."StockCount" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "warehouseId" text NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "note" text,
  "createdById" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "closedAt" timestamptz,
  PRIMARY KEY ("id"),
  CONSTRAINT "StockCount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "StockCount_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse" ("id") ON DELETE RESTRICT,
  CONSTRAINT "StockCount_check_1" CHECK ("status" IN ('OPEN','CLOSED'))
);
CREATE INDEX IF NOT EXISTS "StockCount_tenantId_status_idx" ON "public"."StockCount" ("tenantId", "status");
ALTER TABLE "public"."StockCount" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."StockCountLine" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "countId" text NOT NULL,
  "productId" text NOT NULL,
  "variantId" text,
  "expected" numeric NOT NULL,
  "counted" numeric,
  "adjustmentMovementId" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "StockCountLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "StockCountLine_countId_fkey" FOREIGN KEY ("countId") REFERENCES "public"."StockCount" ("id") ON DELETE CASCADE,
  CONSTRAINT "StockCountLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product" ("id") ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS "StockCountLine_countId_idx" ON "public"."StockCountLine" ("countId");
ALTER TABLE "public"."StockCountLine" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."PurchaseOrder" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "number" int4 NOT NULL,
  "supplierPartyId" text NOT NULL,
  "warehouseId" text NOT NULL,
  "status" text DEFAULT 'DRAFT' NOT NULL,
  "expectedDate" date,
  "subtotal" numeric DEFAULT 0 NOT NULL,
  "taxTotal" numeric DEFAULT 0 NOT NULL,
  "total" numeric DEFAULT 0 NOT NULL,
  "note" text,
  "createdById" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "PurchaseOrder_supplierPartyId_fkey" FOREIGN KEY ("supplierPartyId") REFERENCES "public"."Party" ("id") ON DELETE RESTRICT,
  CONSTRAINT "PurchaseOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse" ("id") ON DELETE RESTRICT,
  CONSTRAINT "PurchaseOrder_check_1" CHECK ("status" IN ('DRAFT','SENT','PARTIAL','RECEIVED','CANCELED'))
);
CREATE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_status_idx" ON "public"."PurchaseOrder" ("tenantId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_number_key" ON "public"."PurchaseOrder" ("tenantId", "number");
ALTER TABLE "public"."PurchaseOrder" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."PurchaseOrderLine" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "orderId" text NOT NULL,
  "productId" text NOT NULL,
  "variantId" text,
  "quantity" numeric NOT NULL,
  "receivedQuantity" numeric DEFAULT 0 NOT NULL,
  "unitCost" numeric NOT NULL,
  "taxRatePct" numeric DEFAULT 0 NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseOrderLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "PurchaseOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."PurchaseOrder" ("id") ON DELETE CASCADE,
  CONSTRAINT "PurchaseOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product" ("id") ON DELETE RESTRICT,
  CONSTRAINT "PurchaseOrderLine_check_1" CHECK ("quantity" > 0),
  CONSTRAINT "PurchaseOrderLine_check_2" CHECK ("receivedQuantity" >= 0)
);
CREATE INDEX IF NOT EXISTS "PurchaseOrderLine_orderId_idx" ON "public"."PurchaseOrderLine" ("orderId");
ALTER TABLE "public"."PurchaseOrderLine" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."SupplierInvoice" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "supplierPartyId" text NOT NULL,
  "purchaseOrderId" text,
  "number" text NOT NULL,
  "issueDate" date NOT NULL,
  "dueDate" date,
  "subtotal" numeric NOT NULL,
  "taxTotal" numeric DEFAULT 0 NOT NULL,
  "total" numeric NOT NULL,
  "status" text DEFAULT 'REGISTERED' NOT NULL,
  "cufe" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "SupplierInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "SupplierInvoice_supplierPartyId_fkey" FOREIGN KEY ("supplierPartyId") REFERENCES "public"."Party" ("id") ON DELETE RESTRICT,
  CONSTRAINT "SupplierInvoice_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."PurchaseOrder" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "SupplierInvoice_tenantId_dueDate_idx" ON "public"."SupplierInvoice" ("tenantId", "dueDate");
CREATE UNIQUE INDEX IF NOT EXISTS "SupplierInvoice_tenantId_supplierPartyId_number_key" ON "public"."SupplierInvoice" ("tenantId", "supplierPartyId", "number");
ALTER TABLE "public"."SupplierInvoice" ENABLE ROW LEVEL SECURITY;

-- Los movimientos de inventario que producen traslados, conteos y recepciones usan el mismo servicio de PR-10 (un solo camino para tocar el stock).

COMMIT;
