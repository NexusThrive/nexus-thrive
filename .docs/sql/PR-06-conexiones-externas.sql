-- ============================================================================
-- PR-06-conexiones-externas · Conexiones externas (credenciales cifradas) y eventos de proveedores
-- PR-06 de .docs/hoja-de-ruta-implementacion.md
--
-- BORRADOR DE DISEÑO PARA REVISAR, no para correr. La migración real sale de
-- editar prisma/contract.prisma y ejecutar `prisma migration plan` (ver la
-- hoja de ruta, «Cómo se migra»). Este archivo fija las tablas, las columnas, las
-- llaves y los índices que esa edición debe producir. Aditivo e idempotente.
--
-- ExternalConnection: la cuenta de cada negocio con cada proveedor (pagos, facturación
-- electrónica, mensajería…), con credenciales CIFRADAS. ProviderEvent: todo webhook
-- entrante de un proveedor, en bruto, con la firma verificada y procesado una sola vez.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."ExternalConnection" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "kind" text NOT NULL,
  "provider" text NOT NULL,
  "environment" text DEFAULT 'sandbox' NOT NULL,
  "status" text DEFAULT 'DISCONNECTED' NOT NULL,
  "credentialsEnc" text,
  "credentialsKeyId" text,
  "config" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "lastCheckedAt" timestamptz,
  "lastError" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "ExternalConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "ExternalConnection_check_1" CHECK ("environment" IN ('sandbox','production')),
  CONSTRAINT "ExternalConnection_check_2" CHECK ("status" IN ('DISCONNECTED','CONNECTED','ERROR'))
);
CREATE INDEX IF NOT EXISTS "ExternalConnection_tenantId_kind_idx" ON "public"."ExternalConnection" ("tenantId", "kind");
CREATE UNIQUE INDEX IF NOT EXISTS "ExternalConnection_tenantId_kind_provider_environment_key" ON "public"."ExternalConnection" ("tenantId", "kind", "provider", "environment");
ALTER TABLE "public"."ExternalConnection" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."ProviderEvent" (
  "id" text NOT NULL,
  "tenantId" text,
  "provider" text NOT NULL,
  "kind" text NOT NULL,
  "externalId" text NOT NULL,
  "signatureValid" bool NOT NULL,
  "rawBody" text NOT NULL,
  "headers" jsonb,
  "processedAt" timestamptz,
  "error" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "ProviderEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProviderEvent_tenantId_createdAt_idx" ON "public"."ProviderEvent" ("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProviderEvent_processedAt_idx" ON "public"."ProviderEvent" ("processedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ProviderEvent_provider_externalId_key" ON "public"."ProviderEvent" ("provider", "externalId");
ALTER TABLE "public"."ProviderEvent" ENABLE ROW LEVEL SECURITY;

-- kind: PAYMENT | EINVOICE | MESSAGING | SHIPPING | … ; provider: none | sandbox | nequi | wompi | whatsapp | <proveedor DIAN>. credentialsEnc se cifra con una clave de aplicación (credentialsKeyId permite rotarla).

COMMIT;
