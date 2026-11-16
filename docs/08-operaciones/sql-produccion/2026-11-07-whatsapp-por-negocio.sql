-- ============================================================================
-- 2026-11-07 · WhatsApp Business propio de cada negocio (ADR 0010)
--
-- Aditivo e idempotente. Migración de origen:
-- migrations/app/20261107T0303_whatsapp_por_negocio
--
--  1. «BusinessConversation»: la conversación de un negocio con un contacto por su número.
--     No es la bandeja de Nexus: «tenantId» es obligatorio y la unicidad lo incluye.
--  2. «BusinessMessage»: los mensajes (entrantes y salientes) con su estado.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."BusinessConversation" (
  "channel" text DEFAULT 'WHATSAPP' NOT NULL,
  "connectionId" text NOT NULL,
  "contactHandle" text NOT NULL,
  "contactName" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "customerId" text,
  "id" text NOT NULL,
  "lastInboundAt" timestamptz,
  "lastMessageAt" timestamptz DEFAULT (now()) NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "tenantId" text NOT NULL,
  "unread" int4 DEFAULT 0 NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."BusinessMessage" (
  "body" text NOT NULL,
  "conversationId" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "direction" text NOT NULL,
  "error" text,
  "externalId" text,
  "id" text NOT NULL,
  "status" text DEFAULT 'RECEIVED' NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessConversation_tenantId_channel_contactHandle_key" ON "public"."BusinessConversation" ("tenantId", "channel", "contactHandle");
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessMessage_tenantId_externalId_key" ON "public"."BusinessMessage" ("tenantId", "externalId");
CREATE INDEX IF NOT EXISTS "BusinessConversation_tenantId_customerId_idx_302ad259" ON "public"."BusinessConversation" ("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "BusinessConversation_tenantId_idx_c93ed4f1" ON "public"."BusinessConversation" ("tenantId");
CREATE INDEX IF NOT EXISTS "BusinessConversation_tenantId_status_lastMessageAt_idx_bee5e13b" ON "public"."BusinessConversation" ("tenantId", "status", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "BusinessMessage_conversationId_idx_669215a6" ON "public"."BusinessMessage" ("conversationId");
CREATE INDEX IF NOT EXISTS "BusinessMessage_tenantId_conversationId_createdAt_idx_3e214dca" ON "public"."BusinessMessage" ("tenantId", "conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "BusinessMessage_tenantId_idx_c93ed4f1" ON "public"."BusinessMessage" ("tenantId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessConversation_tenantId_fkey') THEN
    ALTER TABLE "public"."BusinessConversation" ADD CONSTRAINT "BusinessConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessMessage_tenantId_fkey') THEN
    ALTER TABLE "public"."BusinessMessage" ADD CONSTRAINT "BusinessMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessMessage_conversationId_fkey') THEN
    ALTER TABLE "public"."BusinessMessage" ADD CONSTRAINT "BusinessMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."BusinessConversation" ("id") ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "public"."BusinessConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."BusinessMessage" ENABLE ROW LEVEL SECURITY;

COMMIT;
