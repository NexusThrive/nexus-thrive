-- ============================================================================
-- 2026-10-24 · Tienda en línea: pedidos
--
-- Equivale a la migración migrations/app/20261024T1328_tienda_en_linea.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."StoreOrder" (
  "abandonedNotifiedAt" timestamptz,
  "address" text,
  "city" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "customerName" text NOT NULL,
  "documentId" text,
  "email" text,
  "id" text NOT NULL,
  "intentId" text,
  "notes" text,
  "number" int4 NOT NULL,
  "paidAt" timestamptz,
  "phone" text NOT NULL,
  "review" text,
  "status" text DEFAULT 'PENDING_PAYMENT' NOT NULL,
  "tenantId" text NOT NULL,
  "total" numeric NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."StoreOrderLine" (
  "id" text NOT NULL,
  "name" text NOT NULL,
  "orderId" text NOT NULL,
  "productId" text NOT NULL,
  "quantity" int4 NOT NULL,
  "taxRatePct" numeric DEFAULT '0'::numeric NOT NULL,
  "tenantId" text NOT NULL,
  "unitPrice" numeric NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."StoreOrder" ADD CONSTRAINT "StoreOrder_tenantId_number_key" UNIQUE ("tenantId", "number");

CREATE INDEX "StoreOrder_tenantId_idx_c93ed4f1" ON "public"."StoreOrder" ("tenantId");

CREATE INDEX "StoreOrder_tenantId_status_idx_d3d04256" ON "public"."StoreOrder" ("tenantId", "status");

CREATE INDEX "StoreOrderLine_orderId_idx_d284871b" ON "public"."StoreOrderLine" ("orderId");

CREATE INDEX "StoreOrderLine_tenantId_idx_c93ed4f1" ON "public"."StoreOrderLine" ("tenantId");

ALTER TABLE "public"."StoreOrder"
ADD CONSTRAINT "StoreOrder_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."StoreOrderLine"
ADD CONSTRAINT "StoreOrderLine_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."StoreOrderLine"
ADD CONSTRAINT "StoreOrderLine_orderId_fkey"
FOREIGN KEY ("orderId")
REFERENCES "public"."StoreOrder" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."StoreOrder" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."StoreOrderLine" ENABLE ROW LEVEL SECURITY;

COMMIT;
