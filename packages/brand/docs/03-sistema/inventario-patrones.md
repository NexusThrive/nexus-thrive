# Inventario de patrones y componentes · fase B del System Design

Estado: **medido el 2026-11-01** sobre `main` (`00be34f`). Las cifras salen de `node scripts/design-inventory.mjs` (solo lectura;
`--json` para máquinas) y se repiten con `pnpm design:inventory`. Es una medición **heurística**: cuenta texto, no analiza el
árbol de sintaxis, así que sirve para ver tendencias y brechas, no para sancionar un archivo concreto.

Contexto: [`SYSTEM-DESIGN.md`](SYSTEM-DESIGN.md) (principios, escala de seis niveles, estados) y [`DESIGN.md`](DESIGN.md) (sistema
vigente). Este documento responde a una pregunta: **¿cómo se usa de verdad el sistema en la aplicación?**

---

## 1. Resumen en una pantalla

| Lo que va bien | Lo que hay que ordenar |
|---|---|
| Los patrones de interacción obligatorios **sí se cumplen**: 0 `window.confirm/alert`, 0 modales hechos a mano, 1 solo `<select>` nativo (el del propio `Select`) | **Ninguna ruta tiene `error.tsx`** (0 de 72 páginas) y solo hay 1 `not-found.tsx`: el estado «Error» no está resuelto a nivel de ruta |
| Los componentes de interacción se reutilizan mucho: `Field` 251 usos, `useToast` 64, `Alert` 47, `EmptyState` 44, `ResponsiveSheet` 31, `FormDialog/FormDrawer` 28, `ConfirmDialog` 13 | **La escala tipográfica no coincide con lo que se usa**: 737 tamaños de texto en píxeles arbitrarios (`text-[13px]` 308, `text-[11px]` 80, `text-[13.5px]` 73…) frente a los tokens `text-xs/sm/base` |
| Storybook cubre 145 archivos de historias y 9 páginas de documentación | **`DataTable` tiene 0 usos**; las tablas son 33 `<table>` nativas en 31 archivos sin patrón común |
| Cada módulo resuelve permisos con `can()` / `requirePageContext` | **19 componentes sin ningún uso real** y **34 sin historia**; solo 51 % de las páginas tienen `loading.tsx` |

---

## 2. Componentes compartidos

Primer nivel de cada carpeta de `components/` (las subcarpetas `charts`, `onboarding`, `pricing`… se importan por otra ruta y no se
miden aquí).

| Capa | Total | Sin historia | Sin ningún uso | Un solo uso |
|---|---|---|---|---|
| Átomos (`atoms`) | 34 | 3 | 6 | 3 |
| Moléculas (`molecules`) | 52 | 9 | 8 | 16 |
| Organismos (`organisms`) | 46 | 10 | 4 | 22 |
| Plantillas (`templates`) | 6 | 2 | 1 | 5 |
| **Total** | **138** | **24** | **19** | **46** |

**Los más usados** (archivos que los importan): `button-variants` 129, `input` 91, `badge` 69, `toast` 68, `select` 56, `field` 51,
`page-header` 51, `responsive-sheet` 41, `alert` 42, `empty-state` 37, `page-skeleton` 33, `n-loader` 30, `segmented-control` 30.

**Sin ningún uso real** (confirmado buscando también rutas relativas): `avatar`, `checkbox`, `label`, `indeterminate-bar`,
`pulsing-slashes`, `reveal-row` · `boot-steps`, `dynamic-status`, `focus-panel`, `loading-toast`, `month-calendar`, `step-indicator`,
`upload-progress`, `week-strip` · `agenda-timeline`, `api-keys-panel`, **`data-table`**, `module-intro` · `onboarding-layout`.
Cada uno es candidato a **adoptarse, fusionarse o retirarse**; no a borrarse sin mirar (algunos pueden estar pensados para módulos
que aún no existen, como el calendario de reservas).

