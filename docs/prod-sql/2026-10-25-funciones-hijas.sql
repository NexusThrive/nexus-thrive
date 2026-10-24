-- ============================================================================
-- 2026-10-25 · Funciones separadas por categoría (solo DATOS, sin cambios de esquema)
--
-- Punto de venta y Cobros en línea salen de «Pagos»; Cartera, Contabilidad e
-- Impuestos y numeración salen de «Finanzas»; Factura electrónica sale de
-- «Facturación»; Sitio y tienda, Ficha de Google y Campañas y reseñas salen de
-- «Catálogo e inventario». Para que ningún negocio pierda pantallas, cada uno
-- recibe encendidas las funciones hijas de las que ya tenía encendidas.
-- Idempotente: no toca filas que ya existen. Los negocios nuevos las traen en sus recetas.
-- ============================================================================

BEGIN;

INSERT INTO "TenantModule" (id, "tenantId", "moduleName", active, "updatedAt")
SELECT gen_random_uuid()::text, p."tenantId", c.child, true, now()
FROM "TenantModule" p
JOIN (VALUES
  ('payments', 'pos'),
  ('payments', 'online_payments'),
  ('billing', 'einvoicing'),
  ('finance', 'receivables'),
  ('finance', 'accounting'),
  ('finance', 'taxes'),
  ('inventory', 'website'),
  ('inventory', 'google'),
  ('inventory', 'growth')
) AS c(parent, child) ON c.parent = p."moduleName"
WHERE p.active
ON CONFLICT ("tenantId", "moduleName") DO NOTHING;

-- Las recetas guardadas por rubro (Planes y módulos) también reciben las hijas de las funciones que ya traían.
UPDATE "VerticalSetting" v
SET modules = (SELECT array_agg(DISTINCT m) FROM unnest(v.modules || ARRAY(
  SELECT c.child FROM (VALUES
    ('payments', 'pos'), ('payments', 'online_payments'), ('billing', 'einvoicing'),
    ('finance', 'receivables'), ('finance', 'accounting'), ('finance', 'taxes'),
    ('inventory', 'website'), ('inventory', 'google'), ('inventory', 'growth')
  ) AS c(parent, child) WHERE c.parent = ANY(v.modules)
)) AS m)
WHERE EXISTS (SELECT 1 FROM unnest(v.modules) x WHERE x IN ('payments', 'billing', 'finance', 'inventory'));

COMMIT;
