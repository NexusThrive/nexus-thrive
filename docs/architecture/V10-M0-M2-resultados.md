# V10 · M0–M2 — Resultados

Ejecutado en la rama local `chore/HU-esquema-prisma-modular-01`, a partir del diseño de [`V10-arquitectura-fisica.md`](V10-arquitectura-fisica.md) (commit `0600214`).
Sin push, PR, merge ni despliegue. **Solo M0, M1 y M2**; M3–M8 no se tocaron.

## Decisiones aprobadas y cómo se aplicaron

| Decisión (según la autorización) | Estado |
|---|---|
| D-V10-1 · sustituye a D-1: reorganización física incremental de `lib/` | **Aplicada** en M0 (`layers.json` lo declara) y ejecutada solo para M1 y M2 |
| D-V10-2 · modelo de áreas, módulos y sectores | **Aplicada** en M0: `areas`, capas `domains` y `runtime`, áreas por ruta |
| D-V10-3 · reglas de dependencia entre áreas | **Aplicada** en M0 (`mayImport`, R1 con `runtime`) |
| D-V10-4 · terminología / capacidades / procesos | **Aplicada como principio** en M2 (`lexicon.ts` documenta el límite; el registro guarda términos, módulos y la bandera de acceso). Los procesos sectoriales llegan con M7 |
| D-V10-5 · sector desconocido = general | **Aplicada** en M2 |
| D-V10-6 · criterios para crear/dividir/fusionar/reubicar/retirar | **Adoptados**; se usaron para decidir M1 y M2. Su script de reporte quedó dentro de `check-layers --report` |
| D-V10-7 · registro explícito de sectores, desacoplado | **Aplicada** en M2 (`registry.ts` + `runtime/sectors.ts`) |
| D-V10-8 · estructura objetivo e incrementalidad | **Adoptada**; M2 crea la primera carpeta de área (`lib/core/`) |
| D-V10-9 · acceso de socios por módulo activo, respetando permisos | **Adoptada, NO implementada**: cambia el comportamiento de la ficha 360° y pertenece a M7. `hasMemberAccess` sigue como estaba |

## Verificaciones especiales (sin cambiar comportamiento)

### `terms.booking` en construcción

- `terms.booking` (singular) **no lo lee nadie** en `app/`, `components/` ni `lib/`.
- `terms.bookings` (plural) lo leen **dos consumidores, ambos del módulo Reservas**: la etiqueta del menú de la capacidad `bookings` (`registry.ts`) y el título de `app/[tenant]/(app)/bookings/page.tsx`.
- La receta de construcción **no incluye el módulo `bookings`** (ni la de carpintería, restaurante, tienda y ferretería), y `bookings` no es una capacidad general. Por eso hoy esos textos («Proyecto/Proyectos») **no se muestran** en construcción.
- Riesgo residual: si un administrador contratara Reservas en un negocio de construcción, la agenda se llamaría «Proyectos», que además es el nombre del módulo de obras («Obras»). Es la ambigüedad señalada en V10 §3.2 (H6).
- **No se cambió nada**: M2 movió los términos tal cual. Decisión pendiente: retirar `booking/bookings` de los sectores que no usan Reservas, o dejar que el módulo use su nombre propio.

### Auditoría

Hay **tres escritores de `AuditLog`** y un envoltorio, con contratos distintos:

| Escritor | Quién actúa | Falla | Particularidades |
|---|---|---|---|
| `admin/db.ts#logAudit` | Quien llama lo pasa completo (staff) | **Lanza** | Inserción genérica; acepta cualquier acción de `AuditAction`, IP y agente |
| `ops/audit.ts#logOps` (envoltorio del anterior) | Personal de Nexus (`StaffContext`) | Se traga el error | Añade IP y agente desde las cabeceras |
| `tenant/audit.ts#logTenantAction` | Miembro del negocio (Clerk + `memberId`/rol en metadata) | Se traga el error | Solo acciones `BIZ_*`; destino = el negocio |
| `operations/audit.ts#auditOperation` | API key, MCP o automatización (`actorType`, `apiKeyId`, `requestId`) | Se traga el error | Acción fija `BIZ_API_OPERATION`; solo guarda los nombres de los campos |