**Sin historia en Storybook** (contra la regla «cada componente compartido tiene historia»): `rolling-number`, `button-variants`,
`n-path` · `auth-mount-fallback`, `full-panel-link`, `kpi-trend-body`, `network-banner`, `not-found-bits`, `pull-to-refresh`,
`qr-scanner`, `settings-section`, `staff-access-notice` · `add-widget-panel`, `api-keys-panel`, `app-entry-splash`,
`consumption-panel`, `document-viewer`, `quick-create-host`, `route-breadcrumbs`, `site-extras`, `site-view`, `store-cart` ·
`onboarding-layout`, `public-layout`. Entre ellos están piezas clave de estados: **`network-banner`** (sin conexión) y
**`staff-access-notice`** (sin permiso).

---

## 3. Patrones funcionales en `app/`

Usos y archivos (286 archivos `.tsx` de `app/`, sin historias ni pruebas).

| Patrón | Usos | Archivos | Lectura |
|---|---|---|---|
| `Field` (campo con etiqueta, ayuda y error) | 251 | 48 | Patrón de formulario **consolidado** |
| `Select` propio / `<select>` nativo | 99 / 1 | 51 / 1 | Consolidado; el nativo es el del propio componente |
| `EmptyState` | 44 | 32 | Estado vacío consolidado |
| `Alert` | 47 | 35 | Errores y avisos dentro de formularios consolidados |
| `useToast` | 64 | 63 | Resultado de acciones consolidado |
| `ResponsiveSheet` | 31 | 29 | Única vía de diálogos y paneles |
| `FormDialog` / `FormDrawer` | 28 | 17 | Formularios en diálogo y panel |
| `ConfirmDialog` / `useConfirm` | 13 | 13 | Confirmaciones destructivas |
| `window.confirm` / `alert` | 0 | 0 | Regla cumplida |
| `Skeleton` / `SkeletonRows` | 34 | 7 | Carga con forma: poco extendida |
| `LoadingState` | 1 | 1 | Casi sin uso fuera de `loading.tsx` |
| **`<button>` nativo** | 377 | 115 | Estilado casi siempre con `buttonVariants` (468 usos en 113 archivos) |
| **`Button` compartido** | 26 | 9 | **API doble**: el componente `Button` casi no se usa; manda la clase `buttonVariants` sobre `<button>` |
| **`<table>` nativa** | 33 | 31 | **Sin patrón de tabla** compartido |
| **`DataTable`** | 0 | 0 | El componente «oficial» de tabla no se usa |

### Dos hallazgos de diseño que cambian el plan

1. **API doble de botón e input.** La aplicación usa clases compartidas (`buttonVariants`, `inputClasses`) sobre elementos
   nativos en lugar del componente. Funciona y es coherente, pero hay que **decidir una sola API oficial**. El enfoque tipo shadcn/ui
   es el componente (`Button` con variantes y `asChild`) con las clases como detalle interno.
2. **No existe patrón de tabla.** 31 archivos arman su tabla a mano. Es el patrón funcional con más duplicación visible y el que
   más pesa en un producto empresarial (listados, filtros, paginación, estados vacío/cargando/error, acciones en fila).

---

## 4. Patrones perceptivos

### 4.1 Escala tipográfica

Tokens definidos (`tokens.css`): `text-xs` 12 px, `text-sm` 14 px, `text-base` 16 px, `text-lg` 18 px, `text-xl` 20 px (+ 2xl a 5xl).

Lo que realmente se usa en `app/` y `components/`:

| Tamaño | Usos | ¿Es token? |
|---|---|---|
| `text-xs` (12 px) | 586 | Sí |
| `text-sm` (14 px) | 347 | Sí |
| **`text-[13px]`** | **308** | **No** |
| `text-[11px]` | 80 | No |
| `text-[13.5px]` | 73 | No |
| `text-[15px]` | 70 | No |
| `text-[12.5px]` | 64 | No |
| `text-lg` / `text-xl` / `text-base` | 38 / 18 / 14 | Sí |
| `text-[12px]`, `[14px]`, `[10px]`, `[10.5px]`… | 34 / 24 / 19 / 16 | No |

