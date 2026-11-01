# V10 — Plan de cierre: la meta, lo que falta y las decisiones

Estado: **plan ejecutado** (2026-10-31). Las siete etapas (I, B, N, X, C, F y Z) están hechas y la documentación final entregada; resultados en [`V10-cierre-resultados.md`](V10-cierre-resultados.md) y reglas vigentes en [`guia-implementacion-lib.md`](../../../wiki/03-arquitectura/guia-implementacion-lib.md) y [`reglas-dependencias.md`](../../../wiki/03-arquitectura/reglas-dependencias.md). Las tablas de este documento reflejan el plan; si difiere de lo hecho (por ejemplo `onboarding-db`, que se quedó en Experience), manda el informe de cierre. El «por qué» de la arquitectura está en [`V10-arquitectura-objetivo.md`](../../../wiki/03-arquitectura/arquitectura-objetivo.md); el diseño técnico original, en [`V10-arquitectura-fisica.md`](V10-arquitectura-fisica.md); lo hecho hasta M5, en los informes `V10-M*-resultados.md`.

## 1. La meta: cuándo V10 está terminada

V10 termina cuando se cumplen **estos siete criterios, todos medibles**. Al cumplirlos se deja de mover carpetas y se vuelve a construir producto.

| # | Criterio | Cómo se comprueba | Hoy |
|---|---|---|---|
| 1 | La raíz de `lib/` contiene **las nueve áreas** (nueve directorios) **y los dos archivos documentados `utils.ts` y `cn.ts`**; nada más (ver §10) | `ls lib` y una prueba de arquitectura | 18 entradas (14 carpetas y 4 archivos) tras la etapa F |
| 2 | Excepciones documentadas y justificadas: `lib/utils.ts` y `lib/cn.ts` (convención shadcn, 173 importadores; aprobado en E-3). `temporal.d.ts` se mueve a `foundation` en la etapa Z | Lista en este documento | aprobado |
| 3 | `check:layers`: 0 violaciones, 0 huérfanas, 0 incoherentes, **0 excepciones (tope 0)**, 0 ciclos de valores, ciclos de tipos sin aumentar | `pnpm check:layers` | cumple (290 archivos, 3 ciclos de tipos) |
| 4 | `layers.json` sin unidades por carpeta: el área se deduce de la ruta | revisión del archivo | 61 unidades (la mayoría por carpeta) |
| 5 | Contrato público, Prisma, migraciones, RLS y autenticación sin cambios; exportaciones idénticas en lo movido | contrato de 15 operaciones + OpenAPI; `storageHash`; `cmp-exports` | cumple en M0–M5 |
| 6 | `pnpm verify` completo en verde, con integración, y el mismo número de pruebas (más las de arquitectura nuevas) | `pnpm verify` | cumple |
| 7 | Documentación al día: este plan, el informe final y la pasada P-12 (rutas antiguas) | revisión | pendiente |

**Lo que NO es parte de la meta:** cambios de comportamiento, funcionalidades nuevas, Prisma P3–P6, la auditoría de aislamiento por negocio, la migración de las 151 pruebas ni dividir `tenant/db.ts`. Son trabajos aparte, ya registrados.

## 2. Dónde estamos

| Hecho (con commit) | Qué quedó |
|---|---|
| M0 verificador · M1 `lib/runtime` · M2 `core/sectors` · M3 `business` en 4 módulos · M4 `platform` con 9 módulos · M5 `domains/finance` + `foundation/kernel` + `payment-input` | Áreas completas: `runtime`, `platform`, `domains`. Parciales: `business` (4 de 11 módulos), `core` (1 de 11), `foundation` (kernel, countries, limits), `industry` (gym y museum) |

Faltan, por medición con el codemod en modo simulación, **unos 300 archivos por mover**, todos con la misma herramienta determinista que ya usamos. No hay decisiones de diseño nuevas en la mayor parte; hay un puñado de decisiones de ubicación (§6).

