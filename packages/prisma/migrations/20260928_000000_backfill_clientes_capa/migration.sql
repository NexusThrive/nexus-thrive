-- Backfill del Eje A: `clientes` pasa a CAPA con `porDefecto = true`.
--
-- QUÉ HACE ESTA MIGRACIÓN
-- -----------------------
-- Activa el módulo `clientes` en las organizaciones que no lo tienen.
--
-- POR QUÉ ES NECESARIA
-- --------------------
-- `clientes` estaba declarado `VERTICAL` con `sugeridoPara: ["gimnasio"]`, así
-- que `activarModuloPorRubro` solo lo activaba a un gimnasio. Un museo, una
-- tienda o un salón se quedaban SIN el módulo que más necesitan: el registro
-- de personas del negocio.
--
-- La columna `porDefecto` prometía "se activa automáticamente en toda
-- organización al crearla", pero nadie la leía. Ahora sí se lee, y solo
-- afecta a organizaciones nuevas.
--
-- Esta migración pone a las EXISTENTES en la misma situación, para que el
-- catálogo y la base digan lo mismo. Sin cambios de schema: es solo datos.
--
-- ES IDEMPOTENTE: solo inserta filas que faltan, nunca modifica ni borra.

INSERT INTO "organization_modules" (
  "id",
  "orgId",
  "moduleId",
  "estado",
  "activadoAt",
  "createdAt",
  "updatedAt"
)
SELECT
  md5(o."id" || '::' || m."id")                     AS "id",
  o."id"                                            AS "orgId",
  m."id"                                            AS "moduleId",
  'ACTIVO'::"EstadoModuloOrg"                       AS "estado",
  NOW()                                              AS "activadoAt",
  NOW()                                              AS "createdAt",
  NOW()                                              AS "updatedAt"
FROM "organizations" o
CROSS JOIN "modules" m
WHERE m."slug" = 'clientes'
  AND NOT EXISTS (
    SELECT 1 FROM "organization_modules" om
    WHERE om."orgId" = o."id" AND om."moduleId" = m."id"
  );