**Lectura:** el producto es **denso** (13 px domina, y existe un modo compacto con `data-density="compact"`, que baja `--control-h` a 34 px), pero la escala oficial no
tiene un paso de 13 px ni de 11 px. Resultado: 12 tamaños distintos, con medios píxeles (12,5; 13,5; 10,5), 737 usos fuera de token.
Para que la interfaz se sienta empresarial y escalable hace falta **una escala corta y completa** (propuesta en §6).

### 4.2 Color, capas y valores sueltos

| Medición | Resultado |
|---|---|
| Colores hexadecimales en `app/` | 55 usos en 12 archivos (los mayores: `billing/[id]/page.tsx` 15, `admin/planes/_components/simulator.tsx` 6, `plan-tab.tsx` 6) |
| Colores arbitrarios de Tailwind (`[#…]`) | 114 usos en 14 archivos; concentrados en piezas de **documento e impresión**: `receipt-printer` 20, `document-viewer` 19, `billing/[id]` 15 |
| `z-index` numérico | 25 usos en 14 archivos, aunque la regla lo prohíbe (hay tokens `--z-*`) |
| `style={{…}}` en línea | 28 usos en 17 archivos |

**Lectura:** los valores sueltos están concentrados, no esparcidos. Los documentos imprimibles (recibos, facturas) necesitan **su
propia familia de tokens** (papel, tinta, líneas) porque no siguen el tema negro y oro; hoy los codifican a mano.

---

## 5. Estados

### 5.1 Cobertura en rutas (`app/`)

| Archivo de Next | Cantidad | Cobertura |
|---|---|---|
| `page.tsx` | 72 | — |
| `loading.tsx` | 37 | **51 %** de las páginas |
| `error.tsx` | **0** | **0 %** |
| `not-found.tsx` | 1 | Solo la raíz |

Módulos del espacio del negocio (`app/[tenant]/(app)`, 30 módulos, 37 páginas): 27 tienen `loading.tsx`, **0 tienen `error.tsx`**;
sin `loading.tsx`: `checkin`, `presence`, `tickets`. Tampoco existe `global-error.tsx`: una caída del servidor en cualquier pantalla cae hoy en la pantalla de error genérica de Next, no en
una de Nexus.

### 5.2 Cobertura en Storybook

De los 145 archivos de historias (382 historias exportadas), midiendo por el nombre de las historias:

| Estado | Archivos con historia de ese estado |
|---|---|
| Vacío | 27 |
| Deshabilitado | 10 |
| Error | 9 |
| Sin permiso / solo lectura | 5 |
| Cargando | 4 |
| **Sin conexión** | **0** |
| **Guardando** | **0** |

Unos 100 de 145 archivos no tienen **ninguna** historia de estado (94 de 121 dentro de `components/`). Es una aproximación
(un estado puede mostrarse con argumentos y no con un nombre), pero marca la tendencia: **se documenta el estado ideal**.

### 5.3 Estados frente a la matriz de 11

| Estado | Tratamiento hoy | Brecha medida |
|---|---|---|
| Cargando | `loading.tsx`, `PageSkeleton`, `SkeletonRows` | 49 % de páginas sin `loading.tsx` |
| Vacío | `EmptyState` | Consolidado; falta guía de redacción por módulo |
| Error | `Alert` en formularios | **Sin `error.tsx`** ni pantalla de error de ruta |
| Sin conexión | `NetworkBanner` | **Sin historia** ni comportamiento por acción |
| Guardando | `busy` en `ResponsiveSheet` | Sin historia; no hay patrón fuera de formularios |
| Guardado | `useToast` | Consolidado; falta «qué puedes hacer ahora» |
| Sin permiso | `notFound()` y `StaffAccessNotice` | Dos tratamientos sin criterio; `StaffAccessNotice` sin historia |
| Deshabilitado | atributo `disabled` | Sin regla para explicar por qué |
| Parcialmente completado | `WelcomeChecklist`, `ProgressBar` | Sin patrón para registros incompletos |

