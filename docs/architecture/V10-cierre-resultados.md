# V10 — Resultados del cierre, por etapa

Informe acumulado de las etapas del [plan de cierre](V10-plan-de-cierre.md). Cada etapa añade una sección: un commit principal, una verificación completa y los problemas encontrados. Decisiones asociadas: [`V10-decisiones.md`](V10-decisiones.md) §8. Rama local `chore/HU-esquema-prisma-modular-01`, sin push, PR, merge ni despliegue.

## Avance hacia la meta

| Etapa | Estado | Commit |
|---|---|---|
| I · integrations | **Hecha** | `d406c29` |
| B · business | **Hecha** (con excepción temporal documentada) | `5ce3a33` |
| N · construction | **Hecha** | `748ff50` |
| X · experience | **Hecha** | `7221fc2` |
| C · core | **Hecha** | `1ca590a` |
| F · foundation | **Hecha** | ver §6 |
| Z · remate | Pendiente | — |

La raíz de `lib/` pasó de 66 entradas (inicio de M5) a 18 tras la etapa F (14 carpetas y 4 archivos). La meta es: las nueve áreas y los dos archivos documentados `utils.ts` y `cn.ts`.

## 1. Etapa I · integrations (`d406c29`)

`lib/providers`, `lib/einvoice`, `lib/google` y `lib/maps` → `lib/integrations/<módulo>`.

| | |
|---|---|
| Archivos movidos | 26 (16 de producción y 10 pruebas), con `git mv` |
| Archivos con referencias reescritas | 19 (29 alias, 36 relativas, 1 literal) |
| Capas | Se retiran 4 unidades de `layers.json`; el área se deduce de la ruta |
| Pruebas nuevas | `tests/architecture/v10-integrations.test.ts` (7); ajustes en `tenant-scope` (`PLATFORM_FILES`) y en la prueba de `payments` |
| Exportaciones | 68 de 16 archivos, idénticas |
| Verificación | `pnpm verify` verde; unitarias 118 archivos y 1 793; integración 66 archivos y 413; contrato idéntico; copia limpia con 0 errores de `tsc`; 4 mutaciones detectadas |
| Problemas | Ninguno |

## 2. Etapa B · business

`lib/inventory`, `lib/purchasing`, `lib/pos`, `lib/store`, `lib/data-exchange`, `lib/growth` y `lib/presence` → `lib/business/<módulo>`. Con esto `lib/business/` tiene los once módulos del diseño: `catalog`, `customers`, `data-exchange`, `growth`, `inventory`, `pos`, `presence`, `purchasing`, `sales`, `scheduling`, `store`.

| | |
|---|---|
| Archivos movidos | 58 (35 de producción y 23 pruebas), con `git mv` |
| Archivos con referencias reescritas | 80 (114 alias, 65 relativas, 12 literales) |
| Capas | Se retiran 8 unidades de `layers.json` (las 7 carpetas y la unidad `lib/business`, redundante): el área se deduce de la ruta |
| Aislamiento por negocio | Las 5 excepciones de `tenant-scope.test.ts` de estos módulos (`presence`, `growth`, `store`) siguen con su ruta nueva; ninguna carpeta se añadió a las exclusiones |
| Pruebas | `tests/architecture/v10-business-completo.test.ts` (20 pruebas: los once módulos, carpetas de origen inexistentes, área por ruta, sin unidades viejas); en `v10-business.test.ts`, la lista de módulos de M3 ampliada a once y la prueba de ciclos con la excepción puntual (más una prueba que fija las cuatro dependencias exactas); `v10-platform.test.ts` ya no enumera `lib/data-exchange` |
| Exportaciones | 241 de 35 archivos, idénticas |
| Verificación | `pnpm verify` verde; unitarias 119 archivos y 1 814 (base de la etapa 1 793); integración 66 archivos y 413; contrato (15 operaciones + OpenAPI) idéntico; Prisma y migraciones sin cambios; `check:layers`: 290 archivos, 0 violaciones, 0 excepciones, 3 ciclos de tipos |

### Excepción temporal: ciclo `inventory ⇄ sales`

