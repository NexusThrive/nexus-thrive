-- ============================================================================
-- 2026-11-07 · Conciliación bancaria (extracto importado)
--
-- Aditivo e idempotente. Migración de origen:
-- migrations/app/20261107T0055_conciliacion_bancaria
--
--  1. «BankStatementLine»: cada movimiento del extracto del banco, con su estado
--     (pendiente, propuesto o conciliado) y con qué pago o liquidación cruza.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."BankStatementLine" (
  "amount" numeric NOT NULL,
  "batch" text NOT NULL,
  "confirmedAt" timestamptz,
  "confirmedById" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "day" text NOT NULL,
  "description" text NOT NULL,
  "fingerprint" text NOT NULL,
  "id" text NOT NULL,
  "matchConfidence" text,
  "matchId" text,
  "matchType" text,
  "reference" text,
  "status" text DEFAULT 'UNMATCHED' NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BankStatementLine_tenantId_fingerprint_key" ON "public"."BankStatementLine" ("tenantId", "fingerprint");
CREATE INDEX IF NOT EXISTS "BankStatementLine_tenantId_idx_c93ed4f1" ON "public"."BankStatementLine" ("tenantId");
CREATE INDEX IF NOT EXISTS "BankStatementLine_tenantId_status_day_idx_0d0f6919" ON "public"."BankStatementLine" ("tenantId", "status", "day");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BankStatementLine_tenantId_fkey') THEN
    ALTER TABLE "public"."BankStatementLine"
    ADD CONSTRAINT "BankStatementLine_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "public"."BankStatementLine" ENABLE ROW LEVEL SECURITY;

COMMIT;
