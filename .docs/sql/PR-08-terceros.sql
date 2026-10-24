-- ============================================================================
-- PR-08-terceros · Tercero único mínimo
-- PR-08 de .docs/hoja-de-ruta-implementacion.md
--
-- BORRADOR DE DISEÑO PARA REVISAR, no para correr. La migración real sale de
-- editar prisma/contract.prisma y ejecutar `prisma migration plan` (ver la
-- hoja de ruta, «Cómo se migra»). Este archivo fija las tablas, las columnas, las
-- llaves y los índices que esa edición debe producir. Aditivo e idempotente.
--
-- Party: la persona o empresa una sola vez, con los datos que pide la DIAN. Los roles
-- (cliente, proveedor, empleado, contacto) cuelgan de ella. Customer se enlaza por partyId.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."Party" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "kind" text DEFAULT 'PERSON' NOT NULL,
  "documentType" text,
  "documentNumber" text,
  "checkDigit" text,
  "legalName" text NOT NULL,
  "tradeName" text,
  "email" text,
  "phone" text,
  "taxRegime" text,
  "fiscalResponsibilities" text[] DEFAULT '{}' NOT NULL,
  "addressLine" text,
  "city" text,
  "cityCode" text,
  "departmentCode" text,
  "countryCode" text DEFAULT 'CO' NOT NULL,
  "active" bool DEFAULT true NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "Party_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "Party_check_1" CHECK ("kind" IN ('PERSON','COMPANY'))
);
CREATE INDEX IF NOT EXISTS "Party_tenantId_legalName_idx" ON "public"."Party" ("tenantId", "legalName");
CREATE UNIQUE INDEX IF NOT EXISTS "Party_doc_key" ON "public"."Party" ("tenantId", "documentType", "documentNumber") WHERE "documentNumber" IS NOT NULL;
ALTER TABLE "public"."Party" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."PartyRole" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "partyId" text NOT NULL,
  "role" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "PartyRole_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "PartyRole_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "public"."Party" ("id") ON DELETE CASCADE,
  CONSTRAINT "PartyRole_check_1" CHECK ("role" IN ('CUSTOMER','SUPPLIER','EMPLOYEE','CONTACT'))
);
CREATE INDEX IF NOT EXISTS "PartyRole_tenantId_role_idx" ON "public"."PartyRole" ("tenantId", "role");
CREATE UNIQUE INDEX IF NOT EXISTS "PartyRole_partyId_role_key" ON "public"."PartyRole" ("partyId", "role");
ALTER TABLE "public"."PartyRole" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."Customer" ADD COLUMN IF NOT EXISTS "partyId" text;
CREATE INDEX IF NOT EXISTS "Customer_partyId_idx" ON "public"."Customer" ("partyId");

-- Relleno inicial (migración de datos, idempotente): por cada Customer sin partyId se crea su Party (documentType/Number desde documentId) y el rol CUSTOMER. Documentos DIAN: CC, NIT, CE, PASAPORTE, TI, RC, NIT extranjero.

COMMIT;
