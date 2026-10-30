# Contexto de dominio — estado verificado

> Escrito por la mesa de trabajo con verificación directa sobre el repositorio en
> 2026-10-25. Cada afirmación tiene una referencia comprobable. Lo que no se ha
> verificado se marca como pendiente; aquí no se documenta como hecho.

## 1. Producto

NEXUS THRIVE es el sistema operativo digital para negocios colombianos:
clientes, dinero, agenda, inventario, membresías y operación multiempresa.

| Hecho | Referencia |
|---|---|
| Monolito modular Next.js 16.3.8 / React 19.2.8 / TypeScript 5 | `package.json` |
| Prisma 8 (`@prisma/orm-postgres` 8.0.0-rc.14) | `package.json`, `prisma/contract.prisma` |
| Pruebas con Vitest 5 | `vitest.config.mts` (`lib/**/*.test.ts`) |
| Gestor de paquetes pnpm | `pnpm-lock.yaml`, `pnpm-workspace.yaml` |

## 2. Aislamiento multiempresa

| Hecho | Referencia |
|---|---|
| 118 modelos en el contrato | `prisma/contract.prisma` (`^model `) |
| 118 modelos con `@@rls` | `prisma/contract.prisma` |
| Contexto obligatorio por petición | `lib/tenant/context.ts:47` `requireTenantContext` |
| Acceso del equipo NEXUS | `lib/ops/access.ts:189` `requireStaff` |
| Permisos por clave | `lib/ops/permissions.ts:123` `can` |
| Revisión de alcance por empresa | `lib/tenant/tenant-scope.test.ts` |

Regla derivada: toda tabla nueva multiempresa debe llevar RLS y toda
lectura/escritura debe resolver `tenantId` en el servidor.

## 3. Rutas

| Ruta | Función | Referencia |
|---|---|---|
| `app/[tenant]/(app)` | espacio del negocio (shell y módulos) | `app/[tenant]/(app)/layout.tsx` |
| `app/admin` | Operations Center del equipo NEXUS | `app/admin/` |
| `app/onboarding` | alta de negocio y códigos de acceso | `app/onboarding/` |
| `app/api` | route handlers | `app/api/**/route.ts` |
| `app/api/v1/[[...path]]` | API versionada | `app/api/v1/[[...path]]/route.ts` |
| `app/api/mcp` | endpoint MCP | `app/api/mcp/route.ts` |
| `app/api/webhooks/*` | webhooks de proveedores | `app/api/webhooks/**/route.ts` |

## 4. Dominio en `lib/`

Módulos verificados por nombre de directorio/archivo:

`accounting`, `admin`, `api`, `auth`, `benefits`, `business`, `capabilities`,
`catalog`, `construction`, `data-exchange`, `dashboard`, `design`, `einvoice`,
`events`, `files`, `finance`, `functions`, `google`, `growth`, `hooks`,
`inventory`, `maps`, `mcp`, `navigation`, `onboarding`, `operations`, `ops`,
`parties`, `payments`, `quotes`, `store`, `tenant`, `webhooks`.

Cada módulo combina reglas puras, repositorios con `tenantId` y pruebas junto al
código (`*.test.ts`). Hay 150 archivos de prueba en `lib/`; la ejecución local del
2026-10-25 dio **92 archivos aprobados, 58 omitidos, 1316 pruebas aprobadas y 336
omitidas** (`pnpm test`). Las omitidas requieren base de datos o entorno y no se
cuentan como verificadas.

## 5. Datos y migraciones

| Hecho | Referencia |
|---|---|
| 70 migraciones de aplicación | `migrations/app/*` |
| Snapshots del contrato | `migrations/snapshots/` |
| Cliente de datos | `prisma/db.ts` |
| Contrato emitido | `prisma/contract.json`, `prisma/contract.d.ts` |

`/prisma/migrations` está en `.gitignore`: el historial versionado vive en
`migrations/`.

## 6. Diseño y accesibilidad

| Hecho | Referencia |
|---|---|
| Marca, tokens y componentes | `DESIGN.md` |
| Patrones de interacción | `docs/design/interaction-patterns.md` |
| Accesibilidad WCAG 2.2 AA | `docs/design/accessibility.md` |
| Checklist de calidad | `docs/design/quality-checklist.md` |
| PWA y caché | `docs/design/pwa.md` |
| Paquete de marca | `packages/brand` |

## 7. Ingeniería y automatización

| Hecho | Referencia |
|---|---|
| Subagentes y skills por rol | `plugins/product-team/` |
| Compuerta de calidad | `.product-team/ci.json` y el CI |

## 8. Vacíos conocidos (pendientes de la mesa de trabajo)

- Mapa detallado de flujos de dinero por módulo (servicio transaccional,
  idempotencia, conciliación).
- Catálogo de eventos de dominio y sus consumidores.
- Inventario de integraciones externas activas (Clerk, Blob, WhatsApp, email,
  Google, e-invoice) con su estado real de credenciales.
- Mapa de rendimiento: consultas y tablas de mayor volumen.
- Cobertura real por módulo (porcentaje, no solo existencia de pruebas).

Estos vacíos se completan con referencias verificables antes de diseñar cambios
transversales; no se rellenan con suposiciones.
