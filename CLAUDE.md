# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📋 Overview
Nexus es el **núcleo** de la base del ecosistema: un portal (Next.js) con la estructura REGISTRO → ONBOARDING → PANEL PRINCIPAL → PLANTILLAS Y MÓDULOS SEGÚN EL ONBOARDING. Las apps verticales (`nexus-finance`, `nexus-services`) quedaron fuera de la base — referencia histórica en `main`. Ver `docs/BASE-NEXUS.md`.

## 🏗️ Arquitectura (rama `core/base`)
- **apps/nexus-core/portal/**: Portal único de Nexus
  - `src/app/`: `(auth)` registro/login · `(onboarding)` perfil del negocio · `(protected)` shell + panel principal + `plantillas/gym/` (PLANTILLA armada de módulos) + `modulos/caja-menor/` (módulo suelto)
  - `src/lib/`: `core/` (núcleo: acciones, org, modulos, navegacion con RUTA_POR_SLUG, requiere-modulo) · `shared/` (rango, format, tipos, form) · `plantillas/gym/dashboard.ts` · `modulos/` (clientes, planes, pagos, gastos, caja-menor)
  - `src/components/`: `core/` (Navbar, NavModulos, MenuCuenta, SelectorNegocio, TourInicial) · `shared/` (FiltroRango, charts/) · `modulos/clientes/` (ListaClientes)
- **packages/**:
  - `@nexus/prisma`: Schema modular — `identidad.prisma` (NÚCLEO: Organization/Member/Module/OrganizationModule) + `gym.prisma` (MÓDULO). El núcleo no conoce módulos verticales. `Plantilla`/`PlantillaModulo` NO existen aún en la DB (pendiente rediseño del catálogo).
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
pnpm test              # ejecuta tests en todos los packages que los tengan
pnpm --filter @nexus/prisma test  # tests específicos de un package
```

## 🔧 Notas de desarrollo
- El monorepo usa pnpm como gestor de paquetes
- Turborepo optimiza builds mediante cache y ejecución paralela
- Nunca commitear `.env` - usar solo `.env.example` como referencia
- Las apps Next.js siguen la estructura estándar de páginas y componentes
- Los packages usan exports definidos en su package.json para API clara
- TypeScript está configurado en modo estricto en todo el workspace

## 📚 Convenciones
- Sigue la estructura `apps/<campo>/<módulo>/` para nuevas aplicaciones
- El código reutilizable entre apps va en `packages/`
- La configuración compartida vive en `packages/config` y `tooling/`
- Los nombres de paquetes usan el scope `@nexus/`