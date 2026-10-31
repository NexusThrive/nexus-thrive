# V10 · M3 — Resultados

Ejecutado en la rama local `chore/HU-esquema-prisma-modular-01`, a partir de [`V10-revision-post-M0-M2.md`](V10-revision-post-M0-M2.md) (commit `3d43dcd`) y de la autorización de M3 (P-1…P-13).
Sin push, PR, merge ni despliegue. **Solo M3**; M4–M8, `SectorView`, D-V10-9, `hasMemberAccess()`, la auditoría, `tenant/db.ts` y `lib/construction` no se tocaron.

## Qué hizo M3

`lib/business` deja de ser un cajón: sus 24 archivos (más 2 de `lib/catalog`) pasan a módulos con una responsabilidad. Solo cambia la ubicación; no se editó lógica ni exportaciones.

| Módulo | Archivos de producción | Pruebas que viajan con él |
|---|---|---|
| `business/scheduling` | `bookings-db`, `calendar` | — |
| `business/customers` | `customers-db`, `customer-fields`, `customer-notes` | — |
| `business/catalog` | `products-db`, `catalog-kinds`, y de `lib/catalog/`: `catalog-db`, `barcode` | `barcode.test`, `catalog.integration.test` |
| `business/sales` *(documentos + dinero, P-1)* | `commercial-document`, `documents-db`, `invoice`, `invoices-db`, `charge`, `receipt-qr`, `receipt-share`, `accounting-port`, `fiscal-port`, `numbering-port`, `money-service`, `money`, `money-error`, `cash`, `finance-db` | `commercial-document.test`, `receipt-qr.test`, `adjustment-notes`, `documents`, `money-service` y `qr-read` (integración) |
| `foundation` | `countries.ts` → `lib/foundation/countries.ts` | — |
| `inventory` | `inventory.ts` → `lib/inventory/inventory.ts` | — |

`lib/business/business.test.ts` se queda en la raíz de `lib/business`: prueba funciones puras de varios módulos a la vez (caja, inventario, facturas, dinero, catálogo, países, clientes, agenda) y partirla habría sido modificar la prueba. Sus importaciones apuntan ahora a los módulos nuevos. `lib/catalog/` desapareció.

### Por qué `sales` junta documentos y dinero

Los dos módulos propuestos se importaban mutuamente (`money-service → documents-db`; `charge` e `invoices-db → money-service`). Separarlos habría creado un ciclo entre módulos nuevos (P-1). Quedan juntos: 15 archivos, ~1 900 líneas, un solo componente conexo. `money-service` permanece en `business` (P-2).

## Commits (todos locales)

| Commit | Alcance |
|---|---|
| `8f640dc` | Preparación: el verificador detecta **unidades inexistentes** de `layers.json` (P-10); se retira la huérfana `lib/vertical-terms.ts` (H-1); [`V10-decisiones.md`](../decisions/V10-decisiones.md) |
| `4ff7ce6` | `business/scheduling` (2 archivos) |
| `cf3d5e2` | `business/customers` (3 archivos) |
| `5cdd9ea` | `business/catalog` (6 archivos, incluidas 2 pruebas); se retira la unidad `lib/catalog` |
| `de0b179` | `business/sales` (21 archivos, incluidas 6 pruebas); se actualiza la regla de `eslint.config.mjs` |
| `8cdc639` | `countries.ts` → Foundation |
| `13c10b3` | `inventory.ts` → Inventario |

## Archivos movidos y referencias actualizadas

- **34 archivos movidos** con `git mv` (26 de producción y 8 pruebas colocadas): el historial se conserva.
- **106 archivos** distintos con referencias reescritas: **164 importaciones absolutas** (incluidas las dinámicas `import()` de `lib/inventory/operations.ts`), **41 relativas** y **17 rutas literales** en comentarios y pruebas.
- **Herramienta:** un codemod determinista (primero simula, luego aplica) que resuelve cada especificador contra el sistema de archivos, cubre `from`, `export … from`, `import()`, `vi.mock`/`importActual`, `require` y cualquier cadena `@/lib/…` o relativa que apunte a un archivo movido (p. ej. la regla de ESLint) y reescribe rutas literales `lib/…` en código y comentarios. No hay copias ni reexportaciones en las rutas antiguas.
- **Configuración:** `eslint.config.mjs` (la regla que prohíbe `moneyTransaction` en `app/`) apuntaba a `@/lib/business/money-service`; ahora apunta a `@/lib/business/sales/money-service`. Se comprobó con una sonda temporal que el error sigue saltando y una prueba nueva lo fija.
- **Pruebas autorizadas (P-4):** `tests/architecture/layers.test.ts` y `e3-dominios.test.ts` citaban `lib/business/customers-db.ts` (y `layers.test.ts` una fuente sintética `../business/customers-db`), y `v10-verificador.test.ts` citaba `lib/business/money-service.ts`. Se cambió **solo la ruta**; las aserciones son las mismas. Además, otras pruebas unitarias y de integración (en `lib/*` y `tests/integration/*`) cambiaron **solo** su línea de importación: no se pudo evitar, porque importan módulos movidos. Se comprobó que ninguna línea modificada en pruebas es distinta de una ruta.

## Verificación

