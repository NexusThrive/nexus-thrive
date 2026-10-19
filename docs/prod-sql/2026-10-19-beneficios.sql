-- ============================================================================
-- NEXUS THRIVE · Accesos (códigos de acceso a la plataforma)
-- ============================================================================
-- Qué crea:
--   public.BenefitCode      → los códigos (de tarjeta NFC/QR y de acceso pagado)
--   public.BenefitRedemption → los canjes (un negocio × un código)
--
-- Dos tipos de código:
--   kind = 'PROMO' → regalo/promoción. Quien lo reclama ve "N días gratis".
--   kind = 'PAID'  → acceso pagado ya confirmado por NEXUS. Quien lo usa ve
--                     "cuenta activada" (NUNCA "gratis", porque ya se pagó).
--
-- Cómo se usa:
--   1. Ejecutar este archivo en el SQL Editor de Supabase ANTES de publicar
--      el código en main.
--   2. El QR fijo de las tarjetas apunta a {base}/c/ELITE30: es un código
--      PROMO, ilimitado. NUNCA cambia (rompería las tarjetas impresas).
--   3. Los accesos pagados se emiten desde el panel → Accesos
--      (/admin/beneficios), después de confirmar el pago por WhatsApp.
--
-- Aditivo: no toca datos existentes. Es idempotente: se puede volver a
-- ejecutar sin romper nada.
-- Se omiten los "DISABLE ROW LEVEL SECURITY": RLS sigue activo en las tablas.
-- ============================================================================
BEGIN;

-- ===================== Tablas =====================

CREATE TABLE IF NOT EXISTS "public"."BenefitCode" (
  "active" bool DEFAULT true NOT NULL,
  "code" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "durationDays" int4 DEFAULT 30 NOT NULL,
  "expiresAt" timestamptz,
  "id" text NOT NULL,
  "kind" text DEFAULT 'PROMO' NOT NULL,
  "label" text NOT NULL,
  "maxUses" int4,
  "notes" text,
  "plan" text DEFAULT 'ELITE' NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "usedCount" int4 DEFAULT 0 NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "BenefitCode_kind_check_af337109" CHECK ("kind" IN ('PROMO', 'PAID')),
  CONSTRAINT "BenefitCode_plan_check_f1a20b28" CHECK ("plan" IN ('ESSENTIAL', 'ELITE', 'SIGNATURE'))
);

CREATE TABLE IF NOT EXISTS "public"."BenefitRedemption" (
  "clerkUserId" text,
  "codeId" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "durationDays" int4 NOT NULL,
  "email" text,
  "endsAt" timestamptz NOT NULL,
  "id" text NOT NULL,
  "kind" text DEFAULT 'PROMO' NOT NULL,
  "plan" text NOT NULL,
  "startsAt" timestamptz NOT NULL,
  "tenantId" text NOT NULL,
  "tenantName" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "BenefitRedemption_kind_check_af337109" CHECK ("kind" IN ('PROMO', 'PAID'))
);

-- ===================== Restricciones e índices =====================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BenefitCode_code_key'
  ) THEN
    ALTER TABLE "public"."BenefitCode" ADD CONSTRAINT "BenefitCode_code_key" UNIQUE ("code");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BenefitRedemption_codeId_tenantId_key'
  ) THEN
    ALTER TABLE "public"."BenefitRedemption"
      ADD CONSTRAINT "BenefitRedemption_codeId_tenantId_key" UNIQUE ("codeId", "tenantId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'BenefitCode_active_idx_8af4daed'
  ) THEN
    CREATE INDEX "BenefitCode_active_idx_8af4daed" ON "public"."BenefitCode" ("active");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'BenefitRedemption_codeId_idx_f2336e15'
  ) THEN
    CREATE INDEX "BenefitRedemption_codeId_idx_f2336e15" ON "public"."BenefitRedemption" ("codeId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'BenefitRedemption_tenantId_idx_c93ed4f1'
  ) THEN
    CREATE INDEX "BenefitRedemption_tenantId_idx_c93ed4f1" ON "public"."BenefitRedemption" ("tenantId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BenefitRedemption_codeId_fkey'
  ) THEN
    ALTER TABLE "public"."BenefitRedemption"
      ADD CONSTRAINT "BenefitRedemption_codeId_fkey"
      FOREIGN KEY ("codeId") REFERENCES "public"."BenefitCode" ("id") ON DELETE CASCADE;
  END IF;
END $$;

-- ===================== Columna "kind" (si la tabla ya existía) =====================
-- Si corriste una versión anterior de este archivo (sin "kind"), esto agrega
-- la columna y su restricción sin perder los códigos que ya tenías.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'BenefitCode'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'BenefitCode' AND column_name = 'kind'
  ) THEN
    ALTER TABLE "public"."BenefitCode" ADD COLUMN "kind" text DEFAULT 'PROMO' NOT NULL;
    ALTER TABLE "public"."BenefitCode"
      ADD CONSTRAINT "BenefitCode_kind_check_af337109" CHECK ("kind" IN ('PROMO', 'PAID'));
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'BenefitRedemption'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'BenefitRedemption' AND column_name = 'kind'
  ) THEN
    ALTER TABLE "public"."BenefitRedemption" ADD COLUMN "kind" text DEFAULT 'PROMO' NOT NULL;
    ALTER TABLE "public"."BenefitRedemption"
      ADD CONSTRAINT "BenefitRedemption_kind_check_af337109" CHECK ("kind" IN ('PROMO', 'PAID'));
  END IF;
END $$;

-- ===================== Código del QR fijo =====================
-- QR impreso en las tarjetas apunta siempre a {base}/c/ELITE30. Es un código
-- PROMO (gratis) e ilimitado. Idempotente: desde el panel se edita (membresía,
-- días, usos) o se pausa, pero el código NUNCA cambia (rompería las tarjetas ya
-- impresas).
INSERT INTO "public"."BenefitCode"
  ("id","code","label","plan","kind","durationDays","maxUses","active","notes","updatedAt")
VALUES
  ('benefit-code-elite30','ELITE30','Mes gratis Elite (QR fijo)','ELITE','PROMO',30,NULL,true,
   'Código del QR impreso. No cambiar el código.', now())
ON CONFLICT ("code") DO NOTHING;

-- ===================== Accesos pagados ya emitidos =====================
-- Si ya habías emitido códigos de pago antes de esta migración, quedan como
-- PROMO (gratis). Cámbialos a PAID con su plan y días reales:
-- UPDATE "public"."BenefitCode" SET "kind" = 'PAID' WHERE "code" = 'XXXX';

-- ===================== Row Level Security =====================

ALTER TABLE "public"."BenefitCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."BenefitRedemption" ENABLE ROW LEVEL SECURITY;
COMMIT;
