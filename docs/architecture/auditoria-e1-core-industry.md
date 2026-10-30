# Auditoría de E1: dependencias de Core hacia Industry

Estado: **solo auditoría**. No se modificó ningún archivo de implementación. Alcance: exclusivamente imports de la capa Core hacia una
industria. Fuente: las 12 excepciones de la etapa E1 de `docs/architecture/exceptions.json` (64 → 52 si se resuelven) y lectura de
`lib/tenant/db.ts` (1 469 líneas).

## 1. Dependencias actuales

Todas salen de **un solo archivo**: `lib/tenant/db.ts` (Core). No hay otro archivo de Core que importe una industria.

| # | Import en `lib/tenant/db.ts` | Hacia | Qué se hace con él |
|---|---|---|---|
| 1–10 | `createCatalogDb`, `createQuotesDb`, `createProjectQuotesDb`, `createProgressDb`, `createProjectsDb`, `createProjectHeadersDb`, `createBudgetsDb`, `createPlanDb`, `createFieldLogDb`, `createReportsDb` (de `lib/construction/{catalog,quotes,project-quotes,progress,projects,project-headers,budget,plan,field-log,reports}`) | construcción | Se instancian en `createTenantDb` (líneas 790–810) como las propiedades `apu`, `quotes`, `projectQuotes`, `progress`, `projects`, `projectHeaders`, `budgets`, `lean`, `fieldLog`, `reports` |
| 11 | `escapeLike` (de `lib/construction/shared`) | construcción | 4 usos en Core (líneas 417, 1017, 1101, 1289) para búsquedas con `LIKE`. Es una utilidad genérica; también la usa `business/gym-db.ts` (violación R2, etapa E2) |
| 11 | `export type * from "@/lib/construction/shared"` | construcción | Reexporta 67 tipos de obra desde `@/lib/tenant/db`; 12 archivos de `app/` los importan por ahí |
| 12 | `EXPIRING_WINDOW_DAYS`, `MEMBERSHIP_STATUSES`, `computeMembershipStatus`, `plusDays`, `typeLabel` y tipos (de `lib/business/memberships`, clasificado como industry/gym) | gimnasio | Los usa (a) la ficha 360° del cliente: estado de membresías y línea de tiempo (líneas 618, 717); (b) el bloque `memberships: { … }` de `createTenantDb` (líneas 1272–1469, ~200 líneas) |

### Quién consume lo que hoy compone `createTenantDb`

- `createTenantDb` lo llaman **36 archivos** (19 como `tenantDb`). El contexto de cada petición (`lib/tenant/context.ts:28`) guarda el
  resultado como `ctx.tenantDb`, así que **toda pantalla recibe el objeto con las propiedades de obra**, sea del rubro que sea.
- Archivos que usan propiedades de obra: **26** (16 de producción y 10 pruebas). De producción: 15 en `app/` (`…/projects` y sus subcarpetas `budget`, `field-log`, `lean`, `progress`, `quotes`, `reports`;
  `…/quotes`, incluida la vista de impresión; `…/catalog`) y `lib/construction/containers.ts`.
- Archivos que usan `memberships`: **4** (`app/…/page.tsx`, `…/memberships/actions.ts`, `…/memberships/page.tsx`,
  `lib/dashboard/notifications-db.ts`) y 1 prueba.
- 6 acciones y `lib/tenant/context.ts` derivan su tipo con `ReturnType<typeof createTenantDb>`: cualquier cambio de forma del objeto se propaga a sus tipos.
- `lib/construction/containers.ts` importa el tipo `TenantDb` de `lib/tenant/db.ts` (cuando se separe, ese tipo debe venir de construcción).
- No hay ciclo de ejecución hoy: `tenant/db → construction/*`, y de vuelta solo `containers.ts` (tipo) y `field-log-author.ts` (`tenant/context`).

## 2. Responsabilidad que debería tener cada componente

