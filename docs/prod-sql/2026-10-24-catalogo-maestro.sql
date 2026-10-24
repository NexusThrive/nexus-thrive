-- ============================================================================
-- 2026-10-24 · Catálogo maestro: variantes, códigos de barras, listas de precios y clasificación fiscal (PR-09)
--
-- Equivale a la migración migrations/app/20261024T0305_catalogo_maestro.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."PriceList" (
  "active" bool DEFAULT true NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "currency" text DEFAULT 'COP' NOT NULL,
  "id" text NOT NULL,
  "isDefault" bool DEFAULT false NOT NULL,
  "name" text NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."PriceListItem" (
  "id" text NOT NULL,
  "price" numeric NOT NULL,
  "priceListId" text NOT NULL,
  "productId" text NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "variantId" text,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."ProductBarcode" (
  "code" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "productId" text NOT NULL,
  "symbology" text DEFAULT 'EAN13' NOT NULL,
  "tenantId" text NOT NULL,
  "variantId" text,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."ProductVariant" (
  "active" bool DEFAULT true NOT NULL,
  "attributes" json,
  "cost" numeric,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "price" numeric,
  "productId" text NOT NULL,
  "sku" text,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."Product" ADD COLUMN "brand" text;

ALTER TABLE "public"."Product" ADD COLUMN "imageUrl" text;

ALTER TABLE "public"."Product" ADD COLUMN "publishedOnline" bool DEFAULT false NOT NULL;

ALTER TABLE "public"."Product" ADD COLUMN "taxCategory" text DEFAULT 'GRAVADO' NOT NULL;

ALTER TABLE "public"."Product" ADD COLUMN "taxRatePct" numeric DEFAULT '0'::numeric NOT NULL;

ALTER TABLE "public"."Product" ADD COLUMN "unitCode" text DEFAULT 'EA' NOT NULL;

ALTER TABLE "public"."PriceList" ADD CONSTRAINT "PriceList_tenantId_name_key" UNIQUE ("tenantId", "name");

ALTER TABLE "public"."ProductBarcode" ADD CONSTRAINT "ProductBarcode_tenantId_code_key" UNIQUE ("tenantId", "code");

CREATE INDEX "PriceList_tenantId_idx_c93ed4f1" ON "public"."PriceList" ("tenantId");

CREATE INDEX "PriceListItem_priceListId_idx_43057e0f" ON "public"."PriceListItem" ("priceListId");

CREATE INDEX "PriceListItem_productId_idx_5858600a" ON "public"."PriceListItem" ("productId");

CREATE UNIQUE INDEX "PriceListItem_product_key_9ae0454b" ON "public"."PriceListItem" ("priceListId", "productId") WHERE ("variantId" IS NULL);

CREATE INDEX "PriceListItem_tenantId_idx_c93ed4f1" ON "public"."PriceListItem" ("tenantId");

CREATE INDEX "PriceListItem_variantId_idx_e16bb45d" ON "public"."PriceListItem" ("variantId");

CREATE UNIQUE INDEX "PriceListItem_variant_key_100c36cc" ON "public"."PriceListItem" ("priceListId", "productId", "variantId") WHERE ("variantId" IS NOT NULL);

CREATE INDEX "ProductBarcode_productId_idx_5858600a" ON "public"."ProductBarcode" ("productId");

CREATE INDEX "ProductBarcode_tenantId_idx_c93ed4f1" ON "public"."ProductBarcode" ("tenantId");

CREATE INDEX "ProductBarcode_variantId_idx_e16bb45d" ON "public"."ProductBarcode" ("variantId");

CREATE INDEX "ProductVariant_productId_idx_5858600a" ON "public"."ProductVariant" ("productId");

CREATE INDEX "ProductVariant_tenantId_idx_c93ed4f1" ON "public"."ProductVariant" ("tenantId");

CREATE INDEX "ProductVariant_tenantId_productId_idx_b55a019b" ON "public"."ProductVariant" ("tenantId", "productId");

CREATE UNIQUE INDEX "ProductVariant_tenantId_sku_key_dd4acb28" ON "public"."ProductVariant" ("tenantId", "sku") WHERE ("sku" IS NOT NULL);

ALTER TABLE "public"."PriceList"
ADD CONSTRAINT "PriceList_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."PriceListItem"
ADD CONSTRAINT "PriceListItem_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."PriceListItem"
ADD CONSTRAINT "PriceListItem_priceListId_fkey"
FOREIGN KEY ("priceListId")
REFERENCES "public"."PriceList" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."PriceListItem"
ADD CONSTRAINT "PriceListItem_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "public"."Product" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."PriceListItem"
ADD CONSTRAINT "PriceListItem_variantId_fkey"
FOREIGN KEY ("variantId")
REFERENCES "public"."ProductVariant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."ProductBarcode"
ADD CONSTRAINT "ProductBarcode_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."ProductBarcode"
ADD CONSTRAINT "ProductBarcode_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "public"."Product" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."ProductBarcode"
ADD CONSTRAINT "ProductBarcode_variantId_fkey"
FOREIGN KEY ("variantId")
REFERENCES "public"."ProductVariant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."ProductVariant"
ADD CONSTRAINT "ProductVariant_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."ProductVariant"
ADD CONSTRAINT "ProductVariant_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "public"."Product" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."PriceList" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."PriceListItem" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."ProductBarcode" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."ProductVariant" ENABLE ROW LEVEL SECURITY;

COMMIT;
