-- ============================================================================
-- 2026-11-07 · Órdenes de producción (una por línea de pedido)
-- Aditivo e idempotente. Migración de origen: migrations/app/20261107T0416_produccion
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS "public"."ProductionOrder" (
  "assigneeId" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "doneAt" timestamptz,
  "id" text NOT NULL,
  "note" text,
  "orderId" text NOT NULL,
  "orderLineId" text NOT NULL,
  "productName" text NOT NULL,
  "quantity" integer NOT NULL,
  "stage" text DEFAULT 'QUEUED' NOT NULL,
  "startedAt" timestamptz,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductionOrder_tenantId_orderLineId_key') THEN
    ALTER TABLE "public"."ProductionOrder" ADD CONSTRAINT "ProductionOrder_tenantId_orderLineId_key" UNIQUE ("tenantId", "orderLineId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductionOrder_tenantId_fkey') THEN
    ALTER TABLE "public"."ProductionOrder" ADD CONSTRAINT "ProductionOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductionOrder_orderId_fkey') THEN
    ALTER TABLE "public"."ProductionOrder" ADD CONSTRAINT "ProductionOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."StoreOrder" ("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ProductionOrder_orderId_idx_d284871b" ON "public"."ProductionOrder" ("orderId");
CREATE INDEX IF NOT EXISTS "ProductionOrder_tenantId_idx_c93ed4f1" ON "public"."ProductionOrder" ("tenantId");
CREATE INDEX IF NOT EXISTS "ProductionOrder_tenantId_orderId_idx_095ca8c4" ON "public"."ProductionOrder" ("tenantId", "orderId");
CREATE INDEX IF NOT EXISTS "ProductionOrder_tenantId_stage_createdAt_idx_99f08344" ON "public"."ProductionOrder" ("tenantId", "stage", "createdAt");

ALTER TABLE "public"."ProductionOrder" ENABLE ROW LEVEL SECURITY;

COMMIT;