## 3. Por qué hemos tardado, y cómo se acorta

Honestidad sobre el ritmo: M4 y M5 movieron 83 archivos entre producción y pruebas, y cada etapa llevó diseño, informe, contenedor desechable, copia limpia, mutaciones y commit. M5 necesitó ocho commits para 35 archivos. Esa ceremonia fue útil (descubrió pruebas de Core que se habrían quedado vacías y dos fallos de mis propias pruebas; la omisión de archivos de M4 es la razón de compilar cada commit en una copia limpia), pero **el costo por archivo es demasiado alto para los ~290 que quedan**.

Se propone mantener las garantías y quitar la repetición:

1. **Lotes por área, no por módulo:** una etapa por área destino (F, I, B, X, N, C), con un solo commit de código cada una.
2. **Mismas garantías por etapa, hechas una vez:** codemod con todas las referencias (importaciones, mocks, imports dinámicos, rutas literales), `layers.json`, `pnpm verify` completo con base desechable, compilación y pruebas desde una copia limpia, exportaciones y contrato idénticos.
3. **Mutaciones solo para las reglas nuevas** de cada etapa (una o dos), no una por módulo.
4. **Un solo informe final** (`V10-cierre-resultados.md`) en lugar de uno por etapa, más una línea por etapa en la hoja de ruta.
5. **Sin documento de diseño por etapa:** el mapa de §4 y las decisiones de §6 reemplazan los diseños individuales.

Esto no reduce la verificación; reduce el papeleo y los commits intermedios.

## 4. Etapas propuestas (mover todo lo que falta)

Medición con el codemod en `--dry` (no escribe): archivos que se mueven, archivos distintos con referencias reescritas, e imports con alias reescritos. Los de producción y los de prueba van juntos, como hasta ahora.

| Etapa | Qué se mueve | Archivos movidos | Archivos con referencias reescritas | Riesgo |
|---|---|---|---|---|
| **I** · integrations | `providers`, `einvoice`, `google`, `maps` → `integrations/*` | 26 | 19 | Bajo |
| **B** · business | `inventory`, `purchasing`, `pos`, `store`, `data-exchange`, `growth`, `presence` → `business/*` | 58 | 80 | Bajo-medio (varios importadores en `app/`) |
| **N** · industry | `lib/construction` → `industry/construction` | 57 | 82 | Medio (sector con mucho código; sin cambios de lógica) |
| **X** · experience | `navigation`\*, `dashboard`, `site`, `motion`, `hooks`, `fonts`, `payment-input` → `experience/*`; el flujo de `onboarding` | 35 + onboarding | 96 | Medio (archivos de interfaz) |
| **C** · core | `tenant`→`tenancy`, `auth`, `parties`, `files`, `plans`+`usage`→`entitlements`, `capabilities`+`functions`, `events`, `operations`, `api`+`mcp`→`api` | 97 | 303 | **Medio-alto** (más importadores; cambia la capa de `api`/`mcp` y `functions`) |
| **F** · foundation | `format`, `plain-date`, `bogota-month`, `calendar`, `db-*`, `sql-like`, `qr`, `rate-limit`, `app-url`, `contact`, `image-upload`, `init-scripts`, `ports` → `foundation/*` (sin `utils` y `cn`) | 16 | 172 | Bajo en riesgo, alto en cantidad (`format` lo importan 108 archivos) |
| **Z** · remate | Deja la raíz de `lib/` con **solo lo importante**: `onboarding` repartido (ver abajo), `navigation/nav-types` → `core/capabilities`, `admin/catalogs` y `vertical-icons`, `temporal.d.ts`, **`design` y `seo` (solo contienen pruebas) y `prisma8-query-patterns` → `tests/`**, la capa `automation` sin archivos y las unidades sobrantes de `layers.json`; documentación final (§9) y P-12 | pocos | pocas | Bajo-medio |

