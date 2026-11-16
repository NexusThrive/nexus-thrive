-- ============================================================================
-- 2026-10-24 · Perfil general: rubro «general», modelo comercial y actividad (Etapa B)
--
-- Equivale a la migración migrations/app/20261024T0509_perfil_general.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

ALTER TABLE "public"."Tenant" DROP CONSTRAINT "Tenant_vertical_check_7ca0b77e";

ALTER TABLE "public"."Tenant" ADD COLUMN "activity" text;

ALTER TABLE "public"."Tenant" ADD COLUMN "businessModels" text[];

ALTER TABLE "public"."Tenant" ADD CONSTRAINT "Tenant_businessModels_elem_not_null_de2f8db1" CHECK (array_position("businessModels", NULL) IS NULL);

ALTER TABLE "public"."Tenant" ADD CONSTRAINT "Tenant_vertical_check_1e2766aa" CHECK ("vertical" IN ('gym', 'tourism_agency', 'hospitality', 'construction', 'carpentry', 'restaurant', 'retail', 'beauty', 'healthcare', 'mechanic', 'education', 'real_estate', 'hardware_store', 'nautical_transport', 'tour_guides', 'events', 'museum', 'general'));

COMMIT;
