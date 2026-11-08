-- ============================================================================
-- 2026-11-08 · Catálogo: categorías, atributos y canales del producto
--
-- Aditivo e idempotente. Migración de origen: migrations/app/20261108T1713_catalogo_categorias_atributos_y_canales
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."ProductAttribute" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "display" text DEFAULT 'SELECT' NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "position" int4 DEFAULT 0 NOT NULL,
  "tenantId" text NOT NULL,
  "variantMode" text DEFAULT 'ALWAYS' NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."ProductAttributeLine" (
  "attributeId" text NOT NULL,
  "id" text NOT NULL,
  "productId" text NOT NULL,
  "tenantId" text NOT NULL,
  "valueIds" text[] NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "ProductAttributeLine_valueIds_elem_not_null_7ec1b746" CHECK (array_position("valueIds", NULL) IS NULL)
);

CREATE TABLE IF NOT EXISTS "public"."ProductAttributeValue" (
  "attributeId" text NOT NULL,
  "colorHex" text,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "position" int4 DEFAULT 0 NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."ProductCategory" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "parentId" text,
  "position" int4 DEFAULT 0 NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."Product" ADD COLUMN IF NOT EXISTS "categoryId" text;
ALTER TABLE "public"."Product" ADD COLUMN IF NOT EXISTS "customizable" bool DEFAULT false NOT NULL;
ALTER TABLE "public"."Product" ADD COLUMN IF NOT EXISTS "favorite" bool DEFAULT false NOT NULL;
ALTER TABLE "public"."Product" ADD COLUMN IF NOT EXISTS "internalNotes" text;
ALTER TABLE "public"."Product" ADD COLUMN IF NOT EXISTS "posEnabled" bool DEFAULT true NOT NULL;
ALTER TABLE "public"."Product" ADD COLUMN IF NOT EXISTS "purchasable" bool DEFAULT true NOT NULL;
ALTER TABLE "public"."Product" ADD COLUMN IF NOT EXISTS "sellable" bool DEFAULT true NOT NULL;
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx_15c304f2" ON "public"."Product" ("categoryId");
CREATE INDEX IF NOT EXISTS "Product_tenantId_categoryId_idx_bf2f0555" ON "public"."Product" ("tenantId", "categoryId");
CREATE INDEX IF NOT EXISTS "ProductAttribute_tenantId_idx_c93ed4f1" ON "public"."ProductAttribute" ("tenantId");
CREATE INDEX IF NOT EXISTS "ProductAttributeLine_attributeId_idx_58ec5fae" ON "public"."ProductAttributeLine" ("attributeId");
CREATE INDEX IF NOT EXISTS "ProductAttributeLine_productId_idx_5858600a" ON "public"."ProductAttributeLine" ("productId");
CREATE INDEX IF NOT EXISTS "ProductAttributeLine_tenantId_idx_c93ed4f1" ON "public"."ProductAttributeLine" ("tenantId");
CREATE INDEX IF NOT EXISTS "ProductAttributeValue_attributeId_idx_58ec5fae" ON "public"."ProductAttributeValue" ("attributeId");
CREATE INDEX IF NOT EXISTS "ProductAttributeValue_tenantId_idx_c93ed4f1" ON "public"."ProductAttributeValue" ("tenantId");
CREATE INDEX IF NOT EXISTS "ProductCategory_parentId_idx_6a68f597" ON "public"."ProductCategory" ("parentId");
CREATE INDEX IF NOT EXISTS "ProductCategory_tenantId_idx_c93ed4f1" ON "public"."ProductCategory" ("tenantId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductAttribute_tenantId_name_key') THEN
    ALTER TABLE "public"."ProductAttribute" ADD CONSTRAINT "ProductAttribute_tenantId_name_key" UNIQUE ("tenantId", "name");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductAttributeLine_productId_attributeId_key') THEN
    ALTER TABLE "public"."ProductAttributeLine" ADD CONSTRAINT "ProductAttributeLine_productId_attributeId_key" UNIQUE ("productId", "attributeId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductAttributeValue_attributeId_name_key') THEN
    ALTER TABLE "public"."ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeId_name_key" UNIQUE ("attributeId", "name");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductCategory_tenantId_parentId_name_key') THEN
    ALTER TABLE "public"."ProductCategory" ADD CONSTRAINT "ProductCategory_tenantId_parentId_name_key" UNIQUE ("tenantId", "parentId", "name");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductAttribute_tenantId_fkey') THEN
    ALTER TABLE "public"."ProductAttribute" ADD CONSTRAINT "ProductAttribute_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductAttributeLine_tenantId_fkey') THEN
    ALTER TABLE "public"."ProductAttributeLine" ADD CONSTRAINT "ProductAttributeLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductAttributeLine_productId_fkey') THEN
    ALTER TABLE "public"."ProductAttributeLine" ADD CONSTRAINT "ProductAttributeLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductAttributeLine_attributeId_fkey') THEN
    ALTER TABLE "public"."ProductAttributeLine" ADD CONSTRAINT "ProductAttributeLine_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "public"."ProductAttribute" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductAttributeValue_tenantId_fkey') THEN
    ALTER TABLE "public"."ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductAttributeValue_attributeId_fkey') THEN
    ALTER TABLE "public"."ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "public"."ProductAttribute" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductCategory_tenantId_fkey') THEN
    ALTER TABLE "public"."ProductCategory" ADD CONSTRAINT "ProductCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductCategory_parentId_fkey') THEN
    ALTER TABLE "public"."ProductCategory" ADD CONSTRAINT "ProductCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."ProductCategory" ("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Product_categoryId_fkey') THEN
    ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."ProductCategory" ("id") ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE "public"."ProductAttribute" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ProductAttributeLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ProductAttributeValue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ProductCategory" ENABLE ROW LEVEL SECURITY;

COMMIT;