\* `navigation/nav-types.ts` y `onboarding/types.ts` son hoy **Core** y deben seguir siéndolo (los importan archivos de Core): `nav-types` pasa a `core/capabilities` (como ya prevé el diseño V10) y `onboarding/types` a `core/tenancy`; el resto de `navigation` y `onboarding` va a `experience`. Detalle en E-5.

**Orden recomendado:** I → B → N → X → C → F → Z. Va de menos a más riesgo y deja para el final lo que más archivos toca (`format`, `ports`), cuando ya no hay nada más que mover alrededor. Cada etapa deja el repositorio verde y es reversible por separado (`git revert`).

**Total aproximado:** 7 etapas, ~290 archivos movidos. Las simulaciones se repetirán al ejecutar cada etapa, porque los conteos cambian con los movimientos previos.

### 4.1 Condiciones y comprobaciones por etapa de Core (C)

- `lib/api` y `lib/mcp` están hoy en la capa `integrations`, pero **solo importan Core y Foundation** (medido): `api` → `operations` y `prisma/db`; `mcp` → `api` y `operations`. Pueden pasar a `core/api` sin violar la regla «Core no importa Business, Domains ni Integrations». `layers.json` se actualizará en el mismo commit.
- `lib/functions` es hoy capa `automation`; solo importa `capabilities` y `prisma/db`: va a `core/capabilities/discovery`.
- `tenant`, `operations`, `plans`, `usage`, `files`, `capabilities` ya están en Core; el movimiento no cambia ninguna dependencia, solo la ruta.
- `plans` y `usage` se fusionan en `core/entitlements` sin colisión de nombres (comprobado).

## 5. Estructura final propuesta

La estructura que propusiste, con tres ajustes explicados en §6 (marcados con ▲):

```
lib/
├── utils.ts · cn.ts                      ▲ excepción documentada (convención shadcn; E-3)
├── foundation/
│   ├── kernel/        payment-vocabulary · finance-series · aging · cop-amount        (hecho)
│   ├── dates/         plain-date · bogota-month · calendar                            ▲ 3 archivos
│   ├── db/            db-errors · db-transaction · sql-like                           ▲ 3 archivos
│   └── (planos)       format · qr · rate-limit · ports · app-url · contact · image-upload · init-scripts
│                      · countries · limits                                            ▲ sin carpeta de un archivo
├── core/
│   ├── tenancy/       tenant · alta (slug, presets, validación, onboarding-db)
│   ├── auth/  audit/  parties/  files/
│   ├── sectors/       (hecho)
│   ├── capabilities/  registry · modules · route-modules · nav-types · discovery/ (functions)
│   ├── entitlements/  plans · usage
│   ├── events/  operations/
│   └── api/           handler · keys · openapi · scopes · problem · mcp/
├── business/
│   ├── customers/ catalog/ sales/ scheduling/        (hechos)
│   └── inventory/ purchasing/ pos/ store/ data-exchange/ growth/ presence/
├── domains/finance/   accounting/ tax/ receivables/ payments/                        (hecho)
├── integrations/      providers/ einvoice/ google/ maps/
├── industry/          gym/ museum/ construction/                                     (restaurant cuando exista)
├── platform/          admin/ billing/ support/ crm/ inbox/ team/ accounts/ presence/ benefits/   (hecho)
├── experience/        navigation/ dashboard/ onboarding/ site/ motion/ hooks/ payment-input/ fonts
└── runtime/           ports · operations · sectors · api-deps                         (hecho)
```

### Mapa completo: dónde va cada cosa que hoy está en la raíz de `lib/`

