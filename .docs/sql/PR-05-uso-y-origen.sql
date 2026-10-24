-- ============================================================================
-- PR-05-uso-y-origen · Bitácora con origen y medidores de uso
-- PR-05 de .docs/hoja-de-ruta-implementacion.md
--
-- BORRADOR DE DISEÑO PARA REVISAR, no para correr. La migración real sale de
-- editar prisma/contract.prisma y ejecutar `prisma migration plan` (ver la
-- hoja de ruta, «Cómo se migra»). Este archivo fija las tablas, las columnas, las
-- llaves y los índices que esa edición debe producir. Aditivo e idempotente.
--
-- Cada acción deja quién fue: persona, llave de API, agente o automatización.
-- UsageCounter mide por negocio y periodo (peticiones, eventos, tokens de IA,
-- mensajes, ejecuciones de n8n) para cupos y cobro por consumo.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."UsageCounter" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "meter" text NOT NULL,
  "period" text NOT NULL,
  "quantity" numeric DEFAULT 0 NOT NULL,
  "limitQuantity" numeric,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "UsageCounter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "UsageCounter_tenantId_period_idx" ON "public"."UsageCounter" ("tenantId", "period");
CREATE UNIQUE INDEX IF NOT EXISTS "UsageCounter_tenantId_meter_period_key" ON "public"."UsageCounter" ("tenantId", "meter", "period");
ALTER TABLE "public"."UsageCounter" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."AuditLog" ADD COLUMN IF NOT EXISTS "actorType" text DEFAULT 'USER' NOT NULL;
ALTER TABLE "public"."AuditLog" ADD COLUMN IF NOT EXISTS "apiKeyId" text;
ALTER TABLE "public"."AuditLog" ADD COLUMN IF NOT EXISTS "requestId" text;
CREATE INDEX IF NOT EXISTS "AuditLog_apiKeyId_idx" ON "public"."AuditLog" ("apiKeyId");

-- actorType: USER | API_KEY | AGENT | AUTOMATION | SYSTEM. Medidores: api.requests, events.delivered, ai.tokens, messages.sent, automations.runs.

COMMIT;
