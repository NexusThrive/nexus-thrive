# Decisiones del Nexus Design System · propuesta para aprobar

Estado: **propuesta, sin aprobar** · 2026-11-01 · base: `main` en `5c24031` (incluye el inventario de la fase B, PR #138).

Este documento prepara tres decisiones **antes** de tocar Storybook o migrar nada. Es solo análisis y recomendación: no cambia
componentes, tokens, imports ni archivos del código. Referencia de diseño: la estructura de **shadcn/ui** (primitivos que se componen,
variantes declaradas, `asChild`, tokens semánticos), con la identidad de Nexus (negro y oro, bordes en lugar de sombras, radios casi
nulos). No se instala nada de shadcn: el repositorio ya adoptó su forma (ver §2.1).

Contexto: [`inventario-patrones.md`](inventario-patrones.md) · [`SYSTEM-DESIGN.md`](SYSTEM-DESIGN.md) · [`DESIGN.md`](DESIGN.md).

---

## 0. Resumen

| # | Decisión | Recomendación | Esfuerzo (orden de magnitud) | Riesgo |
|---|---|---|---|---|
| 1 | **Escala tipográfica** | **Opción A:** 6 pasos de texto de interfaz (11 · 12 · **13** · 14 · 16 · 18) con tokens en `rem`, **añadiendo** 11 y 13 sin tocar los existentes; display aparte | 2–3 PR mecánicos por capas; ~199 archivos; 37 % de los usos cambian, el 14 % en 1 px o más | Medio: densidad visual y revisión de contraste del texto pequeño |
| 2 | **API de Button e Input** | **Una puerta:** `<Button>` para todo lo interactivo (con `asChild` para enlaces) y `buttonVariants` solo como detalle de servidor; inputs: primitivos + `Field` + especializados fusionados | Button ~310 reemplazos en ~100 archivos (3–4 PR con codemod); inputs ~2 PR | Bajo-medio: `type` por defecto, límites de cliente, estados de carga |
| 3 | **19 componentes sin uso** | **Conservar 5 · Consolidar 10 · Retirar 4**; `network-banner` y `staff-access-notice` **se conservan** (sí se usan, solo les faltan historias) | 1 PR de catálogo + decisiones por pieza | Bajo: todos tienen 0 importaciones; el riesgo es borrar trabajo pensado para un módulo futuro |

### Correcciones al inventario (#138)

Al profundizar aparecieron cuatro matices; los números del inventario eran correctos en su definición, pero conviene leerlos así:

| Dato del inventario | Matiz medido ahora |
|---|---|
| `buttonVariants` ×468 | Son 468 *menciones* de la palabra (incluye imports). Las **llamadas reales son 385 en 130 archivos** |
| `Button` ×26 | Son 26 usos en `app/`; **54 contando `components/`**, en 18 archivos |
| 737 tamaños fuera de token | **736 usos en 199 archivos** (excluye historias, pruebas y el laboratorio) |
| `network-banner` y `staff-access-notice` entre los «sin historia» | Correcto, pero **no están sin uso**: `NetworkBanner` va en `tenant-shell`; `StaffAccessNotice` en `app/onboarding` y `app/auth/callback` |

---

## 1. Escala tipográfica

### 1.1 Estado actual

- **Tokens** (`packages/brand/css/tokens.css`, en `rem`): `xs` 12 · `sm` 14 · `base` 16 · `lg` 18 · `xl` 20 · `2xl` 24 · `3xl` 30 · `4xl` 40 · `5xl` 52.
- **Uso real:** `text-xs` ×586 y `text-sm` ×347 conviven con **736 tamaños en píxeles arbitrarios** (`text-[13px]` y similares) repartidos
  en **21 valores distintos**, con medios píxeles (9,5 · 10,5 · 11,5 · 12,5 · 13,5 · 14,5).

| Tamaño | Usos | Rol dominante (por clase y etiqueta) |
|---|---|---|
| 9,5 · 10 · 10,5 · 11 · 11,5 px | 129 | Micro-etiquetas: 38 en mayúsculas con espaciado, 45 % en `font-mono` a 11 px, insignias («manual»), unidades |
| 12 · 12,5 px | 97 | Texto secundario y de ayuda |
| **13 · 13,5 px** | **381** | **Texto base de la interfaz**: párrafos, etiquetas de campo, leyendas, botones (13 px de serie) |
| 14 · 14,5 px | 29 | Texto de campo (`text-sm`) y énfasis |
| 15 · 16 · 17 · 18 px | 85 | Títulos de tarjeta y de sección (88 % en `font-semibold` a 15 px) |
| 22 · 26 · 28 · 30 · 38 · 40 px | 15 | Cifras grandes (KPI): 100 % `font-semibold`/`bold`, mayoría con `tabular-nums` |

**Dónde ocurre** (usos / archivos): módulos del negocio 288 / 74 · organismos y plantillas 186 / 39 · panel CEO 130 / 33 · moléculas 56 / 28 ·
rutas públicas 30 / 8 · configuración 25 / 6 · onboarding y acceso 12 / 4 · primitivos 8 / 6 · inicio 1 / 1.

**Lectura:** el producto es **denso y consistente en la práctica** (13 px manda en todas las áreas), pero la escala oficial **no tiene
ese paso**. Los 13 px ya son la decisión de diseño real: el botón (`buttonVariants`) los usa de serie y la etiqueta de campo
(`labelClasses`) también.

### 1.2 Ejemplos

| Área | Ejemplo real | Hoy | Con la escala propuesta |
|---|---|---|---|
| Inicio / lista de primeros pasos | `components/organisms/welcome-checklist.tsx:84` `<p className="mt-0.5 text-[13px] text-muted-foreground">` | 13 px | `text-ui` |
| Listados y tablas | `app/[tenant]/(app)/pedidos-tienda/_components/orders-view.tsx:39` `<p className="text-[13px] text-muted-foreground">Entrega: …` | 13 px | `text-ui` (las 31 tablas arrastran 115 px arbitrarios) |
| Formularios | `app/admin/facturacion/_components/billing-view.tsx:79` `<label className="grid gap-1.5 text-[13px] font-medium">` | 13 px | `text-ui font-medium` |
| Configuración | `app/[tenant]/(app)/settings/_components/profile-tab.tsx:94` `<h2 className="font-display text-[15px] font-semibold …">` | 15 px título | `text-base font-semibold` (16 px) |
| Insignias | `app/[tenant]/(app)/catalog/_components/activity-catalog.tsx:615` `<span className="… px-1.5 py-0.5 text-[10px] font-medium …">manual</span>` | 10 px | `text-2xs` (11 px) |
| Cifra grande | `app/[tenant]/(app)/finance/_components/petty-cash-card.tsx:38` `<p className="font-display text-[26px] font-bold tabular-nums">` | 26 px | `text-2xl` (24 px) |

### 1.3 Alternativas

La métrica es cuántos usos cambian de tamaño y cuánto, sobre los 721 usos de hasta 20 px (los 15 de «cifra grande» se tratan aparte).

| Opción | Pasos | Usos que cambian | Cambio máximo | Comentario |
|---|---|---|---|---|
| **A · aditiva, 6 pasos de UI** | 11 · 12 · **13** · 14 · 16 · 18 | **271 (37 %)**; 102 (14 %) cambian ≥ 1 px | 1,5 px | Conserva `xs/sm/base/lg` tal cual y **añade** 11 y 13 |
| B · compacta, 5 pasos | 11 · 13 · 14 · 16 · 20 | 137 (19 %) con la regla del vecino más cercano | 2 px | Sin 12 px: sube/baja el texto secundario y pierde un paso útil de ayuda |
| C · sin paso de 13 | 11 · 12 · 14 · 16 · 18 | 410 (56 %) | 1,5 px | Obliga a elegir 12 o 14 para el texto base: cambia la densidad de toda la interfaz |
| D · solo los tokens actuales | 12 · 14 · 16 · 18 · 20 | 506 (70 %) | 2,5 px | Ignora la realidad: casi todo el producto cambiaría de tamaño |

### 1.4 Recomendación: opción A

Añadir dos tokens **sin tocar** los existentes (así `text-xs` ×586 y `text-sm` ×347 no cambian de aspecto):

```css
/* packages/brand/css/tokens.css (propuesta; en rem, como el resto) */
--text-2xs: 0.6875rem; --lh-2xs: 1rem;      /* 11 px · micro-etiquetas, insignias, unidades */
--text-ui:  0.8125rem; --lh-ui:  1.25rem;   /* 13 px · texto base de la interfaz (el que ya usa el producto) */
```

| Paso | Token | Tamaño | Rol | Absorbe | Usos |
|---|---|---|---|---|---|
| 1 | `text-2xs` (nuevo) | 11 px | Micro-etiqueta, insignia, unidad | 9,5 · 10 · 10,5 · 11 | 117 |
| 2 | `text-xs` | 12 px | Ayuda, texto secundario | 11,5 · 12 · 12,5 | 109 |
| 3 | **`text-ui` (nuevo)** | **13 px** | **Texto base de la interfaz** | 13 · 13,5 | 381 |
| 4 | `text-sm` | 14 px | Texto de campo, énfasis | 14 · 14,5 | 29 |
| 5 | `text-base` | 16 px | Título de tarjeta/sección | 15 · 16 · 17 | 84 |
| 6 | `text-lg` | 18 px | Título de página/panel | 18 | 1 |
| — | `text-xl` … `text-5xl` | 20–52 px | Cifras y encabezados (display) | 22 → `2xl`, 26 → `2xl`, 28 → `3xl`, 30 → `3xl`, 38/40 → `4xl` | 15 |

Regla de mapeo: **15 px → 16 px, no 14 px**, porque esos 70 usos son títulos en `font-semibold` y deben seguir por encima del texto base
(un 15 → 14 los dejaría del mismo tamaño que el cuerpo y rompería la jerarquía).

### 1.5 Riesgos

| Riesgo | Evidencia | Mitigación |
|---|---|---|
| **Texto demasiado pequeño** | 37 usos por debajo de 11 px en 19 archivos; 38 micro-etiquetas ≤ 11 px en mayúsculas y 61 ≤ 11 px en color atenuado | El suelo del sistema pasa a 11 px; revisar el contraste de `text-muted-foreground` con 11 px (objetivo WCAG AA 4,5 : 1) |
| **Los píxeles no escalan** | Los `[Npx]` ignoran la preferencia de tamaño de texto del navegador; los tokens en `rem` sí | Migrar a tokens `rem` mejora la accesibilidad (WCAG 1.4.4) sin cambiar el aspecto por defecto |
| **Zoom automático en iOS** | Los campos usan `text-sm` (14 px) y no encontré una regla de 16 px para móviles: Safari amplía la página al enfocar un campo con menos de 16 px | Decisión aparte y recomendada: 16 px en campos bajo 768 px de ancho (no cambia el escritorio) |
| **Densidad** | 62 % de los usos no cambia; 169 cambian menos de 1 px; el cambio de 15 → 16 px suma ~1 px de alto en 70 títulos | Revisar con capturas por módulo piloto antes de migrar el resto |
| **Hoja de ruta de deuda** | 736 usos | Prueba de regla: `text-[Npx]` prohibido con lista de deuda que solo baja (mismo mecanismo que `ui-rules.test.ts`) |

### 1.6 Esfuerzo y plan (sin ejecutar)

1. Añadir los dos tokens y la regla de prueba con la deuda actual (1 PR pequeño).
2. Migrar primitivos y moléculas (64 usos, 34 archivos) con capturas de Storybook (1 PR).
3. Migrar organismos y módulos con un codemod por regla (`text-[13px]` → `text-ui`, etc.), por áreas (1–2 PR, 135 archivos de módulos y panel CEO).

---

## 2. API pública de Button e Input

### 2.1 Estado actual: el botón ya tiene la forma de shadcn/ui

`components/atoms/button.tsx` es un componente de la familia shadcn: `cva` para variantes, `Slot` de Radix para `asChild`, `data-slot`,
y un comentario de «alias de compatibilidad (shadcn)» (`default`, `destructive`). Además añade lo propio de Nexus: `loading`, `done`
(con la N de marca y `FocusText`) y `magnetic`. El estilo vive aparte en `button-variants.ts` **a propósito**: `Button` es
`"use client"` y los Server Components y los enlaces con aspecto de botón no pueden llamarlo.

| Pieza | Qué es | Usos |
|---|---|---|
| `<Button>` | Componente de cliente con `loading` / `done` / `asChild` / `magnetic` | **54 usos en 18 archivos** (26 en `app/`) |
| `buttonVariants(...)` | Función de clases (`cva`) | **385 llamadas en 130 archivos** |
| ↳ sobre `<button>` nativo | Pierde `loading`/`done`/`magnetic` y el atributo `data-press` | 310 |
| ↳ sobre `<Link>` / `<a>` / `<label>` | Enlaces con aspecto de botón | 39 / 20 / 2 |
| `Guardando…` escrito a mano | Reimplementa el estado de carga | **31 usos en 28 archivos** (frente a 2 usos de `loading`) |

**Variantes y tamaños realmente usados** (385 llamadas):

| Variante | Llamadas | Tamaño | Llamadas |
|---|---|---|---|
| `outline` | 190 | `sm` (32 px, 12,5 px) | **200** |
| `primary` (por defecto) | 127 | `default` (40 px; 34 px en compacto, 13 px) | 149 |
| `ghost` | 44 | `icon` / `icon-sm` | 14 / 14 |
| `danger` / `accent` | 6 / 6 | `lg` | 7 |
| `secondary` / `link` | 1 / 0 | dinámico | 11 |

Combinaciones dominantes: `outline·sm` 117 · `primary·default` 78 · `outline·default` 64 · `primary·sm` 42 · `ghost·sm` 25.

**Hallazgos:** (a) el tamaño `sm` se elige **más que el `default`** (200 frente a 149): la interfaz real es más compacta de lo que
declara el tamaño por defecto; (b) `link` no se usa y `secondary` casi tampoco (1); (c) `accent` (el CTA dorado, «uno por pantalla») aparece
solo 11 veces entre las dos puertas; (d) los alias `default`/`destructive` de shadcn no aportan: se usan 2 veces; (e) el estado de carga existe
y casi nadie lo usa.

### 2.2 Alternativas

| Opción | Descripción | A favor | En contra |
|---|---|---|---|
| **1 · Una puerta: `<Button>`** | Todo lo interactivo es `<Button>`; los enlaces, `<Button asChild><Link/></Button>`; `buttonVariants` queda como detalle interno y para Server Components | Es el modelo shadcn/ui; `loading`/`done`/`asChild` disponibles en todas partes; una sola API que enseñar | ~310 reemplazos mecánicos; el límite cliente/servidor exige cuidado |
| 2 · Dejar las dos puertas | Se documenta que `buttonVariants` es la API pública | Cero migración | Perpetúa 31 estados de carga a mano y la brecha de comportamiento |
| 3 · Solo `buttonVariants` | Se retira `<Button>` | Una puerta, sin límite de cliente | Se pierde `asChild`, `loading`/`done` y `data-press`; se aleja de shadcn |

### 2.3 Recomendación: opción 1

```tsx
// API pública única (propuesta). Una sola importación:
import { Button } from "@/components/atoms/button";

<Button>Cobrar</Button>                                  // variant="primary" size="default"
<Button variant="outline" size="sm">Cancelar</Button>
<Button variant="accent" loading={pending}>Guardar</Button>   // reemplaza el «Guardando…» a mano
<Button variant="ghost" size="icon" aria-label="Cerrar"><X /></Button>
<Button asChild variant="outline"><Link href="/clientes">Ver clientes</Link></Button>   // reemplaza buttonVariants sobre Link
```

Reglas:
1. **Interactivo o con enlace → `<Button>`** (con `asChild` para `Link`/`a`).
2. `buttonVariants` se exporta **solo** para Server Components que no pueden importar un componente de cliente, y se vigila con una
   prueba de regla (lista de deuda decreciente, como `ui-rules.test.ts`).
3. Tamaños: conservar los nombres de shadcn (`default`, `sm`, `lg`, `icon`) y **decidir el valor del tamaño por defecto con datos**: hoy `sm` gana (200 / 149). Opciones: mantener
   `default` 40/34 px o pasar el 34 px a ser el tamaño base. Es una decisión de densidad, no de código.
4. Retirar los alias `default`/`destructive` tras migrar sus 2 usos; `link` y `secondary` se conservan en el sistema aunque casi no se usen
   (son parte del vocabulario shadcn y de las futuras pantallas).
5. Documentar `loading`/`done` como **el** patrón de «guardando/guardado» para acciones.

**Incompatibilidades a vigilar al migrar:** `<button>` nativo es `type="submit"` por defecto y `Button` no lo cambia (se mantiene igual:
no es una incompatibilidad); botones dentro de Server Components con `formAction` siguen funcionando porque `Button` solo añade una frontera de
cliente en la hoja; los pocos `buttonVariants` con variante o tamaño **dinámicos** (11 llamadas) requieren revisión manual; el `className`
que se pasa se fusiona con `cn` (sin diferencias).

**Esfuerzo:** codemod para el patrón `<button … className={buttonVariants({variant,size})}>` → `<Button variant size>` en ~100 archivos, por áreas
(3–4 PR), más 31 estados de carga a mano (revisión manual, 1 PR). Riesgo bajo-medio por la densidad de cambios, no por su complejidad.

### 2.4 Campos de entrada (Input y familia)

| Pieza | Usos | Observación |
|---|---|---|
| `fieldClasses` / `inputClasses` (clases sobre `<input>` nativo) | 208 de 338 `<input>` | Patrón dominante: clases compartidas, no el componente |
| `<Input>` (componente) | **3 usos** | Mismo caso que `Button`: casi no se usa |
| `<input>` nativo | 338 en 83 archivos: **54 `hidden`**, 25 `date`, 12 `number`, 7 `checkbox`, 6 `email`, 5 `file`; 240 sin `type` en la misma línea | 17 con clases propias fuera del sistema |
| `Textarea` / `Select` / `Switch` / `Checkbox` / `Label` | 1 / 56 / 13 / **0** / **0** | `Checkbox` y `Label` existen pero nadie los usa: hay 15 casillas nativas y **160 `<label>` nativas** |
| `Field` (etiqueta + ayuda + error) | 51 archivos, 251 usos | **El patrón más sano del sistema.** API de *render prop* (`children: (control) => …`) |
| `MoneyInput` / `UsdInput` | 7 / 5 | Dos componentes para dinero; `MoneyInput` ya acepta `currency` |
| `SearchInput` / `SearchField` | 7 / 2 | Dos componentes de búsqueda |
| `PhoneInput` / `FilterSelect` / `Keypad` | 3 / 7 / 2 | Especializados con poco uso |

**Propuesta de estructura (tres capas, como shadcn/ui):**

```
Primitivos (átomos)      Input · Textarea · Select · Checkbox · Switch · Label      ← una sola API con las clases dentro
Composición              Field (+ FieldDescription, FieldError)                       ← se conserva tal cual (render prop)
Especializados (moléculas) MoneyInput (COP/USD con `currency`) · PhoneInput · SearchInput · FilterSelect
```

1. **Adoptar** `Input`, `Checkbox` y `Label` en lugar de las clases sobre nativos (hoy 0 usos de los dos últimos).
2. **Evaluar la fusión** de `UsdInput` en `MoneyInput` (`currency="USD"`; ojo: `UsdInput` trabaja en centavos) y de `SearchField` en `SearchInput`, solo si sus contratos coinciden.
3. `Field` no cambia su contrato; se le añade documentación y una historia del patrón «formulario completo».
4. Los `<input type="hidden">` (54) no son un problema de diseño: se dejan.
5. Texto de campo a **16 px en móvil** (ver §1.5) como parte de `fieldClasses`.

**Esfuerzo:** 208 inputs con clases → `Input` es mecánico (2 PR); fusiones de dinero y búsqueda ~12 usos (1 PR pequeño). Riesgo bajo.

---

## 3. Los 19 componentes sin uso

Criterio: **0 importaciones reales** en `app/`, `components/`, `lib/`, pruebas y e2e (se comprobó también con rutas relativas). Todos
tienen historia de Storybook salvo `api-keys-panel` y `onboarding-layout`. Casi todos nacieron el 16–17 de octubre (refactor «componentes
en diseño atómico con Storybook» y la fase 3b de la agenda): **son piezas del catálogo que se construyeron y nunca se conectaron**.

| Capa / componente | Propósito original | Dependencias | Duplica o se parece a | Riesgo de retirar | Clasificación |
|---|---|---|---|---|---|
| `atoms/avatar` | Avatar cuadrado de marca con iniciales (`tone` gold/neutral) | Radix Avatar, `cva` | 13 coincidencias de iniciales construidas a mano en `app/` (heurístico) | Bajo | **Conservar** (adoptar) |
| `atoms/checkbox` | Casilla de marca de 18 px con resorte | Radix Checkbox | 15 `<input type="checkbox">` nativos | Bajo | **Conservar** (adoptar) |
| `atoms/label` | Etiqueta base | solo `cn` | 160 `<label>` nativas y `labelClasses` | Bajo | **Conservar** (adoptar) |
| `atoms/indeterminate-bar` | Barra indeterminada de 2 px | solo `cn` | `ProgressBar` (7 usos), `NLoader` (30) | Bajo | **Retirar** |
| `atoms/pulsing-slashes` | Tres cortes pulsantes (carga 10 de la referencia de marca) | solo `cn` | `NLoader` | Bajo: es del catálogo de cargas de `reference/nexus-loaders.html` | **Retirar** (queda en la referencia HTML) |
| `atoms/reveal-row` | Fila con revelado escalonado | `useReducedMotion` | `reveal-text`, animación `nx-rise` | Bajo | **Retirar** |
| `molecules/boot-steps` | Índice de etapa para pantallas de arranque | `NMark` | `StepRail`, `StepIndicator` | Bajo | **Consolidar** en un solo componente de pasos |
| `molecules/step-indicator` | Progreso por pasos con el corte de la N (`aria-current`) | solo `cn` | `StepRail` (1 uso), `BootSteps` | Medio: es el único accesible con `aria-current` | **Consolidar** (un componente `Steps` con orientación) |
| `molecules/upload-progress` | Progreso de carga de archivo con N y `FocusText` | `FocusText`, `NMark` | `ProgressBar`; hay 5 `<input type="file">` | Medio: la carga de archivos existe en la app | **Consolidar** con `ProgressBar` y adoptarlo |
| `molecules/loading-toast` | Aviso de carga con N | `FocusText`, `NMark` | `useToast` (68 archivos) | Bajo | **Consolidar** (variante «cargando» de `useToast`) |
| `molecules/dynamic-status` | Estado dinámico con N y texto con foco | `FocusText`, `NMark` | `LoadingState` (1 uso) | Bajo | **Consolidar** con `LoadingState` |
| `molecules/focus-panel` | Panel con N y texto con foco | `FocusText`, `NMark` | `LoadingState`, `DynamicStatus` | Bajo | **Consolidar** con los dos anteriores (una familia «estado con N») |
| `molecules/month-calendar` | Mes de la agenda (día elegido, hoy, puntos de citas) | `buttonVariants`, calendario de `foundation`, `lucide` | `bookings/_agenda/agenda-calendar.tsx` (319 líneas) | Medio: citado en `storybook/inventario.mdx` | **Consolidar**: `agenda-calendar` debería usarlo |
| `molecules/week-strip` | Semana deslizable de la agenda (NAV·04) | `buttonVariants`, motion, calendario | `agenda-calendar.tsx` (vista de semana) | Medio: 124 líneas de interacción | **Consolidar** con la agenda |
| `organisms/agenda-timeline` | Línea de tiempo de una jornada | `buttonVariants`, `NMark`, motion | `agenda-calendar.tsx` (vista de día) | Medio | **Consolidar** con la agenda |
| `organisms/api-keys-panel` | Panel para crear y revocar llaves de la API (alcances en palabras de negocio) | `Button`, `Input`, `Select`, `Field`, `Alert`, `EmptyState` | — (único) | **Alto si se borra:** la API `/api/v1` con llaves (PR-02) existe y **no hay pantalla que la use**; sin historia | **Conservar** y **montar** en Configuración |
| `organisms/data-table` | Tabla de marca: cabecera 12 px, filas de 56 px, cifras tabulares, primera columna fija | solo `cn` | **31 tablas nativas** (ni siquiera usan sus `tableHeadClasses`/`tableCellClasses`) | Medio: es la semilla del patrón de tabla | **Conservar** y convertirlo en el patrón de tabla |
| `organisms/module-intro` | Animación de entrada a un módulo (carga 12 de la referencia) | `NPath`, `next/navigation` | `splash-intro` y `app-entry-splash` (en uso) | Bajo; 254 líneas sin uso | **Retirar** (decorativo; contradice «sin movimiento decorativo») |
| `templates/onboarding-layout` | Plantilla del onboarding con título letra por letra | `RevealText`, `ThemeToggle`, `Wordmark`, `PageHeader` | `onboarding-split` (en uso) | Bajo; sin historia | **Consolidar** con `onboarding-split` |

**Resumen de clasificación (suma 19):**

| Acción | Cuántos | Piezas |
|---|---|---|
| **Conservar** (y adoptar o montar) | 5 | `avatar`, `checkbox`, `label`, `api-keys-panel`, `data-table` |
| **Consolidar** | 10 | Pasos: `boot-steps`, `step-indicator` · «estado con N»: `loading-toast`, `dynamic-status`, `focus-panel` · carga de archivos: `upload-progress` · agenda: `month-calendar`, `week-strip`, `agenda-timeline` · onboarding: `onboarding-layout` |
| **Retirar** | 4 | `indeterminate-bar`, `pulsing-slashes`, `reveal-row`, `module-intro` |

**Retirar no significa borrar sin mirar.** Los cuatro son decorativos o duplicados y cada uno tiene su historia y su referencia de marca
(`reference/nexus-loaders.html`). El primer paso razonable es moverlos a `Laboratorio` en Storybook y, si nadie los reclama, eliminarlos
en una PR aparte. Los componentes **consolidados** no se pierden: su contenido pasa a un único componente por familia.

### 3.1 `network-banner` y `staff-access-notice` (atención especial)

| | `network-banner` | `staff-access-notice` |
|---|---|---|
| Ubicación | `components/molecules/network-banner.tsx` (48 líneas) | `components/molecules/staff-access-notice.tsx` (144 líneas) |
| Uso real | **Sí**: `components/templates/tenant-shell.tsx:76` (`<NetworkBanner />`) | **Sí**: `app/onboarding/page.tsx:57` y `app/auth/callback/page.tsx:44` |
| Historia en Storybook | **No** | **No** |
| Estado de interfaz que cubre | **Sin conexión** | **Sin permiso** (acceso de equipo Nexus) |
| Duplicación | Ninguna | Ninguna (los otros «sin permiso» usan `notFound()`) |
| Riesgo de retirar | Alto: único aviso de pérdida de conexión | Alto: pantalla de acceso del equipo |
| Clasificación | **Conservar** | **Conservar** |

**Qué falta:** historias con sus estados. `NetworkBanner` ni se puede ver en Storybook, y el inventario de estados marca «sin conexión» con
0 historias en todo el sistema. Es el primer candidato para el nivel «Patrones» (estados) de la reestructuración de Storybook.

---

## 4. Decisiones solicitadas

| # | Decisión | Alternativas | Recomendación | Aprobar |
|---|---|---|---|---|
| 1 | Escala tipográfica | A · B · C · D (§1.3) | **A**: añadir `text-2xs` (11 px) y `text-ui` (13 px) sin tocar los tokens actuales; 15 px → 16 px | ☐ |
| 1b | Texto de campo a 16 px en móvil (evita el zoom de iOS) | Sí / no | **Sí** (decisión aparte, no cambia el escritorio) | ☐ |
| 2 | API de botón | 1 · 2 · 3 (§2.2) | **1**: una puerta `<Button>` con `asChild`; `buttonVariants` solo para servidor | ☐ |
| 2b | Tamaño por defecto del botón | Mantener 40/34 px o pasar a 34 px | **Decidir con capturas** (hoy `sm` gana 200 / 149) | ☐ |
| 2c | Estructura de campos | Tres capas; evaluar fusionar `UsdInput`→`MoneyInput` y `SearchField`→`SearchInput`; adoptar `Checkbox`/`Label` | **Sí** (las fusiones, si los contratos coinciden) | ☐ |
| 3 | Los 19 sin uso | Conservar / Consolidar / Retirar por pieza (§3) | **Aprobar la clasificación**; retirar solo tras pasar por `Laboratorio` | ☐ |
| 3b | `network-banner` y `staff-access-notice` | — | **Conservar** y crear sus historias en el primer paso de Storybook | ☐ |

## 5. Orden propuesto (cuando se aprueben)

1. Tokens `text-2xs` / `text-ui` + regla de prueba con la deuda actual (sin migrar).
2. Reestructurar Storybook en los seis niveles con las **historias de estado** (incluidas `NetworkBanner` y `StaffAccessNotice`).
3. Migrar `Button` por áreas con codemod; evaluar y fusionar los campos duplicados.
4. Convertir `DataTable` en el patrón de tabla con migración piloto.
5. Consolidar la agenda y las familias de pasos y de «estado con N».
6. Migración tipográfica por capas, con capturas por módulo.

## 6. Límites de este análisis

- Las cifras son **heurísticas** (cuentan texto con `grep` y expresiones regulares); sirven para decidir, no para sancionar un archivo.
- Los esfuerzos son **órdenes de magnitud** (número de PR y de archivos), no promesas de plazo.
- No se hicieron capturas visuales: los ejemplos de la §1.2 son líneas reales de código; el efecto visual de la escala debe confirmarse en
  Storybook y en un módulo piloto antes de migrar.
- No se midió el contraste real de los textos pequeños: queda como comprobación previa a la migración.
