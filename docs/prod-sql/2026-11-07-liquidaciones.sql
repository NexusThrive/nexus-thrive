-- ============================================================================
-- 2026-11-07 · Liquidaciones del proveedor de pagos
--
-- Aditivo e idempotente. Migración de origen:
-- migrations/app/20261107T0044_liquidaciones
--
--  1. «ProviderSettlement»: lo que la pasarela depositó por un grupo de cobros, con su comisión
--     real; la diferencia contra la estimada genera un ajuste contable.
--  2. «PaymentIntent».«settlementId»: la liquidación en la que se depositó cada cobro.
--
-- Las reglas contables «SETTLEMENT» y «SETTLEMENT_REFUND» se crean al activar o volver a sembrar
-- la contabilidad del negocio.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."ProviderSettlement" (
  "accounted" bool DEFAULT false NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "day" text NOT NULL,
  "difference" numeric NOT NULL,
  "externalRef" text NOT NULL,
  "feeEstimated" numeric NOT NULL,
  "feeReal" numeric NOT NULL,
  "gross" numeric NOT NULL,
  "id" text NOT NULL,
  "itemCount" int4 NOT NULL,
  "netReceived" numeric NOT NULL,
  "provider" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProviderSettlement_tenantId_provider_externalRef_key" ON "public"."ProviderSettlement" ("tenantId", "provider", "externalRef");
CREATE INDEX IF NOT EXISTS "ProviderSettlement_tenantId_createdAt_idx_88162366" ON "public"."ProviderSettlement" ("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProviderSettlement_tenantId_idx_c93ed4f1" ON "public"."ProviderSettlement" ("tenantId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProviderSettlement_tenantId_fkey') THEN
    ALTER TABLE "public"."ProviderSettlement"
    ADD CONSTRAINT "ProviderSettlement_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "public"."ProviderSettlement" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."PaymentIntent" ADD COLUMN IF NOT EXISTS "settlementId" text;

COMMIT;