Al juntar los módulos aparece un ciclo entre módulos que la prueba de M3 («los módulos de business no forman ciclos entre sí») rechazó. El dueño aceptó la **excepción temporal y puntual** (opción A): ver [`V10-decisiones.md`](V10-decisiones.md) §8.1. Resumen: cuatro dependencias exactas (tres `inventory → sales`, de valor y de tipo, y una `sales → inventory` de valor); ya identificada en M3; **deuda arquitectónica pendiente, no una solución**; la prueba permite solo ese par y exige que sus dependencias sean exactamente esas.

### Problemas encontrados

1. **Contradicción con el diseño (P-1):** el ciclo anterior. Se documentó y se detuvo la etapa hasta recibir la decisión.
2. **Expresiones regulares con rutas** dentro de `v10-finance.test.ts` (`data-exchange/table`, `store/store-settle`): el codemod no reescribe rutas dentro de una cadena que es una expresión regular; se corrigieron a mano y las pruebas las habrían delatado si no.
3. **Error propio:** ejecuté un `git stash` por equivocación durante un análisis. Lo detecté de inmediato y restauré con `git stash pop --index`; se comprobó que el stash quedó vacío y que el árbol conservaba los 58 renombrados y todos los cambios.

## 3. Etapa N · industry/construction

`lib/construction` → `lib/industry/construction`. Con esto `lib/industry/` contiene los tres sectores: `construction`, `gym` y `museum`.

| | |
|---|---|
| Archivos movidos | 57 (39 de producción y 18 pruebas, incluida la subcarpeta `apu-importer`), con `git mv` |
| Archivos con referencias reescritas | 82 (155 alias, 64 relativas, 13 literales) |
| Capas | Se retira la unidad `lib/construction` de `layers.json`: el sector se deduce de la ruta (`lib/industry/<sector>/`). Las reglas R1 (nadie importa una industria salvo experience y runtime) y R2 (un sector no importa a otro) siguen vigentes |
| Aislamiento por negocio | Las 4 excepciones de `tenant-scope.test.ts` sobre `shared.ts` siguen con la ruta nueva; `construction` no se añadió a las exclusiones |
| Pruebas | `tests/architecture/v10-construction.test.ts` (4): los tres sectores, carpeta de origen inexistente, clasificación por ruta, sin unidades viejas, y rutas explícitas de `test-integration.sh` |
| Exportaciones | 332 de 39 archivos, idénticas |
| Verificación | `pnpm verify` verde; unitarias 120 archivos y 1 818 (base de la etapa 1 814; +4 de `v10-construction`); integración 66 archivos y 413; contrato (15 operaciones + OpenAPI) idéntico; Prisma y migraciones sin cambios; `check:layers`: 290 archivos, 0 violaciones, 0 excepciones, mismos 3 ciclos de tipos (los dos de `auth` y `dashboard` y `inventory ⇄ sales`) y ningún ciclo nuevo |

### Problemas encontrados

1. **Pérdida silenciosa de 2 pruebas de integración (corregida).** `test-integration.sh` lista a mano dos pruebas del importador de APU (`price-behavior` y `field-changes`). Vitest filtra por texto, así que al mover la carpeta esas rutas dejaron de existir y las dos pruebas **dejaron de ejecutarse sin ningún error** (la integración pasó de 66 archivos y 413 pruebas a 64 y 406, y `pnpm verify` seguía en verde). Se detectó al comparar el recuento, se actualizaron las rutas del script y la integración volvió a 66 y 413. Para que no se repita, `v10-construction.test.ts` exige ahora que cada ruta explícita del script exista. En las etapas I, B y M5 el recuento se mantuvo en 66 y 413, así que no hubo pérdidas. **La etapa C moverá `lib/tenant/db.*.test.ts`, que el script también lista: la nueva prueba lo hará fallar de forma visible si no se actualiza.**
2. **Referencias que el codemod no reescribe** (cadenas que no son rutas completas): una expresión regular de `e1-core-industria` (habría dejado de vigilar que `tenant/db.ts` no importa construcción), una fuente sintética de `layers.test.ts`, un filtro de `v10-sectores.test.ts` y un comentario de `app/`. Corregidas a mano, conservando lo que vigila cada una.
3. **Documentación:** `README.md` apuntaba a `lib/construction/*` (tres líneas, actualizadas). Los demás documentos que nombran la ruta antigua (`docs/nexus-architecture/*`, `docs/construction/*`, informes E0 a E9) quedan para la pasada P-12.

