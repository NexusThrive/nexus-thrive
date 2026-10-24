-- ============================================================================
-- 2026-10-24 · Existencias: llave única por bodega, producto y variante (PR-10)
--
-- Equivale a la migración migrations/app/20261024T0323_existencias_llave_unica.
-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas
-- sentencias, mismo orden. Aditivo.
--
-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`
-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).
-- ============================================================================

BEGIN;

DROP INDEX "public"."StockLevel_product_key_d6b3c447";

DROP INDEX "public"."StockLevel_variant_key_666fadbc";

ALTER TABLE "public"."StockLevel" ADD COLUMN "variantKey" text DEFAULT '' NOT NULL;

ALTER TABLE "public"."StockLevel" ADD CONSTRAINT "StockLevel_warehouseId_productId_variantKey_key" UNIQUE ("warehouseId", "productId", "variantKey");

COMMIT;
