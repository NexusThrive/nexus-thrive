-- Fase A · Operations Center: equipo, roles, contactos y etapa de cuenta.
-- Aditivo. Producción no tiene el registro de migraciones de Prisma (prisma_contract):
-- se aplica con psql -1 (una transacción) o en el SQL Editor de Supabase.
-- Generado con `prisma db update --dry-run` contra una copia del esquema de producción.

CREATE TABLE "public"."StaffMember" (
  "active" bool DEFAULT true NOT NULL,
  "clerkUserId" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "email" text NOT NULL,
  "id" text NOT NULL,
  "invitedById" text,
  "joinedAt" timestamptz,
  "lastSeenAt" timestamptz,
  "name" text,
  "roleId" text NOT NULL,
  "title" text,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."StaffRole" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "description" text,
  "id" text NOT NULL,
  "key" text NOT NULL,
  "name" text NOT NULL,
  "permissions" text[] NOT NULL,
  "system" bool DEFAULT false NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "StaffRole_permissions_elem_not_null_318e2952" CHECK (array_position("permissions", NULL) IS NULL)
);

CREATE TABLE "public"."TenantContact" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "email" text,
  "hours" text,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "notes" text,
  "phone" text,
  "preferredChannel" text,
  "purpose" text NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "whatsapp" text,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."Tenant" ADD COLUMN "accountManagerId" text;

ALTER TABLE "public"."Tenant" ADD COLUMN "accountStage" text DEFAULT 'ACTIVE' NOT NULL;

ALTER TABLE "public"."StaffMember" ADD CONSTRAINT "StaffMember_clerkUserId_key" UNIQUE ("clerkUserId");

ALTER TABLE "public"."StaffMember" ADD CONSTRAINT "StaffMember_email_key" UNIQUE ("email");

ALTER TABLE "public"."StaffRole" ADD CONSTRAINT "StaffRole_key_key" UNIQUE ("key");

ALTER TABLE "public"."Tenant" ADD CONSTRAINT "Tenant_accountStage_check_8f6f0190" CHECK ("accountStage" IN ('ONBOARDING', 'ACTIVE', 'CANCELLED', 'ARCHIVED'));

CREATE INDEX "StaffMember_roleId_idx_ffccc9a4" ON "public"."StaffMember" ("roleId");

CREATE INDEX "TenantContact_tenantId_idx_c93ed4f1" ON "public"."TenantContact" ("tenantId");

ALTER TABLE "public"."StaffMember"
ADD CONSTRAINT "StaffMember_roleId_fkey"
FOREIGN KEY ("roleId")
REFERENCES "public"."StaffRole" ("id");

-- Supabase: las tablas nuevas con seguridad por filas, como las existentes.
ALTER TABLE "public"."StaffMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."StaffRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TenantContact" ENABLE ROW LEVEL SECURITY;
