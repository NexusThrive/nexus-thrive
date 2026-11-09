-- ============================================================================
-- 2026-11-07 · Oportunidades (seguimiento de cada interesado)
--
-- Aditivo e idempotente. Migración de origen:
-- migrations/app/20261107T0134_oportunidades
--
--  1. «Opportunity»: cada interesado ligado a UN contacto, con interés, valor estimado,
--     etapa, próxima acción y estado (abierta, ganada o perdida).
--
-- Los «ContactLead» que ya existían se migran con la función migrateContactLeads (código),
-- porque cada uno necesita encontrar o crear su contacto por teléfono canónico.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."Opportunity" (
  "closedAt" timestamptz,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "customerId" text NOT NULL,
  "estimatedValue" numeric,
  "id" text NOT NULL,
  "interest" text NOT NULL,
  "leadId" text,
  "lostReason" text,
  "nextAction" text,
  "nextActionAt" timestamptz,
  "orderId" text,
  "ownerId" text,
  "source" text,
  "stage" text DEFAULT 'NEW' NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Opportunity_tenantId_leadId_key" ON "public"."Opportunity" ("tenantId", "leadId");
CREATE INDEX IF NOT EXISTS "Opportunity_tenantId_customerId_idx_302ad259" ON "public"."Opportunity" ("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "Opportunity_tenantId_idx_c93ed4f1" ON "public"."Opportunity" ("tenantId");
CREATE INDEX IF NOT EXISTS "Opportunity_tenantId_status_stage_idx_824e523e" ON "public"."Opportunity" ("tenantId", "status", "stage");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Opportunity_tenantId_fkey') THEN
    ALTER TABLE "public"."Opportunity"
    ADD CONSTRAINT "Opportunity_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "public"."Opportunity" ENABLE ROW LEVEL SECURITY;

COMMIT;
