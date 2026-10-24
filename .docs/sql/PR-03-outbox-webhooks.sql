-- ============================================================================
-- PR-03-outbox-webhooks · Eventos: outbox transaccional y webhooks firmados
-- PR-03 de .docs/hoja-de-ruta-implementacion.md
--
-- BORRADOR DE DISEÑO PARA REVISAR, no para correr. La migración real sale de
-- editar prisma/contract.prisma y ejecutar `prisma migration plan` (ver la
-- hoja de ruta, «Cómo se migra»). Este archivo fija las tablas, las columnas, las
-- llaves y los índices que esa edición debe producir. Aditivo e idempotente.
--
-- OutboxEvent se escribe en la MISMA transacción que el hecho. Un despachador lo lee
-- y crea entregas a las suscripciones (WebhookEndpoint). WebhookDelivery guarda cada
-- intento (reintentos exponenciales, bandeja de fallidos y reenvío).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."OutboxEvent" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "type" text NOT NULL,
  "version" int4 DEFAULT 1 NOT NULL,
  "resourceType" text,
  "resourceId" text,
  "payload" jsonb NOT NULL,
  "sequence" bigint GENERATED ALWAYS AS IDENTITY,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "processedAt" timestamptz,
  "attempts" int4 DEFAULT 0 NOT NULL,
  "nextAttemptAt" timestamptz DEFAULT (now()) NOT NULL,
  "lastError" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "OutboxEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "OutboxEvent_tenantId_createdAt_idx" ON "public"."OutboxEvent" ("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "OutboxEvent_processedAt_nextAttemptAt_idx" ON "public"."OutboxEvent" ("processedAt", "nextAttemptAt");
CREATE INDEX IF NOT EXISTS "OutboxEvent_tenantId_resourceType_resourceId_idx" ON "public"."OutboxEvent" ("tenantId", "resourceType", "resourceId");
CREATE UNIQUE INDEX IF NOT EXISTS "OutboxEvent_sequence_key" ON "public"."OutboxEvent" ("sequence");
ALTER TABLE "public"."OutboxEvent" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."WebhookEndpoint" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "url" text NOT NULL,
  "description" text,
  "secretEnc" text NOT NULL,
  "previousSecretEnc" text,
  "previousSecretUntil" timestamptz,
  "eventTypes" text[] DEFAULT '{}' NOT NULL,
  "active" bool DEFAULT true NOT NULL,
  "consecutiveFailures" int4 DEFAULT 0 NOT NULL,
  "disabledAt" timestamptz,
  "disabledReason" text,
  "createdById" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "WebhookEndpoint_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "WebhookEndpoint_check_1" CHECK ("url" ~ '^https://')
);
CREATE INDEX IF NOT EXISTS "WebhookEndpoint_tenantId_active_idx" ON "public"."WebhookEndpoint" ("tenantId", "active");
ALTER TABLE "public"."WebhookEndpoint" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."WebhookDelivery" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "endpointId" text NOT NULL,
  "eventId" text NOT NULL,
  "attempt" int4 NOT NULL,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "responseStatus" int4,
  "responseExcerpt" text,
  "durationMs" int4,
  "nextAttemptAt" timestamptz,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "deliveredAt" timestamptz,
  PRIMARY KEY ("id"),
  CONSTRAINT "WebhookDelivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "public"."WebhookEndpoint" ("id") ON DELETE CASCADE,
  CONSTRAINT "WebhookDelivery_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."OutboxEvent" ("id") ON DELETE CASCADE,
  CONSTRAINT "WebhookDelivery_check_1" CHECK ("status" IN ('PENDING','SUCCESS','FAILED'))
);
CREATE INDEX IF NOT EXISTS "WebhookDelivery_tenantId_status_nextAttemptAt_idx" ON "public"."WebhookDelivery" ("tenantId", "status", "nextAttemptAt");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_endpointId_createdAt_idx" ON "public"."WebhookDelivery" ("endpointId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookDelivery_endpointId_eventId_attempt_key" ON "public"."WebhookDelivery" ("endpointId", "eventId", "attempt");
ALTER TABLE "public"."WebhookDelivery" ENABLE ROW LEVEL SECURITY;

-- El secreto se guarda cifrado (secretEnc); el despachador firma con HMAC-SHA256 «t=<unix>,v1=<firma>». Solo HTTPS (CHECK) y sin IPs privadas (validado en código: SSRF).

COMMIT;
