-- ============================================================================
-- 2026-11-07 · Transferencias en verificación
--
-- Aditivo e idempotente. Migración de origen:
-- migrations/app/*_verificacion_de_transferencias
--
--  1. «PaymentIntent».«proofNote»: referencia o comprobante que escribe el cliente al avisar su pago.
--  2. «PaymentIntent».«proofAt»: cuándo avisó.
--  3. «PaymentIntent».«rejectionReason»: por qué se rechazó el comprobante.
--
-- El estado nuevo «VERIFYING» no necesita cambio: «PaymentIntent».«status» es texto libre.
-- ============================================================================

BEGIN;

ALTER TABLE "public"."PaymentIntent" ADD COLUMN IF NOT EXISTS "proofAt" timestamptz;
ALTER TABLE "public"."PaymentIntent" ADD COLUMN IF NOT EXISTS "proofNote" text;
ALTER TABLE "public"."PaymentIntent" ADD COLUMN IF NOT EXISTS "rejectionReason" text;

COMMIT;