**Conclusión:** comparten la tabla y la política «no romper la acción» (tres de cuatro), pero **no un contrato**: difieren en el modelo de actor, en las columnas que llenan y en la semántica de fallo (`logAudit` lanza). Son responsabilidades independientes sobre un destino común. **No se fusionaron ni reorganizaron.** Una función de escritura común solo es viable si primero se decide la política de fallo y el modelo de actor; queda fuera de M0–M2 (la fusión M6c de V10 debe rehacerse con esta conclusión: como mucho, un `writeAuditLog` interno compartido por las cuatro, no una unificación).

## M0 — Verificador arquitectónico (`57a4668`)

Se amplió `scripts/check-layers.mjs`; **no hay una segunda herramienta** (sigue siendo `pnpm check:layers`, que ya corre en `pnpm test` y `pnpm verify`).

- **Áreas por ruta:** `lib/<área>/…` pertenece a esa área sin necesitar una unidad (`areas` en `layers.json`); en `industry`, el sector es la carpeta siguiente. Si una unidad lo clasifica distinto: «ubicación incoherente», falla.
- **Ciclos:** de valores (imports estáticos que no son de tipo): **prohibidos**. De solo tipos: tope `maxCiclosDeTipos` que solo puede bajar (también falla si el número real es menor que el tope). Los `import()` dinámicos no cuentan.
- **Capas nuevas:** `domains` (sin archivos todavía) y `runtime`; `lib/runtime` pasa a `runtime`. R1: `runtime` puede componer industrias, como `experience`.
- **Reproducible:** `--json` y `--report` ordenados y sin fechas; `--report` suma la matriz de dependencias entre capas y los ciclos.
- **Cero excepciones:** una prueba fija `maxAbiertas = 0`. El verificador solo lee; una prueba comprueba que no contiene escrituras ni ejecución de procesos.
- No se implementó la lista de superficie pública por módulo (`module.json`, V10 §6.4): es opcional y ningún módulo la necesita todavía.

## M1 — Raíz de composición (`d8a0600`)

- `lib/operations/registry.ts` → `lib/runtime/operations.ts` (con su prueba); mismas exportaciones; 16 importadores.
- `lib/api/runtime-deps.ts` → `lib/runtime/api-deps.ts` (reúne API, uso, auditoría e inquilino con datos reales). Era necesario: el módulo de la API no puede importar la capa `runtime`.
- `composePorts`, `instrumentation.ts` y `vitest.setup.ts` **sin cambios de comportamiento**; los puertos siguen fallando de forma visible.
- Revisión de conexiones: 7 puertos, cada uno conectado una vez; ningún archivo de `lib/` importa `lib/runtime`; solo tres puntos de entrada de `app/` lo usan (las dos rutas de la API y las acciones de llaves).

## M2 — Catálogo de sectores (`81fa625`)

| Antes | Ahora |
|---|---|
| `lib/admin/catalogs.ts` (562 líneas: sectores, módulos, vocabulario, pagos, slugs) | `lib/core/sectors/{verticals,lexicon,catalog,registry,terms}.ts` + `lib/capabilities/modules.ts`; `catalogs.ts` conserva medios de pago y slugs (98 líneas) |
| `lib/vertical-terms.ts` | `lib/core/sectors/terms.ts` |
| Sector desconocido → receta de gimnasio | → sector `general` (neutral) |
| Sin registro | `registerSector` / `findSector` / `getSector` / `listSectors`; `lib/runtime/sectors.ts` (`composeSectors`) es el único que registra |

- Separación: los archivos de sectores no importan `lib/admin`; el catálogo de módulos sale del registro de capacidades.
- **Ciclo de tipos eliminado** (`admin/catalogs ⇄ capabilities/registry`): tope 4 → 3.
- Un sector con código aportará `lib/industry/<sector>/sector.ts` y una línea en `runtime/sectors.ts`; una prueba falla si existe un `sector.ts` sin registrar. Hoy no hay ninguno (M7).
- **Compatibilidad:** 87 archivos cambian solo la ruta de importación (codemod por símbolo, validado con `tsc`).

### Equivalencia comprobada

Un volcado de todas las tablas (sectores, íconos, alta, alias, recetas con módulos hijos, términos, cotizaciones, módulos, etiquetas, medios de pago, slugs) antes y después es **idéntico**, salvo los tres valores desconocidos de la prueba (`""`, `desconocido`, `GYM`), que pasan de gimnasio a general: es la decisión D-V10-5.

## Archivos

