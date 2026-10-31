# Estructura del repositorio

Qué hay en cada carpeta de primer nivel y dónde buscar. Comprobado contra el repositorio el 31 de octubre de 2026.

```
nexus-thrive/
├── app/            Next.js (App Router): páginas, acciones de servidor y rutas API
├── components/     Componentes de interfaz (atoms · molecules · organisms · templates)
├── lib/            TODA la lógica: nueve áreas (ver Arquitectura)
├── prisma/         Contrato de datos por dominio + cliente generado
├── migrations/     Migraciones de Prisma
├── tests/          TODAS las pruebas (unit · integration · architecture · fixtures)
├── e2e/            Pruebas de navegador (Playwright + axe)
├── scripts/        Verificador de capas, guardián de SQL, release, utilidades de documentación
├── docs/           Documentación (wiki · decisions · internal) y archivos que lee el código
├── public/         Estáticos, service worker e iconos
├── packages/       Marca (`packages/brand`)
├── plugins/        Equipo de ingeniería: subagentes y skills (`product-team`)
└── eslint/         Reglas propias de ESLint
```

| Carpeta | Qué hay | Dónde leer más |
|---|---|---|
| `app/` | Rutas por negocio bajo `app/[tenant]/`, panel de Nexus en `app/admin/`, API pública en `app/api/`. **No importa la base de datos**: pasa por `lib/` | [Seguridad](../06-seguridad-y-permisos/autenticacion-permisos-y-aislamiento.md) |
| `components/` | Sistema de diseño: `atoms/` → `molecules/` → `organisms/` → `templates/`; `docs/` guarda la documentación de Storybook | `DESIGN.md` en la raíz |
| `lib/` | `foundation`, `core`, `business`, `domains`, `integrations`, `industry`, `platform`, `experience`, `runtime` (+ `utils.ts` y `cn.ts`). Solo implementación, sin pruebas | [Mapa de áreas y módulos](../04-modulos/mapa-de-areas-y-modulos.md) · [Reglas de dependencias](../03-arquitectura/reglas-dependencias.md) |
| `prisma/` | `schema/` (fuente), `contract.json` y `contract.d.ts` (generados), `db.ts` (cliente) | [Prisma: estructura](../05-datos-y-base-de-datos/prisma-estructura.md) |
| `migrations/` | `app/<fecha>_<nombre>/` más `snapshots/` | [Prisma: estructura](../05-datos-y-base-de-datos/prisma-estructura.md) |
| `tests/` | `unit/<área>/<módulo>/`, `integration/`, `architecture/`, `fixtures/` (espejo de `lib/`) | [Pruebas](../10-pruebas-y-calidad/pruebas.md) |
| `scripts/` | `check-layers.mjs`, `check-prod-sql.sh`, `verify.sh`, `release.sh`, `capas-*.mjs`, utilidades | [Operación](../08-operacion-y-despliegue/README.md) |
| `docs/` | `wiki/` (manual vigente), `decisions/` (ADR), `internal/` (historial), y archivos de máquina: `architecture/layers.json`, `prod-sql/`, `n8n/`, `ci/` | [Documentación](../../README.md) |
| `plugins/` | Subagentes y skills del equipo de ingeniería | [Equipo de ingeniería](../09-desarrollo/equipo-ingenieria.md) |

Archivos de la raíz que importan: `README.md` (presentación), `CHANGELOG.md`, `CONTRIBUTING.md`, `CLAUDE.md` y `AGENTS.md` (reglas para agentes), `DESIGN.md` y `PRODUCT.md` (marca y diseño), `prisma.config.ts`, `vitest.config.mts`, `test-integration.sh`.

No se versionan: `.env*` con valores reales, `node_modules/`, `.next/`, `backups/` (volcados de base de datos locales) ni `storybook-static/`.
