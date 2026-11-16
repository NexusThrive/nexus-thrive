-- Fase D · Operations Center: suscripciones, cobros con comprobante y política de suspensión.
-- Aditivo. Producción no tiene el registro de migraciones de Prisma (prisma_contract):
-- se aplica con psql -1 (una transacción) o en el SQL Editor de Supabase, DESPUÉS de las fases A, B y C.
-- Generado con `prisma db update --dry-run` contra una copia del esquema de producción.
-- Se omiten los "DISABLE ROW LEVEL SECURITY": RLS sigue activo.

CREATE TABLE "public"."BillingPolicy" (
  "graceDays" int4 NOT NULL,
  "id" text NOT NULL,
  "noticeDays" int4 NOT NULL,
  "reminderDays" int4[] NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "BillingPolicy_reminderDays_elem_not_null_5bb4f22d" CHECK (array_position("reminderDays", NULL) IS NULL)
);

CREATE TABLE "public"."Charge" (
  "amountUsdCents" int4 NOT NULL,
  "confirmedAt" timestamptz,
  "confirmedById" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "dueAt" timestamptz NOT NULL,
  "id" text NOT NULL,
  "method" text,
  "notes" text,
  "noticeSentAt" timestamptz,
  "paidAt" timestamptz,
  "periodEnd" timestamptz NOT NULL,
  "periodStart" timestamptz NOT NULL,
  "recordedById" text,
  "reference" text,
  "refundReason" text,
  "refundedAt" timestamptz,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "subscriptionId" text NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "voidReason" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "Charge_status_check_4344c7d5" CHECK ("status" IN ('PENDING', 'PAID', 'VOID', 'REFUNDED'))
);

CREATE TABLE "public"."ChargeEvidence" (
  "byteSize" int4 NOT NULL,
  "chargeId" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "data" bytea NOT NULL,
  "fileName" text NOT NULL,
  "id" text NOT NULL,
  "mimeType" text NOT NULL,
  "sha256" text NOT NULL,
  "uploadedById" text,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."Subscription" (
  "billingCycle" text NOT NULL,
  "cancelReason" text,
  "cancelledAt" timestamptz,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "currentPeriodEnd" timestamptz NOT NULL,
  "currentPeriodStart" timestamptz NOT NULL,
  "id" text NOT NULL,
  "notes" text,
  "plan" text NOT NULL,
  "priceUsdCents" int4 NOT NULL,
  "status" text DEFAULT 'ACTIVE' NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "Subscription_status_check_fc886289" CHECK ("status" IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED'))
);

ALTER TABLE "public"."Charge" ADD CONSTRAINT "Charge_subscriptionId_periodStart_key" UNIQUE ("subscriptionId", "periodStart");

ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_tenantId_key" UNIQUE ("tenantId");

CREATE INDEX "Charge_status_idx_e98638ab" ON "public"."Charge" ("status");

CREATE INDEX "Charge_subscriptionId_idx_edbe96bf" ON "public"."Charge" ("subscriptionId");

CREATE INDEX "Charge_tenantId_idx_c93ed4f1" ON "public"."Charge" ("tenantId");

CREATE INDEX "ChargeEvidence_chargeId_idx_3fcf5f1d" ON "public"."ChargeEvidence" ("chargeId");

ALTER TABLE "public"."Charge"
ADD CONSTRAINT "Charge_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId")
REFERENCES "public"."Subscription" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."ChargeEvidence"
ADD CONSTRAINT "ChargeEvidence_chargeId_fkey"
FOREIGN KEY ("chargeId")
REFERENCES "public"."Charge" ("id")
ON DELETE CASCADE;

-- Las tablas nuevas quedan con RLS activo, como el resto (el servidor usa el rol propietario).
ALTER TABLE "public"."BillingPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Charge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ChargeEvidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Subscription" ENABLE ROW LEVEL SECURITY;