## 4. Etapa X · experience

`dashboard`, `site`, `motion`, `hooks`, `payment-input`, `fonts.ts` y la parte de interfaz de `navigation` (`quick-create`, `tenant-nav`) → `lib/experience/<módulo>`.

| | |
|---|---|
| Archivos movidos | **34** de los 35 previstos (25 de producción y 9 pruebas), con `git mv` |
| Archivos con referencias reescritas | 96 (117 alias, 35 relativas, 4 literales) |
| Qué NO se movió, y por qué | `lib/navigation/nav-types.ts` sigue siendo **Core** (decisión E-5: los tipos compartidos se quedan en Core); pasará a `core/capabilities` en la etapa Z. El flujo de `onboarding` se deja entero para la etapa Z, porque se reparte entre Core (`types`, `validation`, `presets`, `slug`, `onboarding-db`) y Experience, y conviene dividirlo una sola vez |
| Capas | Se retiran 7 unidades de `layers.json` (`fonts`, `navigation`, `motion`, `hooks`, `payment-input`, `site`, `dashboard`); se conserva la de `nav-types.ts` (Core). El área se deduce de la ruta |
| Fronteras | El informe de dependencias entre áreas es **idéntico** al anterior (`experience → core` 29, `→ domains` 1, `→ foundation` 8, `→ industry` 1…); solo cambia el nombre de la ruta de uno de los 3 ciclos de tipos conocidos (`dashboard/chart-catalog ⇄ layout`). La única arista `experience → industry` es la ya autorizada por la regla R1 |
| Pruebas | `tests/architecture/v10-experience.test.ts` (16): módulos exactos, carpetas de origen inexistentes, `navigation` solo con `nav-types.ts` (Core), área por ruta, sin unidades viejas y fuentes locales que apuntan a archivos reales |
| Exportaciones | 152 de 25 archivos, idénticas |
| Verificación | `pnpm verify` verde (incluido `next build`); unitarias 121 archivos y 1 834 (base de la etapa 1 818; +16 de `v10-experience`); integración **66 archivos y 413** (sin cambios); contrato (15 operaciones + OpenAPI) idéntico; Prisma y migraciones sin cambios; `check:layers`: 290 archivos, 0 violaciones, 0 excepciones, mismos 3 ciclos de tipos |

### Problemas encontrados

1. **`next build` falló y nada más lo detectó (corregido).** `fonts.ts` carga las fuentes con `next/font/local` y una ruta **relativa al propio archivo** (`../app/fonts/…`); al bajarlo un nivel la ruta dejó de resolver. `tsc`, las pruebas de arquitectura y las 1 833 unitarias pasaban; solo falló `next build` («Font file not found»). Se ajustaron las dos rutas (`../../app/fonts/…`) y se añadió una prueba que exige que cada fuente declarada exista. Revisé el resto de archivos movidos: no hay otras rutas relativas a archivos (`new URL`, `__dirname`, `readFileSync`). En las etapas anteriores el build se ejecutó en cada `pnpm verify` y pasó.
2. **Carrera de arranque de mi base desechable (infraestructura, no código).** La primera integración falló en 65 archivos porque creé la base mientras Postgres reiniciaba tras su inicialización («database system is shutting down») y `nexus_e5_test` no llegó a existir. Se recreó el contenedor esperando a que la inicialización termine; la integración dio 66 archivos y 413 pruebas.
3. **Referencias que el codemod no reescribe:** rutas de `payment-input` dentro de plantillas de texto de `v10-finance.test.ts` y comentarios en `app/styles/motion.css`, `components/docs/movimiento.mdx` y `lib/plans/pricing.ts`. Actualizadas. Los documentos de `docs/` con la ruta antigua quedan para P-12.

## 5. Etapa C · core

Las doce carpetas de Core que seguían en la raíz de `lib/` → `lib/core/`:

| Antes | Ahora |
|---|---|
| `tenant` | `core/tenancy` |
| `auth`, `parties`, `files`, `events`, `operations` | `core/<mismo nombre>` |
| `plans` + `usage` | `core/entitlements` |
| `capabilities` | `core/capabilities` |
| `functions` | `core/capabilities/discovery` |
| `api` | `core/api` |
| `mcp` | `core/api/mcp` |