| Hoy | Destino | Etapa |
|---|---|---|
| `inventory`, `purchasing`, `pos`, `store`, `data-exchange`, `growth`, `presence` | `business/<mismo nombre>` | B |
| `providers`, `einvoice`, `google`, `maps` | `integrations/<mismo nombre>` | I |
| `construction` | `industry/construction` | N |
| `navigation` (salvo `nav-types`), `dashboard`, `site`, `motion`, `hooks`, `payment-input` | `experience/<mismo nombre>` | X |
| `fonts.ts` | `experience/fonts.ts` | X |
| `onboarding` (flujo, presets de pantalla, `module-meta`, `flags`, `prefill`) | `experience/onboarding` | X |
| `onboarding/{validation,presets,slug,onboarding-db,types}` y `navigation/nav-types` | `core/tenancy`, `core/capabilities` | Z (M6d) |
| `tenant` | `core/tenancy` | C |
| `auth`, `parties`, `files`, `events`, `operations` | `core/<mismo nombre>` | C |
| `plans`, `usage` | `core/entitlements` | C |
| `capabilities` · `functions` | `core/capabilities` · `core/capabilities/discovery` | C |
| `api` · `mcp` | `core/api` · `core/api/mcp` | C |
| `format`, `qr`, `rate-limit`, `ports`, `app-url`, `contact`, `image-upload`, `init-scripts` | `foundation/<mismo nombre>` | F |
| `plain-date`, `bogota-month`, `calendar` | `foundation/dates/` | F |
| `db-errors`, `db-transaction`, `sql-like` | `foundation/db/` | F |
| `utils.ts`, `cn.ts` | **se quedan** (excepción) | — |
| `admin/catalogs.ts` (slug) · `admin/vertical-icons.ts` | `core/tenancy` · `experience` | Z |
| `temporal.d.ts` | `foundation/dates/` (`tsconfig` incluye `**/*.ts`, así que seguirá visible) | Z |
| `design`, `seo` (solo contienen pruebas) | `tests/` | **Z** (antes «fuera de V10»; incluido por petición del dueño, 2026-10-31) |
| `prisma8-query-patterns.integration.test.ts` | `tests/integration/` | **Z** (ídem) |
| `catalog` (carpeta vacía) | se elimina | Z |

## 6. Decisiones que necesito de ti

| # | Decisión | Mi recomendación | Alternativa |
|---|---|---|---|
| **E-1** | **Aprobar la meta de §1** como definición de «V10 terminada», con las exclusiones indicadas | Sí | Ampliar o recortar los criterios |
| **E-2** | **Subcarpetas de `foundation`:** carpeta solo cuando hay tres o más archivos relacionados (`kernel`, `dates`, `db`); el resto, planos | Sí: coincide con la regla de V10 §6.2 (no crear carpetas de un archivo) y mover cuesta lo mismo | Tu esquema literal: `format/`, `qr/`, `rate-limit/`, `utils/`. Funciona, pero cada una contendría un solo archivo, y no cubre `ports`, `db-*`, `app-url`, `contact`, `image-upload`, `init-scripts`, `sql-like` ni `calendar`, que habría que ubicar igual |
| **E-3** | **`utils.ts` y `cn.ts` se quedan en la raíz** como excepción documentada | Sí: `@/lib/utils` es la convención de shadcn/ui (160 archivos; `cn` 13 más) y un componente nuevo generado con la CLI volvería a escribir esa ruta. Evita reescribir 173 archivos para ganar nada | Moverlos a `foundation/` y fijar el alias en la configuración de shadcn |
| **E-4** | **`api` y `mcp` pasan a `core/api`** (M6a) y **`functions` a `core/capabilities/discovery`** (M6b) | Sí: medido, solo dependen de Core y Foundation | Dejarlos en `integrations` (contradice tu esquema, donde `api` está en Core) |
| **E-5** | **`navigation/nav-types` y `onboarding/types` se quedan en Core** (`core/capabilities` y `core/tenancy`), no van a Experience | Sí: los importan archivos de Core; llevarlos a Experience rompería la regla de capas | Duplicarlos en Experience (no recomendado) |
| **E-6** | **Dejar fuera de V10** el trabajo que cambia comportamiento: M7 (`SectorView`, acceso de socios por módulo activo, permisos `members.*`, `sector.ts` de gym y museum) y M6c (unificar los tres escritores de auditoría, solo si sus contratos coinciden). M8 (pruebas) ya está fuera | Sí: V10 queda como reorganización pura y verificable; M7 y M6c pasan a una línea de trabajo de producto con su propia aprobación | Mantenerlos dentro de V10 (alarga la meta y mezcla reorganización con cambios de comportamiento) |
| **E-7** | **Mover `construction` dentro de V10** (etapa N) | Sí: es mecánico (57 archivos, 82 con referencias) y es el último sector fuera de `industry/` | Dejarlo para después de V10 |
| **E-8** | **Proceso acelerado de §3** (lotes por área, un informe final) | Sí | Mantener el proceso actual módulo por módulo |
| **E-9** | **Nota de nombres:** `business/presence` y `platform/presence` conservan el mismo nombre porque son dos lados de la misma función | Sí | Renombrar uno de los dos |

