-- CreateEnum
CREATE TYPE "TipoMovimientoCaja" AS ENUM ('INGRESO', 'EGRESO');

-- CreateEnum
CREATE TYPE "EstadoCliente" AS ENUM ('ACTIVO', 'CONGELADO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'NEQUI', 'OTRO');

-- CreateEnum
CREATE TYPE "CategoriaGasto" AS ENUM ('ARRIENDO', 'NOMINA', 'SERVICIOS', 'MANTENIMIENTO', 'PUBLICIDAD', 'OTROS');

-- CreateEnum
CREATE TYPE "NaturalezaModulo" AS ENUM ('CAPA', 'VERTICAL');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'OPERADOR', 'AUDITOR');

-- CreateEnum
CREATE TYPE "CampoModulo" AS ENUM ('CORE', 'FINANCE', 'SERVICES', 'PRODUCTIVITY');

-- CreateEnum
CREATE TYPE "EstadoModuloOrg" AS ENUM ('SOLICITADO', 'ACTIVO');

-- CreateEnum
CREATE TYPE "UserScope" AS ENUM ('USER', 'CEO');

-- CreateTable
CREATE TABLE "caja_categorias" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caja_categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_caja" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "tipo" "TipoMovimientoCaja" NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "categoriaId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "motivoAnulacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movimientos_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planes" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "duracionDias" INTEGER NOT NULL DEFAULT 30,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "documento" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "planId" TEXT,
    "estado" "EstadoCliente" NOT NULL DEFAULT 'ACTIVO',
    "periodoFin" TIMESTAMP(3),
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "metodo" "MetodoPago" NOT NULL DEFAULT 'EFECTIVO',
    "concepto" TEXT NOT NULL,
    "periodoInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodoFin" TIMESTAMP(3) NOT NULL,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "motivoAnulacion" TEXT,
    "pagadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "categoria" "CategoriaGasto" NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "motivoAnulacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tipoNegocio" TEXT,
    "moneda" TEXT NOT NULL DEFAULT 'COP',
    "pais" TEXT,
    "equipo" TEXT,
    "dolor" TEXT,
    "onboardingCompletadoAt" TIMESTAMP(3),
    "logoUrl" TEXT,
    "rolDefault" "Rol" NOT NULL DEFAULT 'OPERADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "rol" "Rol" NOT NULL DEFAULT 'OPERADOR',
    "scope" "UserScope" NOT NULL DEFAULT 'USER',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "onboardingCompletadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "campo" "CampoModulo" NOT NULL,
    "naturaleza" "NaturalezaModulo" NOT NULL DEFAULT 'CAPA',
    "icono" TEXT,
    "porDefecto" BOOLEAN NOT NULL DEFAULT false,
    "sugeridoPara" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_modules" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "estado" "EstadoModuloOrg" NOT NULL DEFAULT 'SOLICITADO',
    "activadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantillas" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "campo" "CampoModulo" NOT NULL,
    "rubro" TEXT NOT NULL,
    "icono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantillas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantilla_modulos" (
    "id" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "plantilla_modulos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "caja_categorias_orgId_activo_idx" ON "caja_categorias"("orgId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "caja_categorias_orgId_nombre_key" ON "caja_categorias"("orgId", "nombre");

-- CreateIndex
CREATE INDEX "movimientos_caja_orgId_fecha_idx" ON "movimientos_caja"("orgId", "fecha");

-- CreateIndex
CREATE INDEX "movimientos_caja_orgId_anulado_idx" ON "movimientos_caja"("orgId", "anulado");

-- CreateIndex
CREATE INDEX "planes_orgId_idx" ON "planes"("orgId");

-- CreateIndex
CREATE INDEX "clientes_orgId_estado_idx" ON "clientes"("orgId", "estado");

-- CreateIndex
CREATE INDEX "clientes_orgId_nombre_idx" ON "clientes"("orgId", "nombre");

-- CreateIndex
CREATE INDEX "pagos_clienteId_idx" ON "pagos"("clienteId");

-- CreateIndex
CREATE INDEX "pagos_orgId_pagadoEl_idx" ON "pagos"("orgId", "pagadoEl");

-- CreateIndex
CREATE INDEX "gastos_orgId_fecha_idx" ON "gastos"("orgId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "members_orgId_idx" ON "members"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "members_email_orgId_key" ON "members"("email", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "modules_slug_key" ON "modules"("slug");

-- CreateIndex
CREATE INDEX "organization_modules_orgId_idx" ON "organization_modules"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_modules_orgId_moduleId_key" ON "organization_modules"("orgId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_slug_key" ON "plantillas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "plantilla_modulos_plantillaId_moduleId_key" ON "plantilla_modulos"("plantillaId", "moduleId");

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "caja_categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_modules" ADD CONSTRAINT "organization_modules_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_modules" ADD CONSTRAINT "organization_modules_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantilla_modulos" ADD CONSTRAINT "plantilla_modulos_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "plantillas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantilla_modulos" ADD CONSTRAINT "plantilla_modulos_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