`lib/core/` contiene ahora sus diez módulos: `api`, `auth`, `capabilities`, `entitlements`, `events`, `files`, `operations`, `parties`, `sectors` y `tenancy`.

| | |
|---|---|
| Archivos movidos | 97 (56 de producción y 41 pruebas), con `git mv`; sin colisiones de nombre al fusionar `plans` y `usage` |
| Archivos con referencias reescritas | 303 (550 alias, 88 relativas, 62 literales) |
| Capas | Se retiran 12 unidades de `layers.json` (las doce carpetas). `api` y `mcp` dejan de ser **Integrations** y `functions` deja de ser **automation**: pasan a Core por su ruta. La capa `automation` queda sin archivos (se retira de `layers.json` en la etapa Z) |
| Fronteras | Core sigue importando solo Foundation: 0 violaciones. La matriz entre áreas cambia únicamente por la reclasificación (`automation → core` 4 y `automation → foundation` 2 desaparecen y pasan a Core; `integrations → core` 12→6 y `runtime → integrations` 6→4 porque `api`/`mcp` ya son Core; `core → foundation` 25→28; `runtime → core` 15→17). **No aparece ninguna arista nueva hacia o desde Core** |
| Aislamiento por negocio | `tenant-scope.test.ts` (ahora en `lib/core/tenancy/`) sigue vigilando todo `lib/`; sus excepciones y `PLATFORM_FILES` apuntan a rutas nuevas |
| Ciclos | Los mismos 3 de tipos (`auth/permissions ⇄ roles`, `inventory ⇄ sales` y `dashboard`), solo con la ruta renombrada; la excepción exacta `inventory ⇄ sales` no se tocó ni se amplió; 0 ciclos de valores |
| Pruebas | `tests/architecture/v10-core.test.ts` (28): los diez módulos, las doce carpetas de origen inexistentes, `api/mcp` y `capabilities/discovery`, área por ruta sin unidades, sin unidades viejas, `nav-types`/`onboarding/types` aún en Core fuera de `lib/core`, y rutas del script de integración |
| Exportaciones | 287 de 56 archivos, idénticas |
| Verificación | `pnpm verify` verde (incluido `next build`); unitarias 122 archivos y 1 862 (base de la etapa 1 834; +28); integración **66 archivos y 413** (sin pérdidas); contrato (15 operaciones + OpenAPI) idéntico; Prisma y migraciones sin cambios; `check:layers`: 290 archivos, 0 violaciones, 0 excepciones |

### Qué NO se tocó (según lo acordado)
`nav-types.ts` sigue en `lib/navigation/` (pasa a `core/capabilities` en Z, E-5) y el flujo de `onboarding` queda entero para Z.

### Problemas encontrados

1. **Import relativo a un `.mjs` roto (corregido).** `data-access.test.ts` importa `../../eslint/legacy-db-access.mjs`; el codemod solo resuelve TypeScript y no lo reescribió. Lo detectó `tsc`. Se ajustó a `../../../eslint/…`. Revisé todo el repositorio en busca de más imports relativos o de alias que no resuelvan: no hay otros reales (solo cadenas sintéticas de fixtures que ya existían).
2. **Dos comprobaciones que habrían quedado vacías sin avisar (corregidas).** En `e3-dominios.test.ts`, «`lib/operations/definitions/*.ts` ya no existe» comprobaba una carpeta que dejó de existir, así que siempre habría pasado; ahora apunta a `lib/core/operations/definitions/`. Lo mismo con `v10-composicion.test.ts` (se añaden las rutas nuevas a las ubicaciones que no deben existir), con las fuentes sintéticas de `layers.test.ts` (R1 y R3 de Core) y con la expresión regular de `v10-sectores.test.ts` (capacidades permitidas al registro de sectores). `v10-platform.test.ts` enumeraba seis carpetas de Core; ahora recorre `lib/core` entera (cubre más que antes) y sigue sin ofensores.
3. **Script de integración:** las dos pruebas de `lib/tenant` que lista `test-integration.sh` se actualizaron a `lib/core/tenancy/…`. La integración se mantiene en 66 archivos y 413 pruebas, y la guarda de rutas explícitas sigue activa.
4. **Rutas en documentación y configuración:** actualizados `eslint/legacy-db-access.mjs` (comentario), `.github/pull_request_template.md` (dos rutas) y `app/globals.css` (comentario). **No se tocaron** los comentarios de `prisma/schema/**` que nombran `lib/plans` y `lib/capabilities` (Prisma no se modifica) ni los documentos de `docs/` (pasada P-12).
5. **Sin hallazgos de rutas en tiempo de ejecución:** las pruebas movidas calculan la raíz con `process.cwd()`, no con rutas relativas al archivo; en el código de producción movido no hay `__dirname`, `import.meta` ni lecturas de archivos.

