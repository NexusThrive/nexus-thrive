-- ============================================================================
-- 2026-10-24 · Tercero único: Party y PartyRole (PR-08)
--
-- Equivale a la migración migrations/app/20261024T0241_tercero_unico.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."Party" (
  "active" bool DEFAULT true NOT NULL,
  "addressLine" text,
  "checkDigit" text,
  "city" text,
  "countryCode" text DEFAULT 'CO' NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "documentNumber" text,
  "documentType" text,
  "email" text,
  "id" text NOT NULL,
  "kind" text DEFAULT 'PERSON' NOT NULL,
  "legalName" text NOT NULL,
  "phone" text,
  "tenantId" text NOT NULL,
  "tradeName" text,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."PartyRole" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "partyId" text NOT NULL,
  "role" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."Customer" ADD COLUMN "partyId" text;

ALTER TABLE "public"."PartyRole" ADD CONSTRAINT "PartyRole_partyId_role_key" UNIQUE ("partyId", "role");

CREATE INDEX "Customer_partyId_idx_e302b09d" ON "public"."Customer" ("partyId");

CREATE UNIQUE INDEX "Party_tenantId_documentNumber_key_d762dd04" ON "public"."Party" ("tenantId", "documentNumber") WHERE ("documentNumber" IS NOT NULL);

CREATE INDEX "Party_tenantId_idx_c93ed4f1" ON "public"."Party" ("tenantId");

CREATE INDEX "Party_tenantId_legalName_idx_d26d9111" ON "public"."Party" ("tenantId", "legalName");

CREATE INDEX "PartyRole_partyId_idx_e302b09d" ON "public"."PartyRole" ("partyId");

CREATE INDEX "PartyRole_tenantId_idx_c93ed4f1" ON "public"."PartyRole" ("tenantId");

CREATE INDEX "PartyRole_tenantId_role_idx_c3ec5d48" ON "public"."PartyRole" ("tenantId", "role");

ALTER TABLE "public"."Party"
ADD CONSTRAINT "Party_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."Customer"
ADD CONSTRAINT "Customer_partyId_fkey"
FOREIGN KEY ("partyId")
REFERENCES "public"."Party" ("id")
ON DELETE SET NULL;

ALTER TABLE "public"."PartyRole"
ADD CONSTRAINT "PartyRole_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."PartyRole"
ADD CONSTRAINT "PartyRole_partyId_fkey"
FOREIGN KEY ("partyId")
REFERENCES "public"."Party" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."Party" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."PartyRole" ENABLE ROW LEVEL SECURITY;

COMMIT;
