-- ============================================================================
-- 2026-11-07 · Cotización comercial compartida
--
-- Aditivo e idempotente. Migración de origen:
-- migrations/app/20261107T0207_cotizaciones_comerciales
--
--  1. «SalesQuote» y «SalesQuoteLine»: cotizar desde cualquier solución con el catálogo;
--     aprobarla crea el pedido con su anticipo y su saldo como obligaciones. No toca el
--     presupuesto de obra («Quote»).
--  2. «StoreOrder».«quoteId»: la cotización de la que nació el pedido.
--  3. La función «quotes» deja de estar «próximamente»: se enciende desde Funciones.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."SalesQuote" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "customerId" text NOT NULL,
  "decidedAt" timestamptz,
  "decidedByName" text,
  "decisionNote" text,
  "depositPct" numeric DEFAULT '50'::numeric NOT NULL,
  "id" text NOT NULL,
  "notes" text,
  "number" int4 NOT NULL,
  "orderId" text,
  "sentAt" timestamptz,
  "status" text DEFAULT 'DRAFT' NOT NULL,
  "subtotal" numeric NOT NULL,
  "taxTotal" numeric NOT NULL,
  "tenantId" text NOT NULL,
  "title" text NOT NULL,
  "total" numeric NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "validUntil" text,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."SalesQuoteLine" (
  "id" text NOT NULL,
  "name" text NOT NULL,
  "productId" text NOT NULL,
  "quantity" int4 NOT NULL,
  "quoteId" text NOT NULL,
  "taxRatePct" numeric DEFAULT '0'::numeric NOT NULL,
  "tenantId" text NOT NULL,
  "unitPrice" numeric NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."StoreOrder" ADD COLUMN IF NOT EXISTS "quoteId" text;

CREATE UNIQUE INDEX IF NOT EXISTS "SalesQuote_tenantId_number_key" ON "public"."SalesQuote" ("tenantId", "number");
CREATE INDEX IF NOT EXISTS "SalesQuote_tenantId_customerId_idx_302ad259" ON "public"."SalesQuote" ("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "SalesQuote_tenantId_idx_c93ed4f1" ON "public"."SalesQuote" ("tenantId");
CREATE INDEX IF NOT EXISTS "SalesQuote_tenantId_status_idx_d3d04256" ON "public"."SalesQuote" ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "SalesQuoteLine_quoteId_idx_a7628ce5" ON "public"."SalesQuoteLine" ("quoteId");
CREATE INDEX IF NOT EXISTS "SalesQuoteLine_tenantId_idx_c93ed4f1" ON "public"."SalesQuoteLine" ("tenantId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SalesQuote_tenantId_fkey') THEN
    ALTER TABLE "public"."SalesQuote" ADD CONSTRAINT "SalesQuote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SalesQuoteLine_tenantId_fkey') THEN
    ALTER TABLE "public"."SalesQuoteLine" ADD CONSTRAINT "SalesQuoteLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SalesQuoteLine_quoteId_fkey') THEN
    ALTER TABLE "public"."SalesQuoteLine" ADD CONSTRAINT "SalesQuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "public"."SalesQuote" ("id") ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "public"."SalesQuote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SalesQuoteLine" ENABLE ROW LEVEL SECURITY;

-- La función «Cotizaciones» pasa de «próximamente» a disponible (si el catálogo ya guardaba su estado).
UPDATE "ModuleSetting" SET status = 'READY' WHERE module = 'quotes' AND status = 'PLANNED';

COMMIT;
