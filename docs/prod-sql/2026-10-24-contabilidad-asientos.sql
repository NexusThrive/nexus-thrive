-- ============================================================================
-- 2026-10-24 · Contabilidad II: asientos y partida doble
--
-- Equivale a la migración migrations/app/20261024T1251_contabilidad_asientos.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."JournalEntry" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "date" text NOT NULL,
  "description" text NOT NULL,
  "event" text NOT NULL,
  "hash" text NOT NULL,
  "id" text NOT NULL,
  "number" int4 NOT NULL,
  "reversalOfId" text,
  "sourceId" text,
  "sourceType" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."JournalLine" (
  "accountCode" text NOT NULL,
  "costCenterId" text,
  "credit" numeric DEFAULT '0'::numeric NOT NULL,
  "debit" numeric DEFAULT '0'::numeric NOT NULL,
  "entryId" text NOT NULL,
  "id" text NOT NULL,
  "label" text,
  "partyId" text,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."Tenant" ADD COLUMN "accountingEnabled" bool DEFAULT false NOT NULL;

ALTER TABLE "public"."JournalEntry" ADD CONSTRAINT "JournalEntry_tenantId_number_key" UNIQUE ("tenantId", "number");

CREATE INDEX "JournalEntry_tenantId_date_idx_3ef944c7" ON "public"."JournalEntry" ("tenantId", "date");

CREATE INDEX "JournalEntry_tenantId_idx_c93ed4f1" ON "public"."JournalEntry" ("tenantId");

CREATE INDEX "JournalEntry_tenantId_sourceType_sourceId_idx_7db9b1c3" ON "public"."JournalEntry" ("tenantId", "sourceType", "sourceId");

CREATE INDEX "JournalLine_entryId_idx_8b42d1db" ON "public"."JournalLine" ("entryId");

CREATE INDEX "JournalLine_tenantId_accountCode_idx_d8899099" ON "public"."JournalLine" ("tenantId", "accountCode");

CREATE INDEX "JournalLine_tenantId_idx_c93ed4f1" ON "public"."JournalLine" ("tenantId");

ALTER TABLE "public"."JournalEntry"
ADD CONSTRAINT "JournalEntry_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."JournalLine"
ADD CONSTRAINT "JournalLine_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."JournalLine"
ADD CONSTRAINT "JournalLine_entryId_fkey"
FOREIGN KEY ("entryId")
REFERENCES "public"."JournalEntry" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."JournalEntry" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."JournalLine" ENABLE ROW LEVEL SECURITY;

COMMIT;
