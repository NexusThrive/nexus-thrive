-- ============================================================================
-- Persona de contacto en terceros
--
-- Aditivo e idempotente. Migración de origen: migrations/app/20261108T2218_contacto_en_terceros
-- ============================================================================

BEGIN;



ALTER TABLE "public"."Party" ADD COLUMN IF NOT EXISTS "contactEmail" text;
ALTER TABLE "public"."Party" ADD COLUMN IF NOT EXISTS "contactName" text;
ALTER TABLE "public"."Party" ADD COLUMN IF NOT EXISTS "contactPhone" text;




COMMIT;
