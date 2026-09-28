-- Eje B — Membresia se separa de Cliente (ver schema/modulos/membresias.prisma).
-- Antes `Cliente` cargaba con `planId`, `estado` y `periodoFin`, y `Pago`
-- colgaba directo de `Cliente`. Ahora:
--   * la membresía (plan + estado + vencimiento) vive en `membresias`;
--   * los pagos cuelgan de la membresía (`pagos.membresiaId`);
--   * `Cliente` queda genérico.

-- 1. El enum de estado se renombra: ahora describe la membresía, no el cliente.
ALTER TYPE "EstadoCliente" RENAME TO "EstadoMembresia";

-- 2. Tabla membresias: una por cliente (0..1). En el backfill el id de la
--    membresía ES el id del cliente: al ser 1:1, el mismo id mantiene el seed
--    demo idempotente (upsert por id encuentra la fila ya migrada).
CREATE TABLE "membresias" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "clienteId" TEXT NOT NULL,
  "planId" TEXT,
  "estado" "EstadoMembresia" NOT NULL DEFAULT 'ACTIVO',
  "periodoFin" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "membresias_pkey" PRIMARY KEY ("id")
);

-- 3. Backfill: cada cliente con plan pasa a una membresía (hoy TODOS tienen plan:
--    verificada la base antes de migrar, 0 clientes sin plan y 0 pagos huérfanos).
INSERT INTO "membresias" ("id", "orgId", "clienteId", "planId", "estado", "periodoFin", "createdAt", "updatedAt")
SELECT "id", "orgId", "id", "planId", "estado", "periodoFin", "createdAt", "createdAt"
FROM "clientes";

CREATE UNIQUE INDEX "membresias_clienteId_key" ON "membresias"("clienteId");
CREATE INDEX "membresias_orgId_estado_idx" ON "membresias"("orgId", "estado");

ALTER TABLE "membresias" ADD CONSTRAINT "membresias_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planes"("id") ON UPDATE CASCADE ON DELETE SET NULL;

-- 4. Los pagos pasan a colgar de la membresía (backfill por join con el cliente).
ALTER TABLE "pagos" ADD COLUMN "membresiaId" TEXT;

UPDATE "pagos" p
SET "membresiaId" = m."id"
FROM "membresias" m
WHERE m."clienteId" = p."clienteId";

ALTER TABLE "pagos" ALTER COLUMN "membresiaId" SET NOT NULL;

DROP INDEX "pagos_clienteId_idx";
ALTER TABLE "pagos" DROP CONSTRAINT "pagos_clienteId_fkey";
ALTER TABLE "pagos" DROP COLUMN "clienteId";

CREATE INDEX "pagos_membresiaId_idx" ON "pagos"("membresiaId");
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_membresiaId_fkey" FOREIGN KEY ("membresiaId") REFERENCES "membresias"("id") ON UPDATE CASCADE ON DELETE CASCADE;

-- 5. Cliente queda limpio (genérico): sin plan, sin estado, sin vencimiento.
DROP INDEX "clientes_orgId_estado_idx";
ALTER TABLE "clientes" DROP CONSTRAINT "clientes_planId_fkey";
ALTER TABLE "clientes" DROP COLUMN "planId";
ALTER TABLE "clientes" DROP COLUMN "estado";
ALTER TABLE "clientes" DROP COLUMN "periodoFin";