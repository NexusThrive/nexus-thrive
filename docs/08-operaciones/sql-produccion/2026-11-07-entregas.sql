-- ============================================================================
-- 2026-11-07 · Entregas de pedidos (método, guía, fecha, confirmación)
-- Aditivo e idempotente. Migración de origen: migrations/app/20261107T0438_entregas
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS "public"."Delivery" (
  "carrier" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "deliveredAt" timestamptz,
  "id" text NOT NULL,
  "method" text NOT NULL,
  "note" text,
  "orderId" text NOT NULL,
  "receivedBy" text,
  "scheduledFor" timestamptz,
  "tenantId" text NOT NULL,
  "trackingCode" text,
  PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Delivery_orderId_key') THEN
    ALTER TABLE "public"."Delivery" ADD CONSTRAINT "Delivery_orderId_key" UNIQUE ("orderId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Delivery_tenantId_fkey') THEN
    ALTER TABLE "public"."Delivery" ADD CONSTRAINT "Delivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Delivery_orderId_fkey') THEN
    ALTER TABLE "public"."Delivery" ADD CONSTRAINT "Delivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."StoreOrder" ("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Delivery_tenantId_idx_c93ed4f1" ON "public"."Delivery" ("tenantId");
CREATE INDEX IF NOT EXISTS "Delivery_tenantId_scheduledFor_idx_c01a0bda" ON "public"."Delivery" ("tenantId", "scheduledFor");

ALTER TABLE "public"."Delivery" ENABLE ROW LEVEL SECURITY;

COMMIT;