## 7. Qué ocurre después de V10

- Se **deja de mover carpetas por estética**. Cualquier cambio de ubicación posterior necesita una razón de producto o de dependencias, no de orden visual.
- La estructura se mantiene sola: `pnpm check:layers` (en cada verificación) y las pruebas de arquitectura impiden que se rompan los límites.
- El equipo vuelve a funcionalidades: Restaurante sobre la estructura nueva, varios sectores por negocio, el primer adaptador de facturación electrónica y las capacidades generales de Proyectos y Agenda (ver la hoja de ruta, §7).
- Quedan registrados como trabajos independientes, cada uno con su propia decisión: la auditoría de aislamiento por negocio y de las guardas de `app/admin`, Prisma P3–P6, la migración de las 151 pruebas, la pasada documental P-12 y, si se decide E-6, M7 y M6c.

## 8. Qué necesito para empezar

Tu respuesta a E-1 a E-9 (basta «apruebo todas con tus recomendaciones» o los ajustes que quieras). Con eso empiezo por la etapa **I** sin más diseño previo y sigo el orden de §4, deteniéndome al terminar cada etapa para que la revises, como hasta ahora.

## 9. Entregable documental de la etapa Z (aprobado como requisito de cierre)

V10 no se considera terminada hasta que exista, además de la estructura, la documentación para **conservarla**. Se redacta **después de F y Z**, cuando la estructura física esté terminada, para documentar la realidad y no una estructura que aún puede cambiar. Conjunto final en `docs/architecture/`:

| Documento | Contenido |
|---|---|
| `V10-arquitectura-objetivo.md` | El «por qué» y la estructura destino (ya existe; se actualizará con el estado final) |
| `V10-cierre-resultados.md` | Resultados por etapa (ya existe; se completa con F y Z) |
| `guia-implementacion-lib.md` | **Nuevo.** Guía para trabajar en `lib/` sin romper la arquitectura |
| `reglas-dependencias.md` | **Nuevo.** Quién puede importar a quién, fronteras que no se cruzan, excepciones vigentes y cómo se comprueban |

### `guia-implementacion-lib.md`

Bloques: **mapa arquitectónico** (las nueve áreas y su ubicación), **dependencias**, **módulos y sectores** (crear, dividir, mover, retirar; registrar un sector), **implementación** (dónde van la lógica, los tipos, los servicios, las pruebas, las integraciones y la composición) y **estabilidad** (qué revisar antes y qué verificar después). Debe responder, con ejemplos correctos e incorrectos:

1. ¿Dónde creo un módulo nuevo?
2. ¿Cuándo reutilizo uno existente?
3. ¿Cuándo separo un módulo?
4. ¿Cuándo una función pertenece a Core y cuándo a Business?
5. ¿Cómo agrego un nuevo sector?
6. ¿Cómo conecto una integración externa?
7. ¿Dónde coloco las pruebas?
8. ¿Cómo evito ciclos y dependencias indebidas?
9. ¿Qué debo revisar antes de cambiar un contrato?
10. ¿Qué verificaciones debo ejecutar antes de cerrar un cambio?

