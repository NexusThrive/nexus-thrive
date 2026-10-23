-- ============================================================================
-- 2026-10-23 · Registro de capacidades y construcción separada de cotizaciones
--             (ADR-0003, ARCH-01; Bloque B, paso 1)
--
-- Equivale a la migración migrations/app/20261023T1532_registro_de_capacidades.
-- Idempotente: se puede correr dos veces. Requiere el archivo anterior
-- (2026-10-23-codigos-a-medida.sql).
--
-- Qué hace:
--   1. "TenantModule"."moduleName" deja de estar limitado por el CHECK del
--      viejo enum: el id se valida en el servidor contra el registro de
--      capacidades (lib/capabilities/registry.ts). Agregar un módulo ya no
--      necesita migración.
--   2. La suite de construcción pasa de "quotes" a "construction" en los
--      negocios constructores, carpinterías y en cualquier negocio que YA
--      tenga obras (no pierde acceso a sus datos). "quotes" queda apagado y
--      PLANNED: la cotización genérica llega con el documento comercial.
--   3. Catálogo de precios y rubros (ModuleSetting, VerticalSetting), planes
--      contratados (Tenant.contractedModules) y códigos (BenefitCode.modules)
--      se actualizan igual.
--
-- ANTES de correrlo, para saber a quién afecta:
--   SELECT t."slug", t."vertical",
--          EXISTS (SELECT 1 FROM "public"."Project" p WHERE p."tenantId" = t."id") AS tiene_obras
--     FROM "public"."TenantModule" tm JOIN "public"."Tenant" t ON t."id" = tm."tenantId"
--    WHERE tm."moduleName" = 'quotes' AND tm."active";
--
-- Correr en el SQL Editor de Supabase ANTES de desplegar la versión que lo trae.
-- ============================================================================

ALTER TABLE "public"."TenantModule" DROP CONSTRAINT IF EXISTS "TenantModule_moduleName_check_e283a8b3";

-- Negocios que pasan a la suite de construcción: constructoras, carpinterías
-- y cualquier negocio que ya tenga obras (no pierde acceso a sus datos).
INSERT INTO "public"."TenantModule" ("id", "tenantId", "moduleName", "active", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, tm."tenantId", 'construction', tm."active", now(), now()
  FROM "public"."TenantModule" tm
  JOIN "public"."Tenant" t ON t."id" = tm."tenantId"
 WHERE tm."moduleName" = 'quotes'
   AND (t."vertical" IN ('construction', 'carpentry')
        OR EXISTS (SELECT 1 FROM "public"."Project" p WHERE p."tenantId" = tm."tenantId"))
ON CONFLICT ("tenantId", "moduleName") DO NOTHING;

UPDATE "public"."TenantModule" SET "active" = false, "updatedAt" = now() WHERE "moduleName" = 'quotes' AND "active";

UPDATE "public"."Tenant" t
   SET "contractedModules" = array_replace(t."contractedModules", 'quotes', 'construction')
 WHERE 'quotes' = ANY(t."contractedModules")
   AND (t."vertical" IN ('construction', 'carpentry')
        OR EXISTS (SELECT 1 FROM "public"."Project" p WHERE p."tenantId" = t."id"));

UPDATE "public"."Tenant" SET "contractedModules" = array_remove("contractedModules", 'quotes') WHERE 'quotes' = ANY("contractedModules");

-- Catálogo: la suite hereda precio, inclusión y orden de "quotes", y "quotes"
-- queda planeado (la cotización genérica llega con el documento comercial).
INSERT INTO "public"."ModuleSetting" ("module", "label", "description", "priceUsdCents", "status", "included", "order", "updatedAt")
SELECT 'construction', 'Obras y presupuestos', 'Obras, presupuestos y catálogo APU.', "priceUsdCents", 'READY', "included", "order", now()
  FROM "public"."ModuleSetting" WHERE "module" = 'quotes'
ON CONFLICT ("module") DO NOTHING;

UPDATE "public"."ModuleSetting" SET "status" = 'PLANNED', "label" = 'Cotizaciones', "description" = 'Cotizaciones comerciales con tu catálogo (próximamente).', "updatedAt" = now() WHERE "module" = 'quotes';

UPDATE "public"."VerticalSetting"
   SET "modules" = array_replace("modules", 'quotes', 'construction'),
       "recommended" = array_replace("recommended", 'quotes', 'construction'),
       "updatedAt" = now()
 WHERE "vertical" IN ('construction', 'carpentry');

UPDATE "public"."VerticalSetting"
   SET "modules" = array_remove("modules", 'quotes'), "recommended" = array_remove("recommended", 'quotes'), "updatedAt" = now()
 WHERE "vertical" NOT IN ('construction', 'carpentry') AND ('quotes' = ANY("modules") OR 'quotes' = ANY("recommended"));

UPDATE "public"."BenefitCode" SET "modules" = array_replace("modules", 'quotes', 'construction') WHERE 'quotes' = ANY("modules");


-- Comprobación: debe devolver 0.
SELECT count(*) AS quotes_activos FROM "public"."TenantModule" WHERE "moduleName" = 'quotes' AND "active";
