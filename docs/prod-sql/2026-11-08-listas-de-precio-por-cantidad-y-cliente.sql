-- ============================================================================
-- Listas de precio por cantidad y por cliente
--
-- Aditivo e idempotente. Migración de origen: migrations/app/20261108T2214_listas_de_precio_por_cantidad_y_cliente
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."PriceTier" (
  "id" text NOT NULL,
  "minQty" int4 NOT NULL,
  "price" numeric NOT NULL,
  "priceListId" text NOT NULL,
  "productId" text NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."Customer" ADD COLUMN IF NOT EXISTS "priceListId" text;
ALTER TABLE "public"."CustomerGroup" ADD COLUMN IF NOT EXISTS "priceListId" text;
CREATE INDEX IF NOT EXISTS "PriceTier_priceListId_idx_43057e0f" ON "public"."PriceTier" ("priceListId");
CREATE INDEX IF NOT EXISTS "PriceTier_productId_idx_5858600a" ON "public"."PriceTier" ("productId");
CREATE INDEX IF NOT EXISTS "PriceTier_tenantId_idx_c93ed4f1" ON "public"."PriceTier" ("tenantId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PriceTier_priceListId_productId_minQty_key') THEN
    ALTER TABLE "public"."PriceTier" ADD CONSTRAINT "PriceTier_priceListId_productId_minQty_key" UNIQUE ("priceListId", "productId", "minQty");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PriceTier_tenantId_fkey') THEN
    ALTER TABLE "public"."PriceTier" ADD CONSTRAINT "PriceTier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PriceTier_priceListId_fkey') THEN
    ALTER TABLE "public"."PriceTier" ADD CONSTRAINT "PriceTier_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "public"."PriceList" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PriceTier_productId_fkey') THEN
    ALTER TABLE "public"."PriceTier" ADD CONSTRAINT "PriceTier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product" ("id") ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "public"."PriceTier" ENABLE ROW LEVEL SECURITY;

COMMIT;
