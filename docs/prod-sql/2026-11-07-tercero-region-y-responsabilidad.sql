-- 2026-11-07 · Departamento y responsabilidad fiscal del tercero (alta de cliente completa).
-- Aditivo e idempotente. Migración: migrations/app/20261107T1806_tercero_region_y_responsabilidad
BEGIN;
ALTER TABLE "public"."Party" ADD COLUMN IF NOT EXISTS "region" text;
ALTER TABLE "public"."Party" ADD COLUMN IF NOT EXISTS "taxResponsibility" text;
COMMIT;
