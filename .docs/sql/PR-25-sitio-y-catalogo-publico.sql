-- ============================================================================
-- PR-25-sitio-y-catalogo-publico · Mini-sitio del negocio con catálogo
-- PR-25 de .docs/hoja-de-ruta-implementacion.md
--
-- BORRADOR DE DISEÑO PARA REVISAR, no para correr. La migración real sale de
-- editar prisma/contract.prisma y ejecutar `prisma migration plan` (ver la
-- hoja de ruta, «Cómo se migra»). Este archivo fija las tablas, las columnas, las
-- llaves y los índices que esa edición debe producir. Aditivo e idempotente.
--
-- Un sitio por negocio (subdominio o dominio propio) con páginas por bloques, SEO y el
-- catálogo publicado. El HTML se genera en el servidor (rápido e indexable).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."Storefront" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "slug" text NOT NULL,
  "customDomain" text,
  "status" text DEFAULT 'DRAFT' NOT NULL,
  "theme" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "contact" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "publishedAt" timestamptz,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "Storefront_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "Storefront_check_1" CHECK ("status" IN ('DRAFT','PUBLISHED'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "Storefront_tenantId_key" ON "public"."Storefront" ("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "Storefront_slug_key" ON "public"."Storefront" ("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Storefront_domain_key" ON "public"."Storefront" ("customDomain") WHERE "customDomain" IS NOT NULL;
ALTER TABLE "public"."Storefront" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."StorefrontPage" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "storefrontId" text NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "seoTitle" text,
  "seoDescription" text,
  "position" int4 DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'DRAFT' NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "StorefrontPage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "StorefrontPage_storefrontId_fkey" FOREIGN KEY ("storefrontId") REFERENCES "public"."Storefront" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StorefrontPage_storefrontId_position_idx" ON "public"."StorefrontPage" ("storefrontId", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "StorefrontPage_storefrontId_slug_key" ON "public"."StorefrontPage" ("storefrontId", "slug");
ALTER TABLE "public"."StorefrontPage" ENABLE ROW LEVEL SECURITY;

-- El catálogo del sitio sale de Product.publishedOnline (PR-09). Datos estructurados (Schema.org Product/LocalBusiness), sitemap.xml y robots.txt se generan, no se guardan. PresenceRequest (existente) cubre el flujo manual actual de diseño.

COMMIT;