| Componente | Hoy | Debería |
|---|---|---|
| `lib/tenant/db.ts` | Núcleo multi-tenant **y** repositorios de clientes, pagos, reservas, gastos, finanzas, membresías y fachada de obra | Solo lo que es de Core. Hoy es un archivo de 1 469 líneas con repositorios de Business, Finance e Industry |
| Repositorios de obra (10) | Fábricas `create*Db(tenantId)` en `lib/construction/` | Pertenecen a construcción; Core no debe conocerlos |
| `escapeLike` | Dentro de construcción | Utilidad de Foundation |
| Tipos de `construction/shared` | Reexportados por Core | Se importan de construcción |
| Bloque `memberships` | Dentro de Core | Repositorio del gimnasio, junto a `memberships-db.ts` |
| Ficha 360° (clientes) | Core calcula estado y título de membresías | Business define la ficha; el gimnasio aporta su parte por un contrato (punto de extensión) |

**Hallazgo fuera del alcance de las reglas de import:** `tenant/db.ts` también contiene repositorios de Business y Finance
(`customers`, `payments`, `bookings`, `expenses`, `finance`). La regla de capas no lo ve porque consultan por `db.orm` sin importar otro módulo. No es de E1, pero explica por qué
el archivo es tan grande y condiciona la solución.

## 3. Alternativas de inversión de dependencias

### Alternativa A — Fábrica propia de la industria, sin registro (recomendada)

Construcción expone `createConstructionDb(tenantId)` (en `lib/construction/`) que devuelve las 10 propiedades **con los mismos nombres**.
`createTenantDb` deja de incluirlas. Las 16 pantallas y 10 pruebas que usan `tenantDb.projects…` pasan a `construction.projects…`.
La pantalla de obra crea ambas y le pasa la segunda a quien la necesita.

- **Pros:** dependencia explícita y con tipos; sin estado global ni orden de importación; el compilador (`tsc`) señala cada consumidor que falte;
  deja de cargar el código de obra en las pantallas que no son de obra; encaja con D-4 (contratos explícitos).
- **Riesgos:** diff mecánico amplio (≈ 26 archivos); dos llamadas donde antes había una (cada fábrica valida `tenantId`); conflicto de fusión con PR que toquen
  `app/…/projects`, `quotes` o `catalog`; `ctx.tenantDb` ya no trae obra, así que las páginas de obra deben construir `construction` (o el contexto exponerlo de forma perezosa).
- **Mitigación:** cambio por propiedad y por directorio, con `tsc` como red; una prueba que fije las claves de ambos objetos (ver §4).

### Alternativa B — Registro de extensiones en tiempo de ejecución

`createTenantDb` acepta extensiones registradas (`registerTenantExtension("construction", factory)`); cada industria se registra al importarse.

- **Pros:** los consumidores casi no cambian de forma.
- **Riesgos (altos):** pierde el tipado salvo con *declaration merging*; **depende de que el módulo de registro se importe en cada punto de entrada**
  (páginas, acciones, rutas de API, cron, MCP): si un entorno serverless no lo importa, la propiedad queda `undefined` en tiempo de ejecución y `tsc` no lo avisa;
  estado global mutable; difícil de probar; interacción con las pruebas de caché/aislamiento (`db.cache-invalidation`).

### Alternativa C — Inyección por parámetro

`createTenantDb(tenantId, { extensions })`.

- **Riesgos:** cambia la firma que usan 36 archivos y 6 tipos derivados; el llamador tiene que conocer qué industrias existen; mismo reparto de dependencia que A pero con más ruido.

### Alternativa D — Módulo de composición en la capa Experience

Un archivo nuevo (`createAppTenantDb`) que importa Core + industrias y devuelve la unión; los consumidores cambian de import.

- **Pros:** conserva los nombres de propiedad (cambio de import, no de uso).
- **Riesgos:** mueve la flecha sin deshacer el acoplamiento: todas las pantallas siguen cargando todas las industrias y el «objeto Dios» persiste.

### Para el gimnasio (la parte difícil)

El bloque `memberships` se puede extraer igual que la obra (alternativa A, `createMembershipsDb(tenantId)` junto a `memberships-db.ts`; 4 consumidores).
Lo delicado es la **ficha 360° del cliente**, que mezcla datos de gimnasio en una vista de Business:

- **G1 · Contrato de aportes a la ficha:** Business define una interfaz (por ejemplo «fuente de línea de tiempo del cliente») y el gimnasio la implementa; la pantalla de la
  ficha los combina. Correcto a largo plazo; requiere decidir el diseño del punto de extensión.
- **G2 · Subir el cálculo a la pantalla:** la página de la ficha pide membresías al gimnasio y las mezcla. Más simple; deja la lógica en `app/`.
- **G3 · Aplazar la ficha 360°:** extraer solo el bloque `memberships` ahora y dejar el import de la ficha como excepción (`EX-…`) con etapa nueva.

