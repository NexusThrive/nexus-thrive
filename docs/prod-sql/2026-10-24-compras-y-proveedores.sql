-- ============================================================================
-- 2026-10-24 · Compras: órdenes, líneas y facturas de proveedor (PR-11a)
--
-- Equivale a la migración migrations/app/20261024T0345_compras_y_proveedores.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."PurchaseOrder" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "expectedDate" text,
  "id" text NOT NULL,
  "note" text,
  "number" int4 NOT NULL,
  "status" text DEFAULT 'DRAFT' NOT NULL,
  "subtotal" numeric DEFAULT '0'::numeric NOT NULL,
  "supplierPartyId" text NOT NULL,
  "taxTotal" numeric DEFAULT '0'::numeric NOT NULL,
  "tenantId" text NOT NULL,
  "total" numeric DEFAULT '0'::numeric NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "warehouseId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."PurchaseOrderLine" (
  "id" text NOT NULL,
  "orderId" text NOT NULL,
  "productId" text NOT NULL,
  "quantity" int4 NOT NULL,
  "receivedQuantity" int4 DEFAULT 0 NOT NULL,
  "taxRatePct" numeric DEFAULT '0'::numeric NOT NULL,
  "tenantId" text NOT NULL,
  "unitCost" numeric NOT NULL,
  "variantId" text,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."SupplierInvoice" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "cufe" text,
  "dueDate" text,
  "id" text NOT NULL,
  "issueDate" text NOT NULL,
  "number" text NOT NULL,
  "purchaseOrderId" text,
  "status" text DEFAULT 'REGISTERED' NOT NULL,
  "subtotal" numeric NOT NULL,
  "supplierPartyId" text NOT NULL,
  "taxTotal" numeric DEFAULT '0'::numeric NOT NULL,
  "tenantId" text NOT NULL,
  "total" numeric NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_tenantId_number_key" UNIQUE ("tenantId", "number");

ALTER TABLE "public"."SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_tenantId_supplierPartyId_number_key" UNIQUE ("tenantId", "supplierPartyId", "number");

CREATE INDEX "PurchaseOrder_supplierPartyId_idx_65784de3" ON "public"."PurchaseOrder" ("supplierPartyId");

CREATE INDEX "PurchaseOrder_tenantId_idx_c93ed4f1" ON "public"."PurchaseOrder" ("tenantId");

CREATE INDEX "PurchaseOrder_tenantId_status_idx_d3d04256" ON "public"."PurchaseOrder" ("tenantId", "status");

CREATE INDEX "PurchaseOrder_warehouseId_idx_8ff93e70" ON "public"."PurchaseOrder" ("warehouseId");

CREATE INDEX "PurchaseOrderLine_orderId_idx_d284871b" ON "public"."PurchaseOrderLine" ("orderId");

CREATE INDEX "PurchaseOrderLine_productId_idx_5858600a" ON "public"."PurchaseOrderLine" ("productId");

CREATE INDEX "PurchaseOrderLine_tenantId_idx_c93ed4f1" ON "public"."PurchaseOrderLine" ("tenantId");

CREATE INDEX "SupplierInvoice_purchaseOrderId_idx_3e3a8c45" ON "public"."SupplierInvoice" ("purchaseOrderId");

CREATE INDEX "SupplierInvoice_supplierPartyId_idx_65784de3" ON "public"."SupplierInvoice" ("supplierPartyId");

CREATE INDEX "SupplierInvoice_tenantId_dueDate_idx_ab958bc0" ON "public"."SupplierInvoice" ("tenantId", "dueDate");

CREATE INDEX "SupplierInvoice_tenantId_idx_c93ed4f1" ON "public"."SupplierInvoice" ("tenantId");

ALTER TABLE "public"."PurchaseOrder"
ADD CONSTRAINT "PurchaseOrder_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."PurchaseOrder"
ADD CONSTRAINT "PurchaseOrder_supplierPartyId_fkey"
FOREIGN KEY ("supplierPartyId")
REFERENCES "public"."Party" ("id")
ON DELETE RESTRICT;

ALTER TABLE "public"."PurchaseOrder"
ADD CONSTRAINT "PurchaseOrder_warehouseId_fkey"
FOREIGN KEY ("warehouseId")
REFERENCES "public"."Warehouse" ("id")
ON DELETE RESTRICT;

ALTER TABLE "public"."PurchaseOrderLine"
ADD CONSTRAINT "PurchaseOrderLine_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."PurchaseOrderLine"
ADD CONSTRAINT "PurchaseOrderLine_orderId_fkey"
FOREIGN KEY ("orderId")
REFERENCES "public"."PurchaseOrder" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."PurchaseOrderLine"
ADD CONSTRAINT "PurchaseOrderLine_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "public"."Product" ("id")
ON DELETE RESTRICT;

ALTER TABLE "public"."SupplierInvoice"
ADD CONSTRAINT "SupplierInvoice_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."SupplierInvoice"
ADD CONSTRAINT "SupplierInvoice_supplierPartyId_fkey"
FOREIGN KEY ("supplierPartyId")
REFERENCES "public"."Party" ("id")
ON DELETE RESTRICT;

ALTER TABLE "public"."SupplierInvoice"
ADD CONSTRAINT "SupplierInvoice_purchaseOrderId_fkey"
FOREIGN KEY ("purchaseOrderId")
REFERENCES "public"."PurchaseOrder" ("id")
ON DELETE SET NULL;

ALTER TABLE "public"."PurchaseOrder" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."PurchaseOrderLine" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."SupplierInvoice" ENABLE ROW LEVEL SECURITY;

COMMIT;
