-- Inventario · relleno de datos (PR-10). Correr DESPUÉS de 2026-10-24-inventario-bodegas-kardex.sql.
--
-- Crea la bodega «Principal» de cada negocio que tenga productos con control de
-- inventario y deja el saldo actual de cada producto como existencias de esa
-- bodega (costo promedio = el costo del producto, o 0 si no tiene).
-- Idempotente: no repite bodegas ni existencias. No modifica Product.stock ni
-- los movimientos anteriores (quedan sin saldo/costo en el kardex).

BEGIN;

INSERT INTO "public"."Warehouse" ("id", "tenantId", "name", "isDefault", "active", "updatedAt")
SELECT gen_random_uuid()::text, t."tenantId", 'Principal', true, true, now()
FROM (SELECT DISTINCT "tenantId" FROM "public"."Product" WHERE "trackStock" = true) t
WHERE NOT EXISTS (SELECT 1 FROM "public"."Warehouse" w WHERE w."tenantId" = t."tenantId" AND w."isDefault" = true)
ON CONFLICT DO NOTHING;

INSERT INTO "public"."StockLevel" ("id", "tenantId", "warehouseId", "productId", "quantity", "avgCost", "updatedAt")
SELECT gen_random_uuid()::text, p."tenantId", w."id", p."id", greatest(p."stock", 0), coalesce(p."cost", 0), now()
FROM "public"."Product" p
JOIN "public"."Warehouse" w ON w."tenantId" = p."tenantId" AND w."isDefault" = true
WHERE p."trackStock" = true
  AND NOT EXISTS (SELECT 1 FROM "public"."StockLevel" l WHERE l."productId" = p."id")
ON CONFLICT DO NOTHING;

COMMIT;

-- Verificación (debe dar 0): productos con inventario sin existencias en bodega.
-- SELECT count(*) FROM "public"."Product" p WHERE p."trackStock" AND NOT EXISTS (SELECT 1 FROM "public"."StockLevel" l WHERE l."productId" = p."id");