**Regla fundamental (va al inicio de la guía):** *antes de crear, mover o modificar código, identifica la responsabilidad, el área propietaria, sus dependencias, sus consumidores y los contratos afectados. No elijas una ubicación únicamente por conveniencia.*

**Lista obligatoria de preguntas antes de tocar código:**

1. ¿A qué área pertenece esta responsabilidad?
2. ¿Existe ya un módulo que debería hacerse cargo?
3. ¿Estoy colocando la lógica en el área correcta o solo en la carpeta más cómoda?
4. ¿Qué módulos importan actualmente este código?
5. ¿La modificación introduce dependencias circulares o acoplamiento?
6. ¿Afecta el aislamiento por `tenantId`, los permisos o la seguridad?
7. ¿Cambia contratos públicos, operaciones, eventos o integraciones?
8. ¿Hay rutas literales, scripts, mocks o referencias indirectas que actualizar?
9. ¿Qué pruebas deben demostrar que el comportamiento sigue intacto?
10. ¿La solución resuelve el problema actual sin crear infraestructura innecesaria?

**Lecciones de las etapas que la guía debe recoger** (cada una apareció de verdad durante V10): el codemod no reescribe cadenas que no son rutas completas (expresiones regulares, listas dentro de cadenas, plantillas de texto); rutas relativas a archivos que solo falla `next build` (fuentes); listas de pruebas escritas a mano en scripts que pierden pruebas en silencio (`test-integration.sh`); comprobaciones del tipo «este archivo no existe» que quedan vacías al mover una carpeta; y la necesidad de comparar el recuento de pruebas, no solo el color de `pnpm verify`.

### `reglas-dependencias.md`

La matriz de `layers.json` explicada, las reglas R1 (nadie importa una industria salvo `experience` y `runtime`), R2 (un sector no importa a otro) y R3 (matriz de áreas), las excepciones vigentes y su tope (0 excepciones de capas; el ciclo exacto `inventory ⇄ sales` y los 3 ciclos de tipos), qué pruebas vigilan cada frontera, y los límites del verificador (escanea `lib/`, no `app/`).

## 10. Criterio de la raíz de `lib/` (precisado por el dueño, 2026-10-31)

La raíz de `lib/` debe contener **solo lo importante**: las nueve áreas (`foundation`, `core`, `business`, `domains`, `integrations`, `industry`, `platform`, `experience`, `runtime`) y las dos excepciones documentadas `utils.ts` y `cn.ts`. Por tanto, `navigation`, `onboarding`, `admin`, `design` y `seo` **no pueden quedarse en la raíz**: se resuelven en la etapa Z.

| Hoy en la raíz | Destino en Z |
|---|---|
| `navigation/nav-types.ts` | `core/capabilities` (decisión E-5) |
| `onboarding/` | se reparte: `types`, `validation`, `presets`, `slug` y `onboarding-db` → `core/tenancy`; `flags`, `flow`, `module-meta` y `prefill` → `experience/onboarding` |
| `admin/catalogs.ts` | `core/tenancy` (la parte de slug y rubros) |
| `admin/vertical-icons.ts` | `experience` |
| `design/`, `seo/` | sus pruebas pasan a `tests/` (`tests/architecture` o `tests/unit`) |
| `temporal.d.ts` | `foundation/dates/` |
| `prisma8-query-patterns.integration.test.ts` | `tests/integration/` |

Esto amplía el alcance previsto para Z (antes, `design`, `seo` y la prueba de Prisma quedaban fuera de V10). Son movimientos de pruebas, sin cambios de comportamiento. Al terminar, `ls lib` debe mostrar exactamente: los nueve directorios de área, `utils.ts` y `cn.ts`, y una prueba nueva lo fijará.

