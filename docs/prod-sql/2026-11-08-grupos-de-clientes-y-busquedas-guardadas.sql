-- ============================================================================
-- 2026-11-08 · Grupos propios de clientes y búsquedas guardadas (favoritos)
--
-- Aditivo e idempotente. Migración de origen:
-- migrations/app/20261108T1409_grupos_de_clientes_y_busquedas_guardadas
--
--  1. «CustomerGroup»: grupo que arma el negocio a mano («Clientes VIP»), con nombre único por negocio e icono.
--  2. «CustomerGroupMember»: qué cliente está en qué grupo (se borra con el grupo o con el cliente).
--  3. «SavedSearch»: búsqueda guardada de una lista, por usuario y por sección; una puede ser la predeterminada.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."CustomerGroup" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "icon" text DEFAULT 'users' NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."CustomerGroupMember" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "customerId" text NOT NULL,
  "groupId" text NOT NULL,
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."SavedSearch" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "isDefault" bool DEFAULT false NOT NULL,
  "name" text NOT NULL,
  "params" json NOT NULL,
  "section" text NOT NULL,
  "tenantId" text NOT NULL,
  "userId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerGroup_tenantId_name_key" ON "public"."CustomerGroup" ("tenantId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerGroupMember_groupId_customerId_key" ON "public"."CustomerGroupMember" ("groupId", "customerId");
CREATE INDEX IF NOT EXISTS "CustomerGroup_tenantId_idx_c93ed4f1" ON "public"."CustomerGroup" ("tenantId");
CREATE INDEX IF NOT EXISTS "CustomerGroupMember_customerId_idx_b2a8a46c" ON "public"."CustomerGroupMember" ("customerId");
CREATE INDEX IF NOT EXISTS "CustomerGroupMember_groupId_idx_e2fb5578" ON "public"."CustomerGroupMember" ("groupId");
CREATE INDEX IF NOT EXISTS "CustomerGroupMember_tenantId_customerId_idx_302ad259" ON "public"."CustomerGroupMember" ("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "CustomerGroupMember_tenantId_idx_c93ed4f1" ON "public"."CustomerGroupMember" ("tenantId");
CREATE INDEX IF NOT EXISTS "SavedSearch_tenantId_idx_c93ed4f1" ON "public"."SavedSearch" ("tenantId");
CREATE INDEX IF NOT EXISTS "SavedSearch_tenantId_userId_section_idx_61107353" ON "public"."SavedSearch" ("tenantId", "userId", "section");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerGroup_tenantId_fkey') THEN
    ALTER TABLE "public"."CustomerGroup" ADD CONSTRAINT "CustomerGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerGroupMember_tenantId_fkey') THEN
    ALTER TABLE "public"."CustomerGroupMember" ADD CONSTRAINT "CustomerGroupMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerGroupMember_groupId_fkey') THEN
    ALTER TABLE "public"."CustomerGroupMember" ADD CONSTRAINT "CustomerGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."CustomerGroup" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerGroupMember_customerId_fkey') THEN
    ALTER TABLE "public"."CustomerGroupMember" ADD CONSTRAINT "CustomerGroupMember_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer" ("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SavedSearch_tenantId_fkey') THEN
    ALTER TABLE "public"."SavedSearch" ADD CONSTRAINT "SavedSearch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "public"."CustomerGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CustomerGroupMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SavedSearch" ENABLE ROW LEVEL SECURITY;

COMMIT;
