-- ============================================================================
-- 2026-11-07 · Intentos de pago
--
-- Aditivo e idempotente. Migración de origen:
-- migrations/app/*_intentos_de_pago
--
--  1. «PaymentAttempt»: cada intento fallido (rechazado, con error o anulado) que reporta la
--     pasarela. No crea pagos y el cobro sigue abierto para reintentar.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."PaymentAttempt" (
  "amount" numeric,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "externalId" text NOT NULL,
  "id" text NOT NULL,
  "intentId" text NOT NULL,
  "provider" text NOT NULL,
  "result" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentAttempt_tenantId_intentId_externalId_key" ON "public"."PaymentAttempt" ("tenantId", "intentId", "externalId");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_tenantId_idx_c93ed4f1" ON "public"."PaymentAttempt" ("tenantId");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_tenantId_intentId_idx_78c4c2b6" ON "public"."PaymentAttempt" ("tenantId", "intentId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentAttempt_tenantId_fkey') THEN
    ALTER TABLE "public"."PaymentAttempt"
    ADD CONSTRAINT "PaymentAttempt_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "public"."PaymentAttempt" ENABLE ROW LEVEL SECURITY;

COMMIT;
