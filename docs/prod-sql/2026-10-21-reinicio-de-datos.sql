-- ============================================================================
-- NEXUS THRIVE · Reinicio de datos (la base queda como nueva)
-- ============================================================================
-- Vacía TODAS las tablas de datos sin tocar el esquema: se conservan las
-- tablas, las columnas, los índices, las claves foráneas, las políticas de RLS
-- y las funciones.
--
-- SE VACÍA (todo lo que es de negocio):
--   negocios, usuarios de negocio, clientes, membresías, asistencia, dinero
--   (caja, pagos, facturas, gastos), accesos (códigos promo y de pago),
--   proyectos y catálogo APU, agenda, tickets, leads, CRM, presencia, etc.
--
-- SE CONSERVA (a propósito, y por esto el script no es "vaciar todo"):
--   - StaffRole: los roles del panel (Propietario, Finanzas, Comercial,
--     Soporte, Técnico). Si se borran, no hay a quién darle permisos.
--   - StaffMember: el equipo de NEXUS. Si se borra, NADIE puede entrar al
--     panel: el arranque automático (lib/ops/access.ts) necesita al
--     SUPERADMIN heredado de la tabla User, y esa tabla sí se vacía.
--   - PlanSetting, ModuleSetting, VerticalSetting, CustomerTierSetting: el
--     catálogo comercial (se vuelve a sembrar solo, pero no hace falta).
--   - AuditLog: la trazabilidad de lo que se hizo en el panel.
--
-- Es idempotente: se puede correr las veces que sea.
--
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================================
BEGIN;

-- Se listan las tablas de datos que se vacían (todo menos lo que se conserva).
DO $$
DECLARE
  t   text;
  n   int;
  lista text;
BEGIN
  SELECT string_agg(format('%I', tablename), ', ' ORDER BY tablename)
    INTO lista
    FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename NOT IN (
       'StaffRole',            -- roles del panel
       'StaffMember',          -- equipo de NEXUS (sin esto nadie entra)
       'PlanSetting',          -- catálogo comercial
       'ModuleSetting',
       'VerticalSetting',
       'CustomerTierSetting',
       'AuditLog'              -- trazabilidad del panel
     );

  EXECUTE 'TRUNCATE TABLE ' || lista || ' RESTART IDENTITY CASCADE';

  -- Cuenta lo que quedó en cada tabla conservada, para confirmar que el
  -- TRUNCATE ... CASCADE no se llevó nada que debía quedarse.
  FOR t IN
    SELECT tablename FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename IN ('StaffRole','StaffMember','PlanSetting','ModuleSetting','VerticalSetting','CustomerTierSetting','AuditLog')
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
    RAISE NOTICE '  %: % filas', rpad(t, 22), n;
  END LOOP;
END $$;

-- ===================== Comprobación =====================
SELECT 'negocios' AS tabla, count(*) AS filas FROM "public"."Tenant"
UNION ALL SELECT 'usuarios de negocio', count(*) FROM "public"."User"
UNION ALL SELECT 'clientes', count(*) FROM "public"."Customer"
UNION ALL SELECT 'membresías', count(*) FROM "public"."Membership"
UNION ALL SELECT 'asistencia', count(*) FROM "public"."Attendance"
UNION ALL SELECT 'códigos de acceso', count(*) FROM "public"."BenefitCode"
UNION ALL SELECT 'canjes', count(*) FROM "public"."BenefitRedemption"
UNION ALL SELECT 'dinero (movimientos)', count(*) FROM "public"."CashMovement"
UNION ALL SELECT 'integrantes del equipo', count(*) FROM "public"."StaffMember"
UNION ALL SELECT 'roles del panel', count(*) FROM "public"."StaffRole"
UNION ALL SELECT 'catálogo (planes)', count(*) FROM "public"."PlanSetting"
ORDER BY 1;

COMMIT;

-- ============================================================================
-- Si además quieres vaciar el EQUIPO de NEXUS (y dejar solo al Propietario
-- con su cuenta de Clerk), descomenta esto y vuelve a ejecutar:
--
-- UPDATE "public"."StaffMember"
--    SET "clerkUserId" = NULL, "joinedAt" = NULL
--  WHERE email <> 'santiprocastellar7@gmail.com';
--
-- Ojo: quien quede sin cuenta vinculada entra con su correo y se enlaza al
-- panel. Si borras también la fila del Propietario, nadie puede entrar al
-- panel hasta volver a crear esa fila.
-- ============================================================================
