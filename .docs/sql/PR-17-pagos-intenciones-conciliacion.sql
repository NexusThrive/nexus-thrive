-- ============================================================================
-- PR-17-pagos-intenciones-conciliacion · Pagos: intención de cobro, reembolsos y conciliación
-- PR-17 de .docs/hoja-de-ruta-implementacion.md
--
-- BORRADOR DE DISEÑO PARA REVISAR, no para correr. La migración real sale de
-- editar prisma/contract.prisma y ejecutar `prisma migration plan` (ver la
-- hoja de ruta, «Cómo se migra»). Este archivo fija las tablas, las columnas, las
-- llaves y los índices que esa edición debe producir. Aditivo e idempotente.
--
-- PaymentIntent es el cobro ANTES de que exista el pago (enlace, QR, checkout); solo al
-- confirmar el proveedor se registra el Payment. Reconciliation compara lo del proveedor
-- con lo registrado. Los webhooks entrantes se guardan en ProviderEvent (PR-06).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."PaymentIntent" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "reference" text NOT NULL,
  "amount" numeric NOT NULL,
  "currency" text DEFAULT 'COP' NOT NULL,
  "provider" text NOT NULL,
  "method" text,
  "status" text DEFAULT 'CREATED' NOT NULL,
  "invoiceId" text,
  "customerId" text,
  "checkoutUrl" text,
  "providerRef" text,
  "expiresAt" timestamptz,
  "paymentId" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "PaymentIntent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "PaymentIntent_check_1" CHECK ("amount" > 0),
  CONSTRAINT "PaymentIntent_check_2" CHECK ("status" IN ('CREATED','PENDING','CONFIRMED','FAILED','EXPIRED','CANCELED'))
);
CREATE INDEX IF NOT EXISTS "PaymentIntent_tenantId_status_idx" ON "public"."PaymentIntent" ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "PaymentIntent_providerRef_idx" ON "public"."PaymentIntent" ("providerRef");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentIntent_tenantId_reference_key" ON "public"."PaymentIntent" ("tenantId", "reference");
ALTER TABLE "public"."PaymentIntent" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."PaymentRefund" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "paymentId" text NOT NULL,
  "amount" numeric NOT NULL,
  "reason" text NOT NULL,
  "providerRef" text,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "createdById" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "PaymentRefund_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "PaymentRefund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment" ("id") ON DELETE RESTRICT,
  CONSTRAINT "PaymentRefund_check_1" CHECK ("amount" > 0)
);
CREATE INDEX IF NOT EXISTS "PaymentRefund_paymentId_idx" ON "public"."PaymentRefund" ("paymentId");
ALTER TABLE "public"."PaymentRefund" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."Reconciliation" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "provider" text NOT NULL,
  "periodFrom" date NOT NULL,
  "periodTo" date NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "closedAt" timestamptz,
  PRIMARY KEY ("id"),
  CONSTRAINT "Reconciliation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Reconciliation_tenantId_provider_periodFrom_idx" ON "public"."Reconciliation" ("tenantId", "provider", "periodFrom");
ALTER TABLE "public"."Reconciliation" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."ReconciliationItem" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "reconciliationId" text NOT NULL,
  "providerRef" text NOT NULL,
  "providerAmount" numeric NOT NULL,
  "providerStatus" text,
  "paymentId" text,
  "diffKind" text NOT NULL,
  "resolvedAt" timestamptz,
  "resolvedById" text,
  "note" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "ReconciliationItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "ReconciliationItem_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "public"."Reconciliation" ("id") ON DELETE CASCADE,
  CONSTRAINT "ReconciliationItem_check_1" CHECK ("diffKind" IN ('MATCHED','MISSING_IN_NEXUS','MISSING_IN_PROVIDER','AMOUNT_DIFF'))
);
CREATE INDEX IF NOT EXISTS "ReconciliationItem_reconciliation_diffKind_idx" ON "public"."ReconciliationItem" ("reconciliationId", "diffKind");
ALTER TABLE "public"."ReconciliationItem" ENABLE ROW LEVEL SECURITY;

-- Confirmar una intención y registrar el Payment ocurren juntos en money-service, idempotentes por (provider, externalId) de ProviderEvent. La conciliación nunca corrige datos sola: deja diferencias a revisión.

COMMIT;
