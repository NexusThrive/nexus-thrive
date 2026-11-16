-- ============================================================================
-- NEXUS THRIVE · Poner una cuenta de Clerk en el panel de NEXUS
-- ============================================================================
-- Alta (o vinculación) de un integrante del Operations Center con una cuenta
-- de Clerk concreta.
--
-- QUÉ DEBES PONER: el CORREO de la cuenta de Clerk. Es el único dato que
-- hace falta: la tabla StaffMember exige correo y es único.
--   - Lo sacas en el Dashboard de Clerk → Users → busca el id
--     (user_3Kywprl5AoXKFsYAFeRJJJAO62m) y copia el email.
--   - Ojo: el correo va en minúsculas, tal como lo muestre Clerk.
--
-- Si no sabes el correo: no hace falta este script. En el panel,
-- Operaciones Center → Equipo → Invitar, con el correo y el rol. La persona
-- entra con ese correo y queda vinculada sola (así funciona desde el arreglo
-- del enlace por correo).
--
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
-- ============================================================================
BEGIN;

-- 1) Si esa cuenta de Clerk ya estaba vinculada a otra ficha, se suelta
--    primero (para no chocar con el índice único de clerkUserId).
UPDATE "public"."StaffMember"
   SET "clerkUserId" = NULL,
       "updatedAt"   = now()
 WHERE "clerkUserId" = 'user_3Kywprl5AoXKFsYAFeRJJJAO62m'
   AND "email" <> 'PEGA_AQUI_EL_CORREO';

-- 2) Crea la ficha (o la vincula si ya estaba invitada por correo).
--    ROL: 'owner' = Propietario (control total). Otros: 'finance' (Finanzas),
--    'sales' (Comercial), 'support' (Soporte), 'ops' (Técnico).
INSERT INTO "public"."StaffMember"
  ("id", "clerkUserId", "email", "name", "title", "roleId", "active", "joinedAt", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text,
   'user_3Kywprl5AoXKFsYAFeRJJJAO62m',
   'PEGA_AQUI_EL_CORREO',
   NULL,                       -- nombre (opcional)
   NULL,                       -- cargo (opcional)
   (SELECT "id" FROM "public"."StaffRole" WHERE "key" = 'owner'),
   true,
   now(),
   now(),
   now())
ON CONFLICT ("email") DO UPDATE
  SET "clerkUserId" = EXCLUDED."clerkUserId",
      "roleId"      = EXCLUDED."roleId",
      "active"      = true,
      "joinedAt"    = COALESCE("public"."StaffMember"."joinedAt", now()),
      "updatedAt"   = now();

-- 3) Comprobación: debe salir 1 fila, activa y con el rol.
SELECT s."email",
       s."clerkUserId",
       s."active",
       r."key"  AS rol,
       r."name" AS rol_nombre,
       array_length(r."permissions", 1) AS permisos
  FROM "public"."StaffMember" s
  JOIN "public"."StaffRole" r ON r."id" = s."roleId"
 WHERE s."clerkUserId" = 'user_3Kywprl5AoXKFsYAFeRJJJAO62m';

COMMIT;
