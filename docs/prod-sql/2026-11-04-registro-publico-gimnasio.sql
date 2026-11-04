-- ============================================================================
-- 2026-11-04 · Panel de registro de cliente del gimnasio
--
-- Aditivo e idempotente. Migración de origen:
-- migrations/app/20261104T1752_registro_publico_gimnasio
--
--  1. «Tenant».«registrationEnabled»: el enlace público /registro/<negocio> acepta altas
--     solo si está en true (por defecto false: ningún negocio queda público sin decidirlo).
--  2. «Tenant».«logoId»: id del adjunto (kind 'TENANT_LOGO') con el logotipo del negocio.
--  3. Receta del gimnasio en «Planes y módulos»: Inicio, Clientes, Membresías (incluye
--     Control de acceso), Finanzas y Panel de registro de cliente (módulo «website»).
--     Solo cambia lo que reciben los gimnasios NUEVOS; los negocios existentes conservan
--     los módulos que ya tienen (ver el bloque opcional del final).
--
-- No hay cambios para el evento «customer.registered» ni para el adjunto: «OutboxEvent».«type»
-- y «Attachment».«kind» son texto libre.
-- ============================================================================

BEGIN;

ALTER TABLE "public"."Tenant" ADD COLUMN IF NOT EXISTS "logoId" text;
ALTER TABLE "public"."Tenant" ADD COLUMN IF NOT EXISTS "registrationEnabled" boolean NOT NULL DEFAULT false;

-- Receta guardada del gimnasio (si el rubro nunca se editó en el panel no hay fila y rige el código).
UPDATE "VerticalSetting"
SET modules = ARRAY['dashboard', 'crm', 'memberships', 'finance', 'website'],
    "updatedAt" = now()
WHERE vertical = 'gym';

COMMIT;

-- ----------------------------------------------------------------------------
-- OPCIONAL · Alinear los gimnasios que ya existen con la receta nueva.
-- Apaga Pagos, WhatsApp, Agenda y Catálogo/inventario y enciende el panel de registro.
-- No borra datos: solo oculta esas pantallas. Revisa antes de ejecutar.
-- ----------------------------------------------------------------------------
-- BEGIN;
-- UPDATE "TenantModule" tm
-- SET active = false, "updatedAt" = now()
-- FROM "Tenant" t
-- WHERE t.id = tm."tenantId" AND t.vertical = 'gym'
--   AND tm."moduleName" IN ('payments', 'whatsapp', 'bookings', 'inventory', 'pos', 'online_payments', 'google', 'growth');
-- INSERT INTO "TenantModule" (id, "tenantId", "moduleName", active, "updatedAt")
-- SELECT gen_random_uuid()::text, t.id, 'website', true, now()
-- FROM "Tenant" t WHERE t.vertical = 'gym'
-- ON CONFLICT ("tenantId", "moduleName") DO UPDATE SET active = true, "updatedAt" = now();
-- COMMIT;
