-- ============================================================================
-- 2026-11-07 · Plantillas y avisos de WhatsApp (ventana de 24 h, consentimiento y bajas)
--
-- Aditivo e idempotente. Migración de origen:
-- migrations/app/20261107T0329_plantillas_y_avisos
--
--  1. «MessageTemplate»: el texto de cada aviso del negocio y el estado de su aprobación en Meta.
--  2. «WhatsappNotice»: cada aviso automático con su resultado (enviado, listo con un toque,
--     bloqueado por baja o fallido). Un mismo hecho («sourceId») avisa una sola vez.
--  3. «Customer».«optOutAt»: cuándo el contacto pidió no recibir más avisos.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."MessageTemplate" (
  "body" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "enabled" bool DEFAULT true NOT NULL,
  "event" text,
  "id" text NOT NULL,
  "key" text NOT NULL,
  "language" text DEFAULT 'es' NOT NULL,
  "metaName" text,
  "metaStatus" text DEFAULT 'NONE' NOT NULL,
  "tenantId" text NOT NULL,
  "title" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."WhatsappNotice" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "customerId" text NOT NULL,
  "event" text NOT NULL,
  "id" text NOT NULL,
  "messageId" text,
  "processedAt" timestamptz,
  "reason" text,
  "sourceId" text,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "templateKey" text NOT NULL,
  "tenantId" text NOT NULL,
  "variables" json NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."Customer" ADD COLUMN IF NOT EXISTS "optOutAt" timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS "MessageTemplate_tenantId_key_key" ON "public"."MessageTemplate" ("tenantId", "key");
CREATE INDEX IF NOT EXISTS "MessageTemplate_tenantId_event_idx_a78823f0" ON "public"."MessageTemplate" ("tenantId", "event");
CREATE INDEX IF NOT EXISTS "MessageTemplate_tenantId_idx_c93ed4f1" ON "public"."MessageTemplate" ("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappNotice_tenantId_event_sourceId_key" ON "public"."WhatsappNotice" ("tenantId", "event", "sourceId");
CREATE INDEX IF NOT EXISTS "WhatsappNotice_tenantId_customerId_idx_302ad259" ON "public"."WhatsappNotice" ("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "WhatsappNotice_tenantId_idx_c93ed4f1" ON "public"."WhatsappNotice" ("tenantId");
CREATE INDEX IF NOT EXISTS "WhatsappNotice_tenantId_status_createdAt_idx_c3c853c4" ON "public"."WhatsappNotice" ("tenantId", "status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MessageTemplate_tenantId_fkey') THEN
    ALTER TABLE "public"."MessageTemplate" ADD CONSTRAINT "MessageTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WhatsappNotice_tenantId_fkey') THEN
    ALTER TABLE "public"."WhatsappNotice" ADD CONSTRAINT "WhatsappNotice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "public"."MessageTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WhatsappNotice" ENABLE ROW LEVEL SECURITY;

COMMIT;
