-- ============================================================================
-- 2026-11-07 · Tesorería: cuentas financieras y comisión estimada de la pasarela
--
-- Aditivo e idempotente. Migración de origen:
-- migrations/app/20261107T0030_tesoreria
--
--  1. «FinancialAccount»: dónde está el dinero (caja, banco, pasarela) y, en las pasarelas,
--     la tarifa para estimar la comisión (porcentaje, valor fijo e IVA sobre la comisión).
--  2. «PaymentIntent»: comisión estimada, neto esperado y la pasarela que cobró.
--
-- La regla contable «PAYMENT_RECEIVED_GATEWAY» y la cuenta 1340 se crean al activar la
-- contabilidad (o al volver a sembrarla); los negocios que ya la tenían siguen con la regla
-- anterior hasta entonces, sin perder nada.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."FinancialAccount" (
  "active" bool DEFAULT true NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "feeFixed" numeric DEFAULT '0'::numeric NOT NULL,
  "feePct" numeric DEFAULT '0'::numeric NOT NULL,
  "feeVatPct" numeric DEFAULT '0'::numeric NOT NULL,
  "id" text NOT NULL,
  "kind" text NOT NULL,
  "ledgerAccount" text NOT NULL,
  "name" text NOT NULL,
  "provider" text,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FinancialAccount_tenantId_kind_name_key" ON "public"."FinancialAccount" ("tenantId", "kind", "name");
CREATE INDEX IF NOT EXISTS "FinancialAccount_tenantId_idx_c93ed4f1" ON "public"."FinancialAccount" ("tenantId");
CREATE INDEX IF NOT EXISTS "FinancialAccount_tenantId_kind_idx_1e76dd5c" ON "public"."FinancialAccount" ("tenantId", "kind");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FinancialAccount_tenantId_fkey') THEN
    ALTER TABLE "public"."FinancialAccount"
    ADD CONSTRAINT "FinancialAccount_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "public"."FinancialAccount" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."PaymentIntent" ADD COLUMN IF NOT EXISTS "feeEstimated" numeric;
ALTER TABLE "public"."PaymentIntent" ADD COLUMN IF NOT EXISTS "financialAccountId" text;
ALTER TABLE "public"."PaymentIntent" ADD COLUMN IF NOT EXISTS "netExpected" numeric;

COMMIT;