## 6. Etapa F · foundation

Las utilidades puras sueltas en la raíz de `lib/` → `lib/foundation/`:

| Antes | Ahora |
|---|---|
| `plain-date`, `bogota-month`, `calendar` | `foundation/dates/` |
| `db-errors`, `db-transaction`, `sql-like` | `foundation/db/` |
| `format`, `qr`, `rate-limit`, `ports`, `app-url`, `contact`, `image-upload`, `init-scripts` | `foundation/<mismo nombre>` (planos) |

Con `kernel/`, `countries.ts` y `limits.ts` (ya existentes), `lib/foundation/` queda con tres subcarpetas (`kernel`, `dates`, `db`) y los archivos planos (decisión E-2: carpeta solo con tres o más archivos relacionados).

| | |
|---|---|
| Archivos movidos | 16 (14 de producción y 2 pruebas), con `git mv` |
| Archivos con referencias reescritas | 172 (192 alias, 1 relativa, 5 literales); `format` lo importaban unos 108 archivos |
| Capas | Se retiran 14 unidades de `layers.json`; el área se deduce de la ruta. Se conservan las de `utils.ts`, `cn.ts` (excepción documentada, E-3) y `temporal.d.ts` (se mueve en Z) |
| Fronteras | El informe de dependencias entre áreas es **idéntico** al anterior (misma matriz, mismos ciclos): Foundation sigue sin importar ninguna otra área |
| Pruebas | `tests/architecture/v10-foundation.test.ts` (24): `dates/` y `db/` exactos, archivos planos y kernel, nada de lo movido en la raíz, la raíz solo conserva archivos con excepción documentada, área por ruta sin unidad, sin unidades viejas |
| Exportaciones | 56 de 14 archivos, idénticas |
| Verificación | `pnpm verify` verde (incluido `next build`); unitarias 123 archivos y 1 886 (base de la etapa 1 862; +24); integración **66 archivos y 413** (sin pérdidas); contrato (15 operaciones + OpenAPI) idéntico; Prisma y migraciones sin cambios; `check:layers`: 290 archivos, 0 violaciones, 0 excepciones; mismos 3 ciclos de tipos y la excepción exacta `inventory ⇄ sales` sin cambios |

### Problemas encontrados

1. **Rutas dentro de expresiones regulares y cadenas de `v10-finance.test.ts`** (con barras `\/` escapadas y sin escapar): `plain-date`, `format` y `ports` aparecen en las listas de imports permitidos de `tax`, `accounting`, `receivables` y `payments`. El codemod no las reescribe; las habría delatado la prueba, pero se corrigieron antes (6 sustituciones) y una búsqueda posterior de ambas formas de escritura no deja ninguna.
2. **Sin hallazgos de rutas en tiempo de ejecución:** los archivos movidos no usan `import.meta`, `__dirname`, `process.cwd`, lecturas de archivos ni rutas relativas a recursos.
3. **Pendiente de la raíz de `lib/`** (etapa Z; el dueño precisó que la raíz debe tener solo lo importante, plan de cierre §10): `temporal.d.ts`, `admin`, `design`, `navigation` (solo `nav-types.ts`), `onboarding`, `seo`, la capa `automation` sin archivos en `layers.json` y la prueba `prisma8-query-patterns`.
4. **Mutación de validación mal construida (mía, sin impacto):** al añadir un `import` al final de `lib/foundation/format.ts` el verificador no lo detectó porque ese archivo no termina en salto de línea y el `import` quedó pegado a la última línea; con el salto de línea previo falla con `R3-foundation-no-importa-core`. No es un hueco de la regla.