| Comprobación | Resultado |
|---|---|
| `pnpm verify` | **Verde tras cada etapa** (siete veces: preparación, scheduling, customers, catalog, sales, countries, inventory) |
| Pruebas unitarias finales | 114 archivos / 1 725 pasan (407 omitidas = integración) |
| Pruebas de integración finales (base desechable propia) | 66 archivos / 413 pasan |
| `pnpm check:layers` | 289 archivos, 0 dependencias, **0 excepciones (tope 0)**, 0 ubicaciones incoherentes, **0 unidades huérfanas**, 0 ciclos de valores, **3 de solo tipos (tope 3, sin aumentar)** |
| Exportaciones | **26 archivos, 196 exportaciones: idénticas antes y después** (AST de TypeScript, comparadas archivo a archivo con su ruta nueva) |
| Operaciones y OpenAPI | Las **15 operaciones y el documento OpenAPI** son idénticos byte a byte antes y después de cada etapa |
| Puertos | Los siete siguen conectados (`e5-puertos` y `v10-composicion` pasan); `accounting`, `fiscal` y `numbering` conservan su nombre y su conexión en `lib/runtime/ports.ts` |
| Prisma y migraciones | **Sin cambios** (`git diff` vacío en `prisma/` y `migrations/`) |
| Datos | No se ejecutó ninguna consulta contra bases reales; el entorno fue un contenedor PostgreSQL desechable propio |

Pruebas nuevas: 11 de arquitectura en `tests/architecture/v10-business.test.ts` (cada archivo en su módulo, ninguna ruta antigua en código ni configuración, importaciones relativas válidas, sin ciclos entre módulos de `business`, regla de ESLint apuntando a un archivo real, `countries` en Foundation, `inventory` en Inventario, `lib/business` solo con las cuatro subcarpetas) y 3 del verificador (unidades huérfanas).

## Diferencias con lo previsto (y su justificación)

1. **`sales` en vez de `documents` + `money`:** ciclo entre ambos (P-1).
2. **Criterio de aceptación ajustado.** En la preparación escribí «el grafo interno de cada módulo tiene un solo componente». Es falso para `scheduling`, `customers` y `catalog`: agrupan archivos por **responsabilidad**, no porque se importen entre sí (`bookings-db` y `calendar`, por ejemplo, son independientes). Lo que sí se exige y se comprueba: ningún ciclo entre módulos y cada archivo en su módulo. `sales` sí es un solo componente.
3. **Nueva arista permitida:** `catalog → inventory` (`products-db` usa las reglas de existencias). No hay ciclo.
4. **El ciclo de tipos `sales/money-service ⇄ inventory/stock-service` se conserva** (tope 3, igual que antes). Resolverlo es una etapa propia.

## Riesgos y pendientes

- **Ramas paralelas:** cualquier rama que importe las rutas antiguas tendrá que actualizarse con el mismo codemod; `integracion/local-revision` no se integra (P-13).
- **Documentación viva con rutas antiguas** (pasada documental independiente, P-12): `docs/wiki/09-desarrollo/nueva-funcionalidad.md`, `docs/wiki/10-pruebas-y-calidad/pruebas.md`, `docs/PENDIENTES.md`, `docs/nexus-architecture/*`, `.docs/arquitectura-v2/*`, y los informes de etapas anteriores (que se conservan tal cual por ser históricos). Hay además un comentario con ruta antigua en `prisma/schema/business/sales.prisma` (no se tocó Prisma) y una cita genérica `lib/business/*-db.ts` en `DESIGN.md`.
- **`lib/business/business.test.ts`** queda en la raíz de `lib/business`; su destino se decide en la migración de pruebas.
- **`receipt-share.ts`** (canvas del navegador) está dentro de `sales`; es código de cliente que importan componentes. No cambió de naturaleza.

## Estado de las decisiones: aprobadas, implementadas y pendientes

Detalle completo en [`V10-decisiones.md`](../decisions/V10-decisiones.md). Resumen de lo que M3 toca:

| Estado | Qué |
|---|---|
| **Aprobadas e implementadas en M3** | P-1 (`business/sales`), P-2 (`money-service` en `business/sales`), P-3 (`countries` → Foundation, `inventory` → Inventario), P-4 (rutas de las pruebas de arquitectura), P-10 (unidades huérfanas) |
| **Aprobadas, vigentes y sin cambios que implementar** | P-6 (el enum se mantiene), P-9 (M6c-a: no tocar la auditoría), P-13 (no integrar `integracion/local-revision`) |
| **Aprobadas, NO implementadas** | D-V10-9 (acceso de socios por módulo activo), P-5 (`SectorView`), P-7 (permisos `members.*`), P-8 (comprobación de solo lectura previa) — todas para M7; P-11 (mover la composición de suscriptores, pospuesta); P-12 (pasada documental sobre rutas antiguas) |
| **Propuestas documentadas, a confirmar en su etapa** | Q-3 (`domains/finance/<módulo>`, M5), Q-7b (`benefits` → `platform/benefits`, M4, con el prerrequisito de extraer `withinLimit`), Q-7a (`presence` y `growth` se quedan), Q-8 (sin `extensions/`) |
| **Pendientes de autorización** | M4, M5, M6, M7 y M8 completas. Ninguna se inició |

`lib/domains/` y `lib/platform/` **no existen** y no se crean por estas decisiones.

## Qué queda preparado

- M4 (`platform`) y M5 (`finance` → `domains`) se apoyan en el mismo codemod y en el detector de unidades huérfanas.
- M7 ya tiene el registro de sectores y el contrato `SectorView` aprobado; los permisos `members.*` y la comprobación de solo lectura de D-V10-9 siguen pendientes de ejecutarse en M7.

**No se inició ninguna etapa posterior a M3.**
