-- ============================================================================
-- 2026-11-07 · Cumplimiento de pedidos (recibido → entregado) con historial
--
-- Aditivo e idempotente. Migración de origen:
-- migrations/app/20261107T0346_cumplimiento_de_pedidos
--
--  1. «StoreOrder».«fulfillment»: estado de cumplimiento, separado del estado de pago («status»).
--  2. «OrderStatusChange»: cada cambio con quién y cuándo.
--  3. Migración de los pedidos existentes: los pagados pasan a CONFIRMED y los cancelados o
--     abandonados a CANCELED; los demás quedan RECIBIDO. No se inventa que algo se entregó.
-- ============================================================================

BEGIN;

ALTER TABLE "public"."StoreOrder" ADD COLUMN IF NOT EXISTS "fulfillment" text NOT NULL DEFAULT 'RECEIVED';

CREATE TABLE IF NOT EXISTS "public"."OrderStatusChange" (
  "byId" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "fromStatus" text,
  "id" text NOT NULL,
  "note" text,
  "orderId" text NOT NULL,
  "tenantId" text NOT NULL,
  "toStatus" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OrderStatusChange_orderId_idx_d284871b" ON "public"."OrderStatusChange" ("orderId");
CREATE INDEX IF NOT EXISTS "OrderStatusChange_tenantId_idx_c93ed4f1" ON "public"."OrderStatusChange" ("tenantId");
CREATE INDEX IF NOT EXISTS "OrderStatusChange_tenantId_orderId_createdAt_idx_646b049b" ON "public"."OrderStatusChange" ("tenantId", "orderId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderStatusChange_tenantId_fkey') THEN
    ALTER TABLE "public"."OrderStatusChange" ADD CONSTRAINT "OrderStatusChange_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderStatusChange_orderId_fkey') THEN
    ALTER TABLE "public"."OrderStatusChange" ADD CONSTRAINT "OrderStatusChange_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."StoreOrder" ("id") ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "public"."OrderStatusChange" ENABLE ROW LEVEL SECURITY;

-- Pedidos que ya existían (solo los que aún no se movieron).
UPDATE "public"."StoreOrder" SET "fulfillment" = 'CONFIRMED' WHERE "fulfillment" = 'RECEIVED' AND "status" = 'PAID';
UPDATE "public"."StoreOrder" SET "fulfillment" = 'CANCELED' WHERE "fulfillment" = 'RECEIVED' AND "status" IN ('CANCELED', 'ABANDONED');

COMMIT;