---

## 6. Hallazgos priorizados

| # | Hallazgo | Impacto | Esfuerzo | Fase |
|---|---|---|---|---|
| 1 | **Sin `error.tsx`/`not-found` por módulo**: el estado «Error» no existe como experiencia de Nexus | Alto (confianza) | Bajo: una pantalla compartida + un archivo por segmento | Estados |
| 2 | **Escala tipográfica incompleta**: 737 tamaños fuera de token, 12 tamaños distintos | Alto (consistencia, aspecto empresarial) | Medio: definir 6 pasos y migrar por módulos con una regla de prueba | Fundamentos |
| 3 | **Sin patrón de tabla**: 31 tablas a mano, `DataTable` sin usos | Alto (producto empresarial) | Medio-alto: patrón + historias + migrar de a poco | Patrones |
| 4 | **API doble de Button/Input**: componente casi sin uso, cva dominante | Medio (claridad para quien construye) | Bajo: decidir y documentar | Primitivos |
| 5 | **51 % de páginas con `loading.tsx`** | Medio | Bajo | Estados |
| 6 | **19 componentes sin uso y 24 sin historia** | Medio (deuda de catálogo) | Bajo: adoptar, fusionar o retirar | Catálogo |
| 7 | **Familia de tokens de documento/impresión** para recibos y facturas | Medio | Medio | Fundamentos |
| 8 | **Storybook sin niveles «Patrones» y «Experiencias»** y sin historias de estado | Medio-alto (el pedido de esta fase) | Medio | Storybook |
| 9 | 25 `z-index` numéricos y 28 estilos en línea | Bajo | Bajo | Mantenimiento |

---

## 7. Storybook: estructura propuesta

Hoy los títulos son: `Introducción` y `Fundamentos` (páginas), `Átomos` 31, `Moléculas` 44, `Organismos` 41, `Plantillas` 4, `Páginas` 23,
`Laboratorio` 1 y un título suelto, `Operations Center` (en vez de ir bajo Páginas o Experiencias). Faltan **Patrones** y **Experiencias**
como niveles propios, y los estados no se muestran de forma sistemática.

| Nivel de la escala | Grupo de Storybook | Contenido (hoy → destino) |
|---|---|---|
| — | **Introducción** | Principios, cómo elegir un patrón, inventario (ya existen) |
| 1. Fundamentos | **1 · Fundamentos** | Colores, tipografía, espacio y forma, capas, movimiento (ya existen) + **Iconos** y **Densidad** (nuevas) + **Documento e impresión** |
| 2. Primitivos | **2 · Primitivos** | Los 31 Átomos, con el catálogo de variantes y **todos sus estados** |
| 3. Componentes | **3 · Componentes** | Moléculas y organismos, agrupados **por función** (Entradas, Datos, Feedback, Navegación, Superposiciones), no por tamaño |
| 4. Patrones | **4 · Patrones** | **Nuevo.** Formulario completo, tabla con filtros, estado vacío, confirmación destructiva, creación rápida, progreso, flujo de aprobación, importación/exportación |
| 5. Templates | **5 · Templates** | Las 4 plantillas + plantillas de listado, ficha y dashboard |
| 6. Experiencias | **6 · Experiencias** | Las 23 «Páginas» reorganizadas **por flujo** (Onboarding, Vender y cobrar, Inventario, Finanzas, Visibilidad, Configuración) con el recorrido de estados |
| — | **Laboratorio** | Experimentos que no son sistema todavía |