- **Creados (13):** `lib/core/sectors/{verticals,lexicon,catalog,registry}.ts`, `lib/capabilities/modules.ts`, `lib/runtime/sectors.ts`, `tests/architecture/v10-{verificador,composicion,sectores}.test.ts`, `tests/unit/sectores.test.ts` y este documento.
- **Movidos (4):** `operations/registry.ts`, `operations/registry.test.ts`, `api/runtime-deps.ts` → `lib/runtime/`; `vertical-terms.ts` → `lib/core/sectors/terms.ts`.
- **Modificados:** `scripts/check-layers.mjs`, `layers.json`, `exceptions.json`, `lib/admin/catalogs.ts`, `instrumentation.ts`, `vitest.setup.ts`, `lib/runtime/ports.ts` (comentario), `tests/architecture/e3-dominios.test.ts` (ahora espera el registro en `runtime`) y 87+ archivos con solo la ruta de importación.
- **Eliminados:** ninguno (los movidos conservan su historial).

## Validación

| Comprobación | Resultado |
|---|---|
| `pnpm verify` tras M0, M1 y M2 | **Verde** las tres veces (tsc, capas, unitarias, integración, build) |
| Pruebas unitarias (sin base de datos) | 113 archivos / 1 711 pasan, 407 omitidas (las de integración) |
| Pruebas de integración (base desechable) | 66 archivos / 413 pasan |
| Pruebas nuevas | 62: verificador 18, composición 8, sectores (arquitectura) 14, sectores (unitarias) 22 |
| `pnpm check:layers` | 289 archivos, 0 dependencias, **0 excepciones (tope 0)**, 0 ubicaciones incoherentes, 0 ciclos de valores, 3 de solo tipos (tope 3) |
| Contratos públicos | Las 15 operaciones y el documento OpenAPI de `/api/v1` son **byte a byte idénticos** antes de M1 y después de M2 |
| Prisma y migraciones | Sin cambios (`git diff` vacío en `prisma/` y `migrations/`; guardián SQL: sin cambio de tablas; `enum Vertical` intacto) |
| Diff completo | Revisado por etapa; los cambios masivos son solo rutas de importación |
| Entorno | Un contenedor PostgreSQL desechable propio (tmpfs, puerto local, credenciales aleatorias), eliminado al terminar; no se tocaron `nexus-postgres` ni `nx-pg` |

Un fallo intermedio: la primera base se llamaba `nexus_v10_test` y una salvaguarda de la prueba de diagnóstico de fechas (`nexus_e<N>_test`) la rechazó; se creó `nexus_e10_test`. No se relajó ninguna restricción.

## Riesgos y limitaciones

1. **El registro es solo de servidor.** `registerSector` se ejecuta en `instrumentation.ts`; un componente de cliente que resuelva términos por su cuenta (p. ej. `buildTenantNav` en el menú) verá solo el catálogo base. Hoy no hay registros, así que no hay diferencia; con M7 los términos que vengan de una industria deben llegar al cliente desde el servidor (como `VerticalTermsProvider`). Queda documentado en `registry.ts` y probado.
2. **`enum Vertical` en Prisma** sigue limitando los ids a la lista cerrada; un sector nuevo todavía necesita una migración. Fuera de alcance (P5/P6).
3. **`VERTICAL_ICONS`** sigue en `verticals.ts` (es un emoji de presentación); `admin/vertical-icons.ts` no se movió.
4. `tenant-nav` reexporta `modulesForRoute` por compatibilidad (de E9); `catalogs.ts` aún mezcla pagos de plataforma y slugs de negocio (se separan con M4).
5. Las 87 rutas cambiadas son mecánicas; cualquier rama paralela que importe `@/lib/admin/catalogs` o `@/lib/vertical-terms` tendrá que actualizar sus imports.

## Qué queda preparado para M3–M8

- **M3 (dividir `business`)**: el verificador detecta ubicaciones incoherentes y ciclos, así que cada movimiento queda vigilado; `lib/core/` ya existe como ejemplo de área por ruta.
- **M4 (platform) / M5 (finance → `domains`)**: las capas `domains` y `platform` ya están definidas con sus reglas.
- **M7 (sectores con código)**: el registro, `composeSectors` y la prueba de «todo `sector.ts` registrado» están listos; falta mover gimnasio y museo y decidir D-V10-9 (acceso por módulo activo).
- **M6c (auditoría)**: debe rehacerse con la conclusión de arriba.
- **No se inició M3** ni ningún trabajo fuera de alcance.
