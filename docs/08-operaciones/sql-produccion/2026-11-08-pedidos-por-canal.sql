-- ============================================================================
-- Pedidos por canal (canal e identificador externo)
--
-- Aditivo e idempotente. Migración de origen: migrations/app/20261108T1946_pedidos_por_canal
-- ============================================================================

BEGIN;



ALTER TABLE "public"."StoreOrder" ADD COLUMN IF NOT EXISTS "channel" text DEFAULT 'WEB' NOT NULL;
ALTER TABLE "public"."StoreOrder" ADD COLUMN IF NOT EXISTS "externalId" text;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StoreOrder_tenantId_channel_externalId_key') THEN
    ALTER TABLE "public"."StoreOrder" ADD CONSTRAINT "StoreOrder_tenantId_channel_externalId_key" UNIQUE ("tenantId", "channel", "externalId");
  END IF;
END $$;



COMMIT;
