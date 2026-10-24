-- ============================================================================
-- PR-09-catalogo-maestro · Catálogo maestro: variantes, códigos de barras, listas de precios e impuestos
-- PR-09 de .docs/hoja-de-ruta-implementacion.md
--
-- BORRADOR DE DISEÑO PARA REVISAR, no para correr. La migración real sale de
-- editar prisma/contract.prisma y ejecutar `prisma migration plan` (ver la
-- hoja de ruta, «Cómo se migra»). Este archivo fija las tablas, las columnas, las
-- llaves y los índices que esa edición debe producir. Aditivo e idempotente.
--
-- Variantes (talla/color), códigos de barras por producto o variante, listas de precios
-- y los datos fiscales del producto que pedirá la factura electrónica.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."ProductVariant" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "productId" text NOT NULL,
  "sku" text,
  "name" text NOT NULL,
  "attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "price" numeric,
  "cost" numeric,
  "active" bool DEFAULT true NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "ProductVariant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProductVariant_tenantId_productId_idx" ON "public"."ProductVariant" ("tenantId", "productId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_sku_key" ON "public"."ProductVariant" ("tenantId", "sku") WHERE "sku" IS NOT NULL;
ALTER TABLE "public"."ProductVariant" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."ProductBarcode" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "productId" text NOT NULL,
  "variantId" text,
  "code" text NOT NULL,
  "symbology" text DEFAULT 'EAN13' NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "ProductBarcode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "ProductBarcode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product" ("id") ON DELETE CASCADE,
  CONSTRAINT "ProductBarcode_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."ProductVariant" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProductBarcode_productId_idx" ON "public"."ProductBarcode" ("productId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductBarcode_tenantId_code_key" ON "public"."ProductBarcode" ("tenantId", "code");
ALTER TABLE "public"."ProductBarcode" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."PriceList" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "name" text NOT NULL,
  "currency" text DEFAULT 'COP' NOT NULL,
  "isDefault" bool DEFAULT false NOT NULL,
  "active" bool DEFAULT true NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "PriceList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "PriceList_tenantId_idx" ON "public"."PriceList" ("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "PriceList_tenantId_name_key" ON "public"."PriceList" ("tenantId", "name");
ALTER TABLE "public"."PriceList" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."PriceListItem" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "priceListId" text NOT NULL,
  "productId" text NOT NULL,
  "variantId" text,
  "price" numeric NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "PriceListItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "PriceListItem_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "public"."PriceList" ("id") ON DELETE CASCADE,
  CONSTRAINT "PriceListItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product" ("id") ON DELETE CASCADE,
  CONSTRAINT "PriceListItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."ProductVariant" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "PriceListItem_productId_idx" ON "public"."PriceListItem" ("productId");
CREATE UNIQUE INDEX IF NOT EXISTS "PriceListItem_item_key" ON "public"."PriceListItem" ("priceListId", "productId", COALESCE("variantId", ''));
ALTER TABLE "public"."PriceListItem" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."Product" ADD COLUMN IF NOT EXISTS "unitCode" text DEFAULT 'EA' NOT NULL;
ALTER TABLE "public"."Product" ADD COLUMN IF NOT EXISTS "taxCategory" text DEFAULT 'GRAVADO' NOT NULL;
ALTER TABLE "public"."Product" ADD COLUMN IF NOT EXISTS "taxRatePct" numeric DEFAULT 0 NOT NULL;
ALTER TABLE "public"."Product" ADD COLUMN IF NOT EXISTS "brand" text;
ALTER TABLE "public"."Product" ADD COLUMN IF NOT EXISTS "imageUrl" text;
ALTER TABLE "public"."Product" ADD COLUMN IF NOT EXISTS "publishedOnline" bool DEFAULT false NOT NULL;

-- unitCode: códigos UN/CEFACT que usa la DIAN (EA = unidad, KGM, LTR, MTR, HUR…). taxCategory: GRAVADO | EXCLUIDO | EXENTO. publishedOnline decide qué sale en el sitio y la tienda.

COMMIT;
