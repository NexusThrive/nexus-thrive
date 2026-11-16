-- ============================================================================
-- NEXUS THRIVE · Administrador del Operations Center
-- ============================================================================
-- Deja a Santiago Procastellar como Propietario (rol `owner`, TODOS los
-- permisos) del Operations Center, vinculado a su cuenta de Clerk.
--
-- Dato del usuario:
--   Correo   : santiprocastellar7@gmail.com
--   Clerk ID : user_3KUbFGS9JStBtEFnbd8a4IGM29W
--
-- Ejecutar en el SQL Editor de Supabase (o psql) sobre la base de PRODUCCIÓN.
-- Es idempotente: se puede correr las veces que sea; deja el mismo estado.
--
-- Notas:
-- - "admin" aquí es el rol `owner` (Propietario) del panel de NEXUS, que no
--   es lo mismo que el `role = 'SUPERADMIN'` de la tabla User (esa es la
--   del negocio). El acceso al Operations Center sale de StaffMember + rol.
-- - El rol `owner` se crea aquí con los 25 permisos actuales del catálogo
--   (lib/ops/permissions.ts). Si ya existía con una lista vieja, se
--   actualiza: el Propietario siempre debe tener todos.
-- ============================================================================
BEGIN;

-- ===================== 1) Rol Propietario con todos los permisos =====================
INSERT INTO "public"."StaffRole"
  ("id","key","name","description","permissions","system","createdAt","updatedAt")
VALUES
  (gen_random_uuid()::text,
   'owner',
   'Propietario',
   'Control total del Operations Center: equipo, permisos, precios, cuentas y auditoría.',
   ARRAY[
     'leads.view','leads.edit','leads.assign','proposals.view',
     'accounts.view','accounts.edit','accounts.create','accounts.modules','accounts.suspend','accounts.impersonate',
     'billing.view','billing.record','billing.refund','pricing.edit',
     'tickets.view','tickets.reply','tickets.escalate','diagnostics.view',
     'presence.view','presence.manage',
     'team.invite','team.roles','team.permissions','audit.view','catalog.edit'
   ]::text[],
   true,
   now(),
   now())
ON CONFLICT ("key") DO UPDATE
  SET "permissions" = EXCLUDED."permissions",
      "name"        = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "updatedAt"   = now();

-- ===================== 2) Si el Clerk ID ya estaba en otra fila, se libera =====================
-- `clerkUserId` es único. Si otro integrante lo tenía (con otro correo), se
-- le quita para que quede como "invitación pendiente" y se pueda volver a
-- vincular por correo. La fila de este correo se reasigna abajo.
UPDATE "public"."StaffMember"
   SET "clerkUserId" = NULL,
       "updatedAt"   = now()
 WHERE "clerkUserId" = 'user_3KUbFGS9JStBtEFnbd8a4IGM29W'
   AND "email" <> 'santiprocastellar7@gmail.com';

-- ===================== 3) Vincular / actualizar al administrador =====================
-- Si ya existía la fila con ese correo (por ejemplo, una invitación previa),
-- se le pone el Clerk ID nuevo y el rol Propietario.
UPDATE "public"."StaffMember"
   SET "clerkUserId" = 'user_3KUbFGS9JStBtEFnbd8a4IGM29W',
       "roleId"      = (SELECT "id" FROM "public"."StaffRole" WHERE "key" = 'owner'),
       "active"      = true,
       "name"        = COALESCE("name", 'Santiago Procastellar'),
       "title"       = COALESCE("title", 'Fundador'),
       "joinedAt"    = COALESCE("joinedAt", now()),
       "updatedAt"   = now()
 WHERE "email" = 'santiprocastellar7@gmail.com';

-- ===================== 4) Crear la fila si no existía =====================
INSERT INTO "public"."StaffMember"
  ("id","clerkUserId","email","name","title","roleId","active","joinedAt","createdAt","updatedAt")
SELECT
  gen_random_uuid()::text,
  'user_3KUbFGS9JStBtEFnbd8a4IGM29W',
  'santiprocastellar7@gmail.com',
  'Santiago Procastellar',
  'Fundador',
  (SELECT "id" FROM "public"."StaffRole" WHERE "key" = 'owner'),
  true,
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."StaffMember" WHERE "email" = 'santiprocastellar7@gmail.com'
);

-- ===================== 5) Comprobación =====================
SELECT m."email",
       m."clerkUserId",
       m."active",
       r."key"  AS rol,
       r."name" AS rol_nombre,
       array_length(r."permissions", 1) AS permisos
  FROM "public"."StaffMember" m
  JOIN "public"."StaffRole" r ON r."id" = m."roleId"
 WHERE m."email" = 'santiprocastellar7@gmail.com';

COMMIT;
