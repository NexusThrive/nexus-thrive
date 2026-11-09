-- ============================================================================
-- 2026-11-07 · Formularios de captura de interesados (Lead Capture API)
--
-- Aditivo e idempotente. Migración de origen:
-- migrations/app/20261107T0241_formularios_de_captura
--
--  1. «LeadForm»: una clave pública por formulario, con los orígenes web permitidos.
--     Una web externa envía interesados con esa clave; crea contacto y oportunidad.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."LeadForm" (
  "allowedOrigins" text[] NOT NULL,
  "campaign" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "enabled" bool DEFAULT true NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "publicKey" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "LeadForm_allowedOrigins_elem_not_null_d963e802" CHECK (array_position("allowedOrigins", NULL) IS NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS "LeadForm_publicKey_key" ON "public"."LeadForm" ("publicKey");
CREATE INDEX IF NOT EXISTS "LeadForm_tenantId_idx_c93ed4f1" ON "public"."LeadForm" ("tenantId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeadForm_tenantId_fkey') THEN
    ALTER TABLE "public"."LeadForm"
    ADD CONSTRAINT "LeadForm_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "public"."LeadForm" ENABLE ROW LEVEL SECURITY;

COMMIT;
