-- ============================================================================
-- Medios de pago del negocio
--
-- Aditivo e idempotente. Migración de origen: migrations/app/20261108T1931_medios_de_pago_del_negocio
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."PaymentMethodSetting" (
  "active" bool DEFAULT true NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "instructions" text,
  "kind" text DEFAULT 'TRANSFER' NOT NULL,
  "name" text NOT NULL,
  "position" int4 DEFAULT 0 NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);


CREATE INDEX IF NOT EXISTS "PaymentMethodSetting_tenantId_idx_c93ed4f1" ON "public"."PaymentMethodSetting" ("tenantId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentMethodSetting_tenantId_name_key') THEN
    ALTER TABLE "public"."PaymentMethodSetting" ADD CONSTRAINT "PaymentMethodSetting_tenantId_name_key" UNIQUE ("tenantId", "name");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentMethodSetting_tenantId_fkey') THEN
    ALTER TABLE "public"."PaymentMethodSetting" ADD CONSTRAINT "PaymentMethodSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "public"."PaymentMethodSetting" ENABLE ROW LEVEL SECURITY;

COMMIT;