**Cada historia de componente muestra los estados que apliquen**, con una convención de nombres única (`Por defecto`, `Cargando`,
`Vacío`, `Error`, `Sin conexión`, `Guardando`, `Guardado`, `Deshabilitado`, `Sin permiso`) y una pestaña de **Accesibilidad**
(axe, ya instalado). Cada patrón lleva su **ficha** de §4.2 del System Design (necesidad, meta, solución, estados, accesibilidad).

El orden de la barra lateral ya lo gobierna `storySort` en `.storybook/preview.tsx`: se ajustan sus grupos. El cambio de títulos es
mecánico (un recorrido de las ~145 historias) y no toca el código de los componentes.

---

## 8. Dirección de estilo (a validar)

Lo que se pidió: una interfaz **empresarial**, moderna y escalable, con la estructura de sistema de **shadcn/ui** (primitivos
accesibles, composición, variantes, tokens), pero con la identidad de Nexus, y que transmita **control, claridad, confianza,
progreso y continuidad**: una experiencia que se sienta *THRIVE*.

| Qué se toma de shadcn/ui | Qué es de Nexus |
|---|---|
| Primitivos pequeños que se componen (`Button`, `Input`, `Dialog`…) con **variantes** declaradas y `asChild` | Negro dominante con **oro** como único acento; radios casi nulos; **bordes en lugar de sombras**; un solo motivo gráfico (el corte diagonal) |
| Tokens semánticos en variables CSS que cambian con el tema | Tipografías de marca (Public Stunt, Montserrat, Inter, JetBrains Mono); tema claro y oscuro |
| Documentación viva por componente con todos sus estados | Español de Colombia, tú, verbos concretos; **rubro** como contexto |
| Accesibilidad de serie (Radix) | Densidad de producto operativo (13 px, controles de 34–40 px), uso con una mano en móvil |

**Cómo se traduce «THRIVE» en decisiones medibles** (para convertir en criterios del System Design, no en eslóganes):

| Sensación | Se verifica con |
|---|---|
| Control | Cada pantalla responde «¿qué está pasando ahora?» en su primera vista; estados de cargando, guardando y guardado siempre visibles |
| Claridad | Una acción principal por pantalla; escala tipográfica corta; jerarquía visible sin leer |
| Confianza | Todo cambio muestra qué cambió y permite ver el rastro o deshacer; errores con salida concreta; sin cifras inventadas |
| Progreso | Indicadores de avance reales (`WelcomeChecklist`, etapas) y «qué sigue» tras cada acción |
| Continuidad | El mismo gesto para lo mismo entre módulos; los datos de una pantalla se reutilizan en la siguiente sin copiar |

---

## 9. Qué sigue (fases del System Design)

| Orden | Trabajo | Entregable | Depende de |
|---|---|---|---|
| 1 | **Decidir** escala tipográfica (6 pasos), API única de Button/Input y destino de los 19 componentes sin uso | Decisiones en `DESIGN.md` | Este inventario |
| 2 | **Reestructurar Storybook** por los seis niveles + convención de estados + `storySort` | Una sola PR mecánica (títulos) y las primeras historias de estado | 1 |
| 3 | **Estados de ruta**: pantalla de error y de no encontrado compartidas, `error.tsx` por segmento, `loading.tsx` faltantes | PR de código pequeño con historias | 2 |
| 4 | **Patrón de tabla** (`DataTable` real) con ficha y historias; migrar 2–3 módulos piloto | Patrón + migración piloto | 2 |
| 5 | **Skill propia `nexus-design-audit`** que audita pantallas con este inventario y la lista de calidad | Skill en `.claude/skills/` | 1–4 |
| 6 | **Experiencias piloto**: onboarding y vender/cobrar evaluadas con los principios | Informe por flujo | 5 |

Cada paso es una PR pequeña con evidencia (medición antes/después con `pnpm design:inventory`, historias y pruebas), nunca un
rediseño en bloque.
