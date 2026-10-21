-- ============================================================================
-- NEXUS THRIVE · Invitaciones al equipo de NEXUS
-- ============================================================================
-- Tabla de invitaciones: un enlace de un solo uso que ata una cuenta de Clerk
-- concreta a la ficha del integrante del equipo. Así el alta deja de
-- depender de que la persona se registre con el mismo correo.
--
-- Cambio aditivo e idempotente: solo crea una tabla y sus índices.
--
-- Ejecutar en el SQL Editor de Supabase ANTES de usar "Enlace de invitación"
-- en Operaciones Center → Equipo.
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS "public"."StaffInvite" (
  "id" text NOT NULL,
  "token" text NOT NULL,
  "email" text NOT NULL,
  "roleId" text NOT NULL,
  "createdById" text,
  "expiresAt" timestamptz NOT NULL,
  "usedAt" timestamptz,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "StaffInvite_token_key" UNIQUE ("token")
);

CREATE INDEX IF NOT EXISTS "StaffInvite_email_idx_46df9cad" ON "public"."StaffInvite" ("email");
CREATE INDEX IF NOT EXISTS "StaffInvite_roleId_idx_ffccc9a4" ON "public"."StaffInvite" ("roleId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StaffInvite_roleId_fkey'
  ) THEN
    ALTER TABLE "public"."StaffInvite"
      ADD CONSTRAINT "StaffInvite_roleId_fkey"
      FOREIGN KEY ("roleId") REFERENCES "public"."StaffRole" ("id");
  END IF;
END $$;

-- ===================== Comprobación =====================
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'StaffInvite'
 ORDER BY ordinal_position;

COMMIT;
