-- ============================================================================
-- 2026-11-06 · Obligaciones (pedidos de la tienda y membresías con saldo)
--
-- Aditivo e idempotente. Migración de origen:
-- migrations/app/20261106T2355_obligaciones
--
--  1. «Obligation»: lo que un cliente debe por un pedido de la tienda o una
--     membresía, con monto, saldo y vencimiento. Las facturas ya llevan su
--     propio saldo («Invoice».«paidTotal»); la cartera junta ambas.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."Obligation" (
  "amount" numeric NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "customerId" text,
  "debtorName" text NOT NULL,
  "description" text NOT NULL,
  "dueDate" timestamptz NOT NULL,
  "id" text NOT NULL,
  "originId" text NOT NULL,
  "originType" text NOT NULL,
  "paidTotal" numeric DEFAULT '0'::numeric NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Obligation_tenantId_originType_originId_key" ON "public"."Obligation" ("tenantId", "originType", "originId");
CREATE INDEX IF NOT EXISTS "Obligation_tenantId_idx_c93ed4f1" ON "public"."Obligation" ("tenantId");
CREATE INDEX IF NOT EXISTS "Obligation_tenantId_status_dueDate_idx_8121dcd9" ON "public"."Obligation" ("tenantId", "status", "dueDate");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Obligation_tenantId_fkey') THEN
    ALTER TABLE "public"."Obligation"
    ADD CONSTRAINT "Obligation_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "public"."Obligation" ENABLE ROW LEVEL SECURITY;

COMMIT;
