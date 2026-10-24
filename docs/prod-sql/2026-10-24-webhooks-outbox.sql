-- ============================================================================
-- 2026-10-24 · Outbox de eventos y webhooks firmados (PR-03)
--
-- Equivale a la migración migrations/app/20261024T0139_webhooks_outbox.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."OutboxEvent" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "payload" json NOT NULL,
  "processedAt" timestamptz,
  "resourceId" text,
  "resourceType" text,
  "tenantId" text NOT NULL,
  "type" text NOT NULL,
  "version" int4 DEFAULT 1 NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."WebhookDelivery" (
  "attempt" int4 DEFAULT 0 NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "deliveredAt" timestamptz,
  "durationMs" int4,
  "endpointId" text NOT NULL,
  "eventId" text NOT NULL,
  "id" text NOT NULL,
  "nextAttemptAt" timestamptz,
  "responseExcerpt" text,
  "responseStatus" int4,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."WebhookEndpoint" (
  "active" bool DEFAULT true NOT NULL,
  "consecutiveFailures" int4 DEFAULT 0 NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "description" text,
  "disabledAt" timestamptz,
  "disabledReason" text,
  "eventTypes" text[] NOT NULL,
  "id" text NOT NULL,
  "previousSecretEnc" text,
  "previousSecretUntil" timestamptz,
  "secretEnc" text NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "url" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "WebhookEndpoint_eventTypes_elem_not_null_9d7fdd2b" CHECK (array_position("eventTypes", NULL) IS NULL)
);

ALTER TABLE "public"."WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_endpointId_eventId_key" UNIQUE ("endpointId", "eventId");

CREATE INDEX "OutboxEvent_processedAt_createdAt_idx_cbbcce26" ON "public"."OutboxEvent" ("processedAt", "createdAt");

CREATE INDEX "OutboxEvent_tenantId_createdAt_idx_88162366" ON "public"."OutboxEvent" ("tenantId", "createdAt");

CREATE INDEX "OutboxEvent_tenantId_idx_c93ed4f1" ON "public"."OutboxEvent" ("tenantId");

CREATE INDEX "WebhookDelivery_endpointId_createdAt_idx_6af13a6b" ON "public"."WebhookDelivery" ("endpointId", "createdAt");

CREATE INDEX "WebhookDelivery_endpointId_idx_48273c15" ON "public"."WebhookDelivery" ("endpointId");

CREATE INDEX "WebhookDelivery_eventId_idx_6a266d47" ON "public"."WebhookDelivery" ("eventId");

CREATE INDEX "WebhookDelivery_tenantId_idx_c93ed4f1" ON "public"."WebhookDelivery" ("tenantId");

CREATE INDEX "WebhookDelivery_tenantId_status_nextAttemptAt_idx_925e31da" ON "public"."WebhookDelivery" ("tenantId", "status", "nextAttemptAt");

CREATE INDEX "WebhookEndpoint_tenantId_active_idx_35aa10e5" ON "public"."WebhookEndpoint" ("tenantId", "active");

CREATE INDEX "WebhookEndpoint_tenantId_idx_c93ed4f1" ON "public"."WebhookEndpoint" ("tenantId");

ALTER TABLE "public"."OutboxEvent"
ADD CONSTRAINT "OutboxEvent_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."WebhookDelivery"
ADD CONSTRAINT "WebhookDelivery_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."WebhookDelivery"
ADD CONSTRAINT "WebhookDelivery_endpointId_fkey"
FOREIGN KEY ("endpointId")
REFERENCES "public"."WebhookEndpoint" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."WebhookDelivery"
ADD CONSTRAINT "WebhookDelivery_eventId_fkey"
FOREIGN KEY ("eventId")
REFERENCES "public"."OutboxEvent" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."WebhookEndpoint"
ADD CONSTRAINT "WebhookEndpoint_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."OutboxEvent" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."WebhookDelivery" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."WebhookEndpoint" ENABLE ROW LEVEL SECURITY;

COMMIT;
