-- ============================================================================
-- 2026-10-24 · Punto de venta: terminales y propina
--
-- Equivale a la migración migrations/app/20261024T1134_pos_terminales.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

CREATE TABLE "public"."PosTerminal" (
  "active" bool DEFAULT true NOT NULL,
  "boxId" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "tenantId" text NOT NULL,
  "warehouseId" text,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."CashSession" ADD COLUMN "terminalId" text;

ALTER TABLE "public"."Invoice" ADD COLUMN "tipTotal" numeric DEFAULT '0'::numeric NOT NULL;

CREATE INDEX "PosTerminal_tenantId_idx_c93ed4f1" ON "public"."PosTerminal" ("tenantId");

ALTER TABLE "public"."PosTerminal"
ADD CONSTRAINT "PosTerminal_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."PosTerminal" ENABLE ROW LEVEL SECURITY;

COMMIT;
