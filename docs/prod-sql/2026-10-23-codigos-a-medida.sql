-- ============================================================================
-- 2026-10-23 · Códigos de activación a medida (Bloque B, paso 0)
--
-- Equivale a la migración migrations/app/20261023T1519_codigos_a_medida.
-- Aditivo e idempotente: columnas opcionales, se puede correr dos veces.
--
-- Qué hace:
--   "BenefitCode": precio mensual acordado, módulos exactos y límites de
--   usuarios y clientes. "BenefitRedemption": copia del precio al canjear.
--   "Tenant": límites acordados (null = los del plan).
--
-- Correr en el SQL Editor de Supabase ANTES de desplegar la versión que lo trae.
-- (Si producción se migra desde el despliegue, camino A, no hace falta.)
-- ============================================================================

ALTER TABLE "public"."BenefitCode" ADD COLUMN IF NOT EXISTS "priceUsdCents" int4;
ALTER TABLE "public"."BenefitCode" ADD COLUMN IF NOT EXISTS "modules" text[];
ALTER TABLE "public"."BenefitCode" ADD COLUMN IF NOT EXISTS "maxUsers" int4;
ALTER TABLE "public"."BenefitCode" ADD COLUMN IF NOT EXISTS "maxCustomers" int4;
ALTER TABLE "public"."BenefitRedemption" ADD COLUMN IF NOT EXISTS "priceUsdCents" int4;
ALTER TABLE "public"."Tenant" ADD COLUMN IF NOT EXISTS "maxUsers" int4;
ALTER TABLE "public"."Tenant" ADD COLUMN IF NOT EXISTS "maxCustomers" int4;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BenefitCode_modules_elem_not_null_749d77ec'
  ) THEN
    ALTER TABLE "public"."BenefitCode"
      ADD CONSTRAINT "BenefitCode_modules_elem_not_null_749d77ec"
      CHECK (array_position("modules", NULL) IS NULL);
  END IF;
END $$;