Además, `lib/business/memberships.ts` mezcla reglas del gimnasio con **utilidades de fechas genéricas** (`PlainDate`, `parsePlainDate`, `addMonths`, `plusDays`,
`bogotaToday`, `plainFromInstant`); `bogotaToday` existe también en `lean-engine.ts`. Esas utilidades pertenecen a Foundation y Core las necesita.

## 4. Pruebas necesarias

**Red principal:** `tsc --noEmit` (cualquier consumidor que falte rompe la compilación) y `pnpm check:layers` (las 12 excepciones E1 deben quedar «ya no se necesita» y
retirarse; el tope baja de 64 a 52).

**Existentes que ejercitan esta superficie** (14): `tenant/{db.integration, db.apu-import.integration, db.cache-invalidation, db.archived-rejection, page-authorization}`,
`construction/{flow, containers, progress, project-quotes}.integration`, `construction/apu-importer/{master-pack-import, field-changes, price-behavior}` y
`business/money-service.integration`. Casi todas necesitan base de datos: **antes de empezar hay que correrlas una vez contra una base desechable para tener una línea base**
(hoy en este entorno no hay `TEST_DATABASE_URL`).

**Nuevas, a crear antes del cambio (caracterización):**
1. Prueba de claves: `Object.keys(createTenantDb(id))` y las claves de `createConstructionDb(id)` — fija la forma antes y después.
2. Prueba de aislamiento: un negocio sin obra no obtiene propiedades de obra ni importa el código de obra (revisión por regla de capas).
3. Prueba de equivalencia de `escapeLike` (caracteres `%`, `_`, `\`) en su nueva ubicación.
4. Para el gimnasio: prueba de la ficha 360° con y sin membresías (la línea de tiempo y el estado deben ser idénticos antes y después).
5. `tenant-scope.test.ts` (aislamiento por negocio en repositorios) ya recorre `lib/`: comprobar que el archivo nuevo de construcción queda cubierto.

## 5. Orden recomendado de implementación

Cada paso es un commit pequeño y reversible; en cada uno `tsc`, `pnpm test` y `pnpm check:layers` en verde.

| Paso | Qué | Riesgo | Efecto en excepciones |
|---|---|---|---|
| 0 | Línea base: correr las 14 pruebas relacionadas contra una base desechable; añadir las pruebas de caracterización | Bajo | — |
| 1 | `escapeLike` a Foundation; construcción y gimnasio lo reexportan/importan de allí | Bajo | Resuelve R2 de `gym-db` y reduce `tenant/db → construction/shared` (adelanta parte de E2) |
| 2 | Quitar `export type * from construction/shared`; los 12 archivos de `app/` importan de `@/lib/construction/shared` (2 ya lo hacen) | Bajo (solo tipos; `tsc` lo comprueba) | — |
| 3 | `createConstructionDb(tenantId)` y mover las 10 propiedades; actualizar 26 archivos por directorios (`projects`, `quotes`, `catalog`, pruebas) | Medio | −11 excepciones |
| 4 | Gimnasio: extraer el bloque `memberships` a su fábrica; actualizar 4 consumidores | Medio | −0/−1 según la opción de ficha 360° |
| 5 | Ficha 360°: aplicar G1, G2 o G3 según lo que decidas | Medio/alto | −1 (o nueva excepción con etapa) |
| 6 | Retirar las excepciones resueltas y bajar `maxAbiertas` | Bajo | 64 → 52 (o 53) |

Los pasos 1 y 2 se pueden hacer por separado y sirven de calentamiento: no cambian comportamiento.

## 6. Decisiones que necesito antes de implementar

1. ¿Alternativa **A** (fábrica explícita) para construcción? Es la que recomiendo.
2. Ficha 360°: ¿**G1** (contrato), **G2** (la pantalla combina) o **G3** (aplazar)?
3. ¿Se adelanta `escapeLike` (paso 1, etapa E2 en el archivo de excepciones) para que forme parte de E1?
4. ¿Se exige la línea base de 14 pruebas contra una base desechable antes del paso 3? Recomiendo que sí.
5. ¿Se aprueba crear la base desechable (contenedor Postgres local) para correr las pruebas de integración? Docker y `psql` están instalados; no se usaron.
