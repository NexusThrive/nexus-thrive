# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📋 Overview
Nexus es el **núcleo** de la base del ecosistema: un portal (Next.js) con la estructura REGISTRO → ONBOARDING → PANEL PRINCIPAL → PLANTILLAS Y MÓDULOS SEGÚN EL ONBOARDING. Las apps verticales antiguas (`nexus-finance`, `nexus-services`) fueron eliminadas del monorepo. Mapa del repo: `docs/ARQUITECTURA.md`. Nomenclatura: `docs/GLOSARIO.md`. Base de datos: `docs/MODELO-DATOS.md`.

## 🏗️ Arquitectura
- **apps/nexus-core/portal/**: Portal único de Nexus
  - `src/app/`: `(auth)` registro/login · `(onboarding)` perfil del negocio · `(protected)` shell + panel principal + `plantillas/gym/` (solo el dashboard de la PLANTILLA) + `modulos/<slug>/` (cada MÓDULO vive en su propia ruta: clientes, pagos, gastos, caja-menor)
  - `src/lib/`: `core/` (núcleo: acciones, org, modulos, navegacion, requiere-modulo) · `shared/` (rango, format, tipos, form) · `plantillas/gym/dashboard.ts` · `modulos/` (clientes, planes, pagos, gastos, caja-menor)
  - `src/components/`: `core/` (Navbar, NavModulos, GuardModulo, MenuCuenta, SelectorNegocio, TourInicial) · `shared/` (FiltroRango, charts/) · `modulos/clientes/` (ListaClientes)
- **packages/**:
  - `@nexus/prisma`: Schema modular en **dos niveles** — `core/identidad.prisma` (NÚCLEO: Organization/Member/Module/OrganizationModule/Plantilla/PlantillaModulo) y `modulos/<slug>.prisma` (un archivo POR MÓDULO del catálogo, nombre = `modules.slug`; hoy clientes, planes, pagos, gastos, caja-menor). El núcleo no conoce ningún módulo. **Un módulo NO es de un rubro**: es un producto que una Organization activa (`OrganizationModule`); lo "de un rubro" vive en `Plantilla.rubro` + `plantilla_modulos`, nunca en el schema. Un rubro completo (`Plantilla`) es un conjunto de `Module` activados juntos. **Eje A aplicado (2026-09-28)**: `clientes` es `CAPA` + `porDefecto` (se activa solo en toda org nueva; backfill para las existentes); los módulos base se activan en `registrar()` con `activarModulosPorDefecto`. Diccionario completo: `docs/MODELO-DATOS.md`.
  - `@nexus/ui`, `@nexus/utils`, `@nexus/config`: compartidos (UI, helpers, presets)
- **tooling/**: ESLint y TypeScript base
- **infraestructura**: `docker-compose.yml` (PostgreSQL 16 local), `.env.example`

## ⚙️ Comandos esenciales

### Instalación y setup inicial
```bash
pnpm install          # instala todas las dependencias del workspace
docker compose up -d  # levanta PostgreSQL local (requerido para desarrollo)
```

### Desarrollo
```bash
pnpm dev              # levanta todas las apps en modo desarrollo con cache deshabilitado
pnpm --filter <package> dev  # desarrollar una específica (ej: @nexus/prisma)
```

### Construcción y calidad
```bash
pnpm build            # build de todas las apps y packages
pnpm lint             # ejecuta ESLint en todo el monorepo
pnpm type-check       # verifica tipos de TypeScript en todo el workspace
pnpm test             # ejecuta pruebas (si existen)
```

### Base de datos (Prisma)
```bash
pnpm --filter @nexus/prisma generate   # genera el cliente Prisma desde schema.prisma
pnpm --filter @nexus/prisma migrate dev # ejecuta migraciones contra la base de datos local
pnpm --filter @nexus/prisma migrate deploy # aplica migraciones en producción
pnpm --filter @nexus/prisma studio     # abre Prisma Studio para inspeccionar datos
```

### Trabajar con paquetes específicos
```bash
# Ejecutar comandos en un package específico
pnpm --filter @nexus/ui lint
pnpm --filter @nexus/utils type-check

# Ver dependencias de un package
pnpm ls --filter @nexus/prisma
```

## 🧪 Testing
Los tests se ejecutan mediante Turborepo con cache basado en build:
```bash
pnpm test              # Vitest en los packages que tengan tests (hoy: el portal)
pnpm --filter nexus-portal test     # tests solo del portal
pnpm --filter nexus-portal test:watch
```

Los tests son unitarios y viven junto al código (`*.test.ts`), con Vitest y el
alias `@/`. Hoy cubren el formateo de dinero, el gate de módulos, el catálogo
(rubros, sugerencias, rutas) y el aislamiento multi-tenant de las consultas de
Clientes. **No hay E2E ni CI todavía** (issues #19 y #20).

## 🔧 Notas de desarrollo
- El monorepo usa pnpm como gestor de paquetes
- Turborepo optimiza builds mediante cache y ejecución paralela
- Nunca commitear `.env` - usar solo `.env.example` como referencia
- Las apps Next.js siguen la estructura estándar de páginas y componentes
- Los packages usan exports definidos en su package.json para API clara
- TypeScript está configurado en modo estricto en todo el workspace

## 📚 Convenciones
- Un módulo **no** es una app: es un módulo (pantallas + datos) dentro de `apps/nexus-core/portal`. Solo hay un portal.
- Cada módulo del catálogo vive en `/modulos/<slug>` (ruta en `Module.rutaBase`); la `Plantilla` solo tiene su dashboard (`/plantillas/<slug>`).
- Los dashboards resuelven totales/conteos/agrupaciones **en SQL** (aggregate/count/groupBy); `flujo` trae filas a propósito porque sus buckets son irregulares.
- El gate de módulos es ÚNICO: `lib/core/requiere-modulo.ts` + `GuardModulo`. No crear checks duplicados.
- Sigue la estructura `apps/<campo>/<módulo>/` para nuevas aplicaciones
- El código reutilizable entre apps va en `packages/`
- La configuración compartida vive en `packages/config` y `tooling/`
- Los nombres de paquetes usan el scope `@nexus/`