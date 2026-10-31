# V10 — Resultados del cierre, por etapa

Informe acumulado de las etapas del [plan de cierre](V10-plan-de-cierre.md). Cada etapa añade una sección: un commit principal, una verificación completa y los problemas encontrados. Decisiones asociadas: [`V10-decisiones.md`](V10-decisiones.md) §8. Rama local `chore/HU-esquema-prisma-modular-01`, sin push, PR, merge ni despliegue.

## Avance hacia la meta

| Etapa | Estado | Commit |
|---|---|---|
| I · integrations | **Hecha** | `d406c29` |
| B · business | **Hecha** (con excepción temporal documentada) | `5ce3a33` |
| N · construction | **Hecha** | `748ff50` |
| X · experience | **Hecha** | ver §4 |
| C · core | Pendiente | — |
| F · foundation | Pendiente | — |
| Z · remate | Pendiente | — |

La raíz de `lib/` pasó de 66 entradas (inicio de M5) a 47 tras la etapa X (27 carpetas y 20 archivos). La meta es: las nueve áreas y los dos archivos documentados `utils.ts` y `cn.ts`.

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

