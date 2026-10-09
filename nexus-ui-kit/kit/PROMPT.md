# PROMPT PARA EL AGENTE DE CÓDIGO
## Rediseño visual completo de NEXUS THRIVE: marca, componentes, cargas e intro

Eres un diseñador-ingeniero de producto senior. La app es un monorepo con Next.js (App Router), portal en `apps/nexus-core/portal`. **El diseño ya está hecho y aprobado**: tu trabajo NO es reinventarlo sino implementarlo con fidelidad exacta y corregir todo lo que hoy se ve mal. No toques la lógica de negocio (Prisma, NextAuth, server actions, permisos, rutas, datos). Solo capa visual, componentes de UI y animaciones.

---

## 0. Archivos de referencia (adjuntos, son la fuente de verdad)

| Archivo | Qué es |
|---|---|
| `reference/nexus-loaders.html` | Las 12 cargas de interfaz con sus botones, tarjetas, tiempos y curvas. Ábrelo en el navegador. |
| `reference/nexus-splash-intro.html` | La intro de la app (carga con trazo, relleno, THRIVE, zoom hacia la N como ventana). |
| `brand/` | Paquete `@nexus/brand`: tokens CSS, preset de Tailwind, fuentes (`next/font`). |
| `logo/BrandLogo.tsx` | Logo oficial como componente (geometría exacta del SVG). |
| `logo/NEXUS_THRIVE.svg` | SVG original del logo. |

**Regla de oro:** copia los valores exactos (CSS, milisegundos, curvas, tamaños, textos) de los HTML de referencia. No los aproximes ni los "mejores". Si este prompt y la referencia difieren, gana la referencia.

---

## 1. Sistema visual (no negociable)

**Paleta** (ya está en `brand/css/tokens.css`):
- Ink `#000000` (logo, sidebar, botón primario en claro), Paper `#F7F6F3` (fondo claro), White `#FFFFFF` (tarjetas).
- Oro: `#D4AF37` (acento/CTA y todo en modo oscuro), `#B8921F` (hover y trazos), `#7F6210` (texto dorado sobre claro), `#F6EBC4` (fondo sutil).
- Grafitos: `#0A0A0B`, `#141416`, `#1E1E21`, `#2A2A2E`, `#6B6B73`, `#A1A1A8`, `#E8E6E1`, `#F2F1EE`.
- Estados SOLO funcionales: éxito `#2E7D5B`, error `#B3261E`. Nunca decorativos.
- Proporción 60 % negro/grafito, 30 % blanco/paper, 10 % oro.

**Tipografía:** Montserrat 600/700 para títulos, cifras grandes y marca; Inter para todo lo demás; JetBrains Mono para slugs/IDs. Cifras siempre `font-variant-numeric: tabular-nums`. Títulos en minúsculas normales (sentence case); las mayúsculas con tracking amplio solo para la palabra de marca.

**Forma:** esquinas casi rectas como la N. Radios: 2 px (badges), 4 px (botones, inputs), 6 px (tarjetas), 8 px máximo (popovers). Bordes en lugar de sombras; solo los popovers/toasts llevan sombra.

**Prohibido** (búscalo con grep y elimínalo):
- Cualquier color fuera de la paleta: `bg-green-*`, `text-red-*`, `bg-blue-*`, `purple`, `indigo`, pasteles por módulo, etc.
- `rounded-full` en píldoras/badges/avatares (los avatares son cuadrados de 4 px de radio), `rounded-xl`, `rounded-2xl`.
- Degradados decorativos, brillos/glow, sombras en tarjetas, emojis.
- Números grandes en verde/rojo/marrón. El color del dato es tinta; el color semántico solo aparece como un punto cuadrado de 6 px o en un mensaje de error real.

---

## 2. Qué está mal hoy (diagnóstico de las capturas)

**Ambas pantallas**
1. **Logo incorrecto.** El sidebar muestra una N + "N E X U S" tipeado + "THRIVE" amarillo en cursiva con fuente display. Ese NO es el logo. El logo es la N (bloque negro con dos cortes diagonales) con THRIVE debajo en geométrica bold con tracking amplio, alineado al ancho de la N.
2. **Iconos con fondos pastel de colores distintos** (verde, rojo, amarillo, gris, azul, morado) en cada tarjeta, acción y fila de actividad. Rompe la marca.
3. **Números de colores** (0 verde, 0 marrón, 0 rojo) y badges en píldora con guion.
4. **Todo está en Inter**: faltan Montserrat en títulos/cifras y la jerarquía.
5. Avatares circulares de colores aleatorios (morado, azul).
6. Etiquetas de sección del sidebar con poco contraste (`GENERAL`, `GESTIÓN`, `PLATAFORMA`).
7. Botones sin estados de carga, sin la forma/tamaño de la lista de cargas.

**Dashboard del negocio (captura 1)**
- Fila de 4 KPI con línea divisoria interna y chips de colores; "Membresías" repite el mismo patrón con otros colores.
- "Últimos movimientos" tiene un fondo amarillo de resaltado (bug visual): eliminar.
- Estado vacío de "Actividad reciente" es solo texto centrado.
- "Acciones rápidas": 5 tarjetas con borde separadas, cada una con icono de color distinto.
- Saludo "Buenos días, google" en minúscula y en Inter.

**Super admin (captura 2)**
- Tarjetas KPI con 60 % de espacio vacío (altura fija con poco contenido).
- Barra de filtros desalineada; botones "Requieren atención" y "Exportar CSV" parten el texto en dos líneas.
- La tabla se corta por la derecha (columna "Creado" truncada) y la cabecera "Última actividad" se parte.
- Fechas inconsistentes ("Hace 15 h", "Ayer", "07 de oct de 2026", "08/10/2…").
- Barras de onboarding verdes, badges "Activo" en píldora verde.
- Feed lateral con iconos de colores y recortado por abajo.

---

## 3. Método de trabajo

1. **Fase 0 – Reconocimiento.** Lee el repo: versión de Tailwind (v3 o v4), estructura de layouts/rutas, componentes UI existentes (¿shadcn?), librería de iconos (Lucide). No cambies nada aún. Anota la lista de archivos que vas a tocar.
2. **Un commit por fase.** Al terminar cada fase corre `typecheck`, `lint` y `build`; corrige antes de seguir.
3. **Capturas antes/después** de ambas pantallas en 1440 px y 390 px, claro y oscuro, al final de las fases 3 y 6.
4. Si algo es ambiguo, decide por la referencia; solo pregunta si hay un bloqueo real.

---

## FASE 1 · Marca base

- Copia `brand/` a `packages/brand` (paquete `@nexus/brand`) y conéctalo al portal.
- Tailwind v3: usa `tailwind/preset.ts`. Tailwind v4: usa `css/theme-v4.css`. Importa `tokens.css` y `base.css` en `globals.css`.
- Fuentes con `fonts/fonts.ts` y `fontVariables` en `<html lang="es">`.
- Modo oscuro por clase `dark` en `<html>` (p. ej. `next-themes` con `attribute="class"`).
- Reemplaza TODOS los colores hardcodeados por tokens semánticos (`bg-background`, `bg-surface`, `text-muted`, `bg-accent`, `border-border`…). Termina con este grep en cero resultados:
  `grep -rEn "(bg|text|border|ring|from|to)-(red|green|blue|purple|indigo|pink|orange|emerald|teal|sky|violet|amber|yellow|lime)-|rounded-(full|xl|2xl|3xl)" apps packages --include=*.tsx`
  (excepciones justificadas: spinners ajenos, `rounded-full` en un indicador de 6 px si lo prefieres cuadrado, mejor cuadrado).

---

## FASE 2 · Logo

- Usa `logo/BrandLogo.tsx` tal cual (`packages/brand/src/BrandLogo.tsx` o `components/brand/`). Usa `currentColor`.
- **Sidebar expandido:** `<BrandLogo variant="lockup" size={88} />` en blanco/paper (`text-paper`), alineado a la izquierda con 20 px de padding, sobre una cabecera de 112 px con borde inferior `#2A2A2E`. Elimina "NEXUS" tipeado y el "THRIVE" amarillo en cursiva.
- **Sidebar colapsado, topbar móvil, avatar de marca, loaders:** `<BrandLogo variant="mark" size={28} />`.
- **Login/intro/páginas públicas:** `lockup` grande en tinta sobre blanco.
- **Favicon, apple-touch-icon y `app/icon.svg`:** la N sobre fondo negro (gold en dark opcional). Título de pestaña: "NEXUS THRIVE".
- Nunca recolorees la N en dorado ni cambies su proporción ni añadas sombras/glow.

---

## FASE 3 · Componentes base (la base de todo lo demás)

### Botones (exactamente como en `reference/nexus-loaders.html`)
Un solo componente `<Button variant size loading done>`.
- **Primario:** alto 40 px, `padding 0 18px`, radio 4 px, fuente Inter 600 13 px, gap 8 px, `inline-flex` centrado, `white-space: nowrap`. Fondo `--btn`: negro (`#000`) con texto `#F7F6F3` en claro; oro `#D4AF37` con texto `#000` en oscuro. Ancho mínimo estable (176 px en botones con estado de carga para que no salte entre "Guardar cambios / Guardando… / Guardado").
- **Acento** (CTA principal de página, p. ej. "Nuevo negocio"): mismo tamaño, fondo oro `#D4AF37`, texto negro, hover `#B8921F`. Solo uno por pantalla.
- **Outline / pequeño:** alto 32 px (40 px en barras de filtros), `padding 0 14px`, borde 1 px `--line`, fondo transparente, Inter 500 13 px.
- **Destructivo:** igual que primario con fondo `#B3261E`.
- **Foco:** `outline: 2px solid #B8921F; outline-offset: 2px`. **Deshabilitado:** opacidad .5, cursor `not-allowed`.
- **Estados de carga** (props `loading` y `done`): ver Carga 2. Nada de textos que se partan en dos líneas, ni iconos que desplacen el layout.

### Tarjeta (`Card`)
Fondo `--surface`, borde 1 px `--border`, radio 6 px, padding 20 px, sin sombra. Altura automática: **nunca altura fija con espacio vacío**. Las tarjetas de una misma fila se estiran (`align-items: stretch`) y distribuyen su contenido (valor arriba, gráfico/pie abajo con `margin-top:auto`).

### KPI (`KpiCard`)
- Fila superior: etiqueta (Inter 13 px, `--muted`) a la izquierda; icono Lucide 18 px, `strokeWidth 1.5`, color `--muted` a la derecha. **Sin chip de color.** Si quieres contenedor: 32 px cuadrado, fondo `--surface-muted`, icono tinta.
- Valor: Montserrat 600, 28 px (24 px en compactas), `tabular-nums`, color tinta.
- Pie: Inter 12 px `--muted` (una sola línea de contexto), sin línea divisoria.
- Valor cero: se muestra normal ("$ 0") en tinta con pie "Sin cobros registrados". Nada de rojo/verde en el número.
- Alerta real (p. ej. Vencidas > 0): un punto cuadrado de 6 px en `#B3261E` antes de la etiqueta, número sigue en tinta.

### Badge
Radio 2 px, padding `2px 8px`, Inter 500 12 px, fondo `--surface-muted`, borde 1 px `--border`. Estado "Activo": punto cuadrado de 6 px `#2E7D5B` + texto en tinta (no píldora verde). Variante `gold` para avisos: fondo `#F6EBC4`, texto `#7F6210`.

### Avatares
Cuadrados 32 px, radio 4 px. Fondo tinta con inicial paper (en oscuro: oro con inicial negra). Nada de círculos morados/azules.

### Iconos de acciones y filas de feed
Todos iguales: 32 px cuadrado, fondo `--surface-muted`, icono tinta 16 px. Cero colores por categoría.

### Tabla (`DataTable`)
Cabecera Inter 600 12 px `--muted`, `white-space: nowrap`, borde inferior `--border-strong`; filas 56 px, borde inferior `--border`, hover `--surface-muted`; cifras alineadas a la derecha y tabulares. Contenedor con `overflow-x: auto`, primera columna pegajosa (`sticky left-0`). **La tabla nunca se corta**: en < 1280 px oculta Usuarios y Creado y muéstralos en el detalle de fila. Fechas coherentes: relativas si < 48 h ("Hace 15 h", "Ayer"), si no `dd/MM/yy`.

### Barra de progreso (onboarding, etc.)
Pista 4 px `--line`, relleno tinta (oro en curso), con el borde delantero cortado en diagonal: `clip-path: polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)`. Nada de barras verdes.

### Estados vacíos (`EmptyState`)
La N en contorno (opacidad .18, 56 px, **estática**), título Montserrat 600 16 px, descripción muted 13 px, y un botón outline con la acción lógica ("Registrar pago"). Centrado con 48 px de padding vertical.

### Sidebar y topbar
- Sidebar 232 px, fondo `#000`. Ítems de navegación según `.nx-nav-item` de `base.css`: 40 px de alto, radio 4, texto `#F7F6F3` a 72 % de opacidad, activo con fondo `rgba(255,255,255,.08)` y barra dorada de 3 px a la izquierda. Etiquetas de sección: Inter 600 11 px, mayúsculas, tracking .08em, color `#A1A1A8`.
- Selector de negocio: avatar cuadrado 28 px (oro con inicial negra) + nombre + slug en JetBrains Mono 12 px muted.
- Topbar 56 px, borde inferior `--border`: nombre del negocio + badge de estado a la izquierda; a la derecha tema claro/oscuro y avatar cuadrado.
- Pie del sidebar (super admin): avatar cuadrado + "SuperAdmin" + "Acceso total" en muted.

---

## FASE 4 · Cargas de interfaz (las 12 de `reference/nexus-loaders.html`)

Crea primero las primitivas compartidas (cópialas de la referencia sin cambiar valores):

- **`<NMark size state progress />`**: SVG con `viewBox="362 157 800 800"`, tres paths del contorno de la N (`N_PATH` de `BrandLogo.tsx`): `.o` contorno tenue (stroke currentColor, opacidad .18, ancho 9), `.f` relleno (fill-opacity 0 → 1 con transición .6 s), `.t` trazo con `pathLength=1`. Ancho del trazo según tamaño: ≤24 px → 44, ≤40 px → 32, resto → 22. Color del trazo `--gold-d` (`#B8921F` en claro, `#D4AF37` en oscuro); color de la N `--mark` (negro en claro, oro en oscuro). Estados:
  - `loop`: `stroke-dasharray: .16 .84` + animación `stroke-dashoffset` a `-1`, 1.6 s lineal infinita.
  - `prog`: el trazo se dibuja según `progress` (0–1) con `stroke-dasharray: {p} 1`.
  - `done`: relleno completo, trazo oculto.
- **`<FocusText text />`**: el texto entra letra por letra. Cada letra es un `span` inline-block con `opacity 0 → 1`, `filter: blur(8px) → 0`, `translateY(4px) → 0`, transición .55 s `ease-out`, `transition-delay = índice × 14 ms`. El texto anterior sale en .3 s (opacity 0, blur 6 px) y se elimina a los 320 ms. Las líneas se apilan en una celda de grid (`grid-area: 1/1`) para que el cambio no haga saltar el layout.
- **`useReducedMotion()`**: con `prefers-reduced-motion` todas las animaciones se reducen a estado final inmediato.

Ahora cada carga, con dónde usarla en la app:

| # | Carga | Dónde aplicarla | Comportamiento exacto |
|---|---|---|---|
| 1 | **Spinner de marca** (`NMark loop`, tamaños 20/32/56) | Celdas, tarjetas y botones de icono mientras cargan; refrescar datos | Bucle 1.6 s lineal |
| 2 | **Botón con carga** | TODO botón que dispare una mutación: Registrar pago/gasto, Nuevo cliente, Guardar, Crear factura, Exportar CSV, Nuevo negocio | Reposo → clic: icono `NMark 16 loop` a la izquierda + texto "Guardando…" (FocusText) → al terminar la N se rellena y dice "Guardado" ~1.3 s → vuelve al reposo. Usa `useFormStatus`/`useTransition`; no inventes duraciones: el estado sigue a la acción real (mínimo 600 ms visible para que no parpadee) |
| 3 | **Barra de ruta** | Debajo del topbar, en cada navegación (App Router: intercepta clics en `Link` + `usePathname`) | Franja de 4 px: indeterminada (bloque del 32 %, 1.5 s, `cubic-bezier(.4,0,.2,1)`) hasta que llega la ruta; luego completa al 100 % y se desvanece (.4 s). Borde delantero con corte diagonal de 8 px, color oro |
| 4 | **Skeleton** | `loading.tsx` de cada ruta (dashboard, clientes, finanzas…) | Réplica exacta de la estructura de cada pantalla. Barras de 12 px `--line`; el brillo es una barra inclinada `skewX(-24deg)`, ancho 30 %, opacidad .7, cruza en 1.4 s `ease-in-out` infinito |
| 5 | **Panel que enfoca** | Tarjetas KPI y feeds al revalidar (cambio de filtro, `router.refresh`) | Contenido con `filter: blur(9px); opacity: .4` + overlay centrado (`NMark 40 loop` + FocusText); al llegar los datos se enfoca en .9 s `ease-out` |
| 6 | **Lista con revelado** | "Actividad reciente", "Actividad de la plataforma", primeras filas de tablas | Cada fila entra con `opacity 0→1`, `blur(8px)→0`, `translateY(4px)→0`, .6 s `ease-out`, escalonado 120 ms por fila |
| 7 | **Subida con progreso** | Cualquier subida/importación (logos, comprobantes, CSV) | `NMark 40 prog` con el porcentaje real, `tabular-nums` a la derecha; al 100 % la N se rellena y dice "Subido correctamente" |
| 8 | **Pasos de arranque** | Al "Entrar a negocio" desde super admin y en la primera configuración de un módulo | Lista de etapas: pendiente = cuadrado hueco de 8 px; activa = `NMark 20 loop`; hecha = N rellena. Textos: "Conectando con tu organización", "Cargando módulos", "Preparando caja menor", "Sincronizando datos". Enlázalo a eventos reales; ~1.1 s por etapa como mínimo visual |
| 9 | **Estado con texto dinámico** | Procesos largos: reportes, envíos de WhatsApp, exportaciones | `NMark 26 loop` + FocusText rotando cada 1.6 s |
| 10 | **Cortes pulsantes** | Esperas breves: búsqueda mientras escribes, "Actualizando…", "escribiendo" en WhatsApp | Tres barras de 5×18 px con `skewX(-24deg)`, oro, opacidad .25→1 y `scaleY .6→1`, 1.1 s `ease-in-out`, desfase de .15 s |
| 11 | **Notificación de carga** | Exportaciones/descargas en segundo plano (sustituye al toast genérico) | Tarjeta abajo a la derecha, 250 px mín., `NMark 28 prog` + FocusText + franja inferior de 3 px con corte diagonal. Termina con "…exportado" y se cierra a 1.5 s. Es lo único con sombra (`0 8px 24px rgba(0,0,0,.14)`) |
| 12 | **Entrada a un módulo** | Primera vez en la sesión que se abre un módulo ("Ver módulo", sidebar) y al entrar a un negocio como super admin | Dentro del panel del módulo: trazo → relleno → zoom que abre la N como ventana (misma mecánica que la intro, ver Fase 5). Duración total ≤ 4 s. Las demás navegaciones solo usan barra de ruta + skeleton |

Comportamiento común: nada de saltos de layout (reserva el espacio), todo accesible (`role="status"`, `aria-live="polite"`, el texto de estado real en el DOM), respeta reduced-motion, y no uses librerías de animación nuevas: CSS + `requestAnimationFrame` bastan.

---

## FASE 5 · Intro de la app (`reference/nexus-splash-intro.html`)

**Qué es:** pantalla de entrada que cubre la app mientras carga y se abre como una ventana con forma de N para dejar ver el dashboard real. Componente `<SplashIntro progress onDone />` montado en el layout raíz de la zona autenticada, **por encima** de `{children}` (el dashboard se monta debajo y es lo que se ve a través de la N).

**Cuándo se muestra:**
- Una vez por sesión, justo después de iniciar sesión (`sessionStorage["nx-intro"]`). No en navegaciones internas ni al recargar dentro de la misma sesión.
- Con `prefers-reduced-motion`: muestra el logo relleno ~1.2 s y se oculta, sin zoom.
- Si la carga real tarda más de 7 s, continúa igual; si falla algo, ciérrala y deja que la app muestre su propio error.

**Progreso real, no falso:** `progress` (0–1) se calcula con pesos: sesión 20 %, negocio/organización 20 %, módulos 25 %, datos del dashboard 25 %, fuentes/recursos 10 %. Lo que se pinta es `min(progreso real, progreso por tiempo)` con avance continuo y monótono (nunca retrocede, mínimo 2.4 s en total) para que la línea se mueva de forma lineal y fluida, sin tirones ni pausas. Los mensajes cambian por tramos (0, 20, 40, 60, 80 %): "Iniciando NEXUS THRIVE", "Cargando módulos", "Conectando con tu organización", "Preparando caja menor", "Sincronizando datos"; en 100 % "Todo listo".

**Secuencia (tiempos exactos):**
1. **Carga:** N pequeña y quieta en el centro (`S = clamp(150px, 27vmin, 250px)`), sin crecer ni moverse. La línea dorada `#B8921F` (ancho 18 u) recorre el contorno: ES la barra de carga. El texto de estado va debajo con FocusText.
2. **Relleno:** la N se rellena de negro en .6 s; el texto se desvanece.
3. **THRIVE:** 550 ms después aparece **exactamente como en el logo** (usa las rutas del SVG original, tres capas con la sombra gris), letra por letra, `blur(14px)→0` + opacidad, .9 s `ease-out`, escalonado 90 ms. Fondo blanco puro `#FFFFFF`.
4. **Pausa:** 1 s con el logo completo quieto.
5. **Dolly cinematográfico (1.74 s):** retroceso de 240 ms (escala 1 → .97, `easeOutCubic`) y empuje de 1500 ms con interpolación **logarítmica** y curva `easeInOutQuart`. THRIVE se desvanece en .25 s al empezar. La letra N se vuelve **transparente** (se abre como ventana) mientras el contorno NO se vuelve transparente: queda como línea negra nítida de 3 px. Se ve el dashboard real por dentro de la N, sin oscurecer ni mover.
6. **Fin:** cuando la N cubre la pantalla, `hidden` al overlay y `onDone()`. El overlay deja de capturar eventos (`pointer-events: none`) desde el inicio del paso 5.

**Cómo implementarlo para que NO pierda calidad** (esto es crítico; así falló la versión anterior):
- UN solo `<svg>` a pantalla completa **sin `viewBox`** (unidades = píxeles CSS). Cada fotograma actualizas el atributo `transform` de un `<g>` y de la ruta del hueco. **Está prohibido** escalar un SVG pequeño con CSS `transform`, usar `will-change: transform` en la marca o `filter: blur()` sobre la marca: rasterizan y pixelan.
- Contorno de la N: `vector-effect: non-scaling-stroke` (3 px constante), `shape-rendering: geometricPrecision`.
- El panel blanco es un `<rect>` con máscara: la máscara es blanca y contiene la N en negro cuyo `fill-opacity` sube de 0 a 1 → ese es el hueco por el que se ve el dashboard.
- Estructura:
```html
<svg style="position:absolute;inset:0;width:100%;height:100%">
  <defs>
    <mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
      <rect width="100%" height="100%" fill="#fff"/>
      <path id="hp" d="N_PATH" fill="#000" fill-opacity="0"/>   <!-- el hueco -->
    </mask>
  </defs>
  <rect width="100%" height="100%" fill="#fff" mask="url(#m)"/>
  <g id="mark"> <!-- contorno tenue, #fill (relleno), #edge (borde nítido), #trace (línea de carga), THRIVE --> </g>
</svg>
```
- Geometría y dolly (copia literal de la referencia):
```js
// k = S/950 ; punto de entrada = dentro del trazo izquierdo de la N (unidades 540,560)
ox = W/2 + (540-762.31)*k ;  oy = H/2 + (560-557.06)*k
T(s) = "translate(ox oy) scale(s) translate(-ox -oy) translate(W/2 H/2) scale(k) translate(-762.31 -557.06)"
// se asigna a #mark y a #hp
SE = Math.max(30, Math.max(W,H) * 1.15 / (150*k))      // escala final: saca los cortes blancos de la pantalla
ease(x) = x<.5 ? 8*x**4 : 1 - (-2*x+2)**4/2
t<240ms: s = 1 - .03*(1-(1-t/240)**3)
si no:   b=(t-240)/1500 ; s = .97 * (SE/.97) ** ease(b)
h = smoothstep(b/.22) ; hp.fillOpacity = h ; fill.fillOpacity = 1 - h
```
- Recalcula `W,H,k,ox,oy` en `resize`.

---

## FASE 6 · Rediseño de las dos pantallas

### Dashboard del negocio
- **Topbar** (56 px): nombre del negocio + badge "Activo" (punto cuadrado verde, no píldora) a la izquierda; a la derecha tema y avatar cuadrado.
- **Encabezado:** `h1` Montserrat 700 32 px "Buenos días, Google" (capitaliza el nombre; si no hay nombre real, usa el del correo con la primera letra mayúscula); subtítulo muted "Aquí tienes un resumen de Juan."; fecha a la derecha en muted, `tabular-nums`.
- **KPI principales** (Ingresos, Clientes, Gastos, Balance): 4 `KpiCard` en grid de 4 columnas, gap 16, altura automática, valor en Montserrat, un icono Lucide discreto, un pie de una línea. Sin chips ni divisores.
- **Membresías:** título Montserrat 600 18 px + subtítulo; enlace "Ver módulo →" en `#7F6210` (oro oscuro) a la derecha; 4 `KpiCard` compactas (Activas, Por vencer, Vencidas, Renovaciones del mes). Sin números de color.
- **Actividad reciente** (ancho 8/12): cabecera con título + control segmentado "Últimos movimientos" (outline, **sin** fondo amarillo; revisa por qué hay un `mark`/`bg-yellow`/`selection` activo). Lista con la carga 6; vacía: `EmptyState` con la N en contorno y botón "Registrar pago".
- **Acciones rápidas** (ancho 4/12): una sola tarjeta con 5 filas separadas por líneas finas (no 5 tarjetas): icono 32 px cuadrado neutro, título 14 px 500, subtítulo 12 px muted, chevron a la derecha. Hover `--surface-muted`. Las acciones que ejecutan algo usan el botón con carga (Carga 2).

### Super admin
- **Encabezado:** `h1` "Resumen general" + subtítulo; a la derecha botón outline 40 px "Buscar o comando ⌘K" y botón **acento** oro "Nuevo negocio".
- **KPI superiores:** 4 tarjetas de igual altura con contenido distribuido (valor arriba, mini gráfica o pie abajo con `margin-top:auto`), sin espacio muerto: Ingresos (30 d), Nuevos negocios (sparkline de 48 px, trazo tinta, área `--surface-muted`), Onboarding, Actividad real. "Alertas operativas" pasa a una franja delgada a ancho completo bajo las KPI (si hay 0 alertas: una línea "Sin alertas operativas" en muted con punto cuadrado verde).
- **Negocios de la plataforma:**
  - Barra de herramientas en UNA fila de controles de 40 px: búsqueda (flex 1, mín. 280 px), selects "Todas las verticales", "Todos los estados", "Más recientes" (ancho 180 px), y a la derecha "Requieren atención" (con contador en badge) y "Exportar CSV" (icono de descarga). Todo `nowrap`. En < 1024 px los selects pasan a una segunda fila.
  - Tabla según `DataTable`: sticky en Negocio, sin recortes, fechas coherentes, estado con badge de punto cuadrado, onboarding con barra de 64×4 con corte diagonal y "Completo", módulos como badges de 2 px con "+N".
- **Actividad de la plataforma:** tarjeta de la misma altura que la tabla, lista con scroll interno (`max-height`), iconos neutros de 32 px, monto en `tabular-nums` negrita, hora relativa a la derecha en muted. Carga 6 al llegar datos, Carga 5 al refrescar.
- **Pie del sidebar:** avatar cuadrado + "SuperAdmin" + "Acceso total".

---

## Criterios de aceptación (no entregues hasta cumplirlos todos)

- [ ] El logo del sidebar es el oficial (N + THRIVE debajo), sin "NEXUS" tipeado ni THRIVE amarillo en cursiva; el mark en estado colapsado; favicon actualizado.
- [ ] El grep de la Fase 1 da cero resultados; no queda ningún color fuera de la paleta ni `rounded-full` en badges/avatares.
- [ ] Montserrat en títulos y cifras grandes, Inter en UI; cifras con `tabular-nums`.
- [ ] Los botones son idénticos a los de la lista de cargas (tamaños, colores, foco, estados). Ningún texto de botón se parte en dos líneas.
- [ ] Las 12 cargas existen como componentes reutilizables y están aplicadas en los puntos de la tabla de la Fase 4.
- [ ] La intro se muestra una vez por sesión, usa progreso real, no pierde calidad en el zoom (bordes nítidos al máximo acercamiento), la letra se vuelve transparente y se ve el dashboard real por dentro; reduced-motion funciona.
- [ ] Tarjetas sin espacio vacío, sin sombras, radio 6 px, sin chips de colores.
- [ ] La tabla del super admin no se corta ni parte cabeceras; filtros alineados.
- [ ] Contraste de texto ≥ 4.5:1 en claro y oscuro (el oro como texto sobre claro SIEMPRE `#7F6210`).
- [ ] Funciona en 390 px y 1440 px, claro y oscuro.
- [ ] `typecheck`, `lint` y `build` en verde. No se tocó lógica de negocio.

## Entrega

Responde con: (1) lista de archivos creados/modificados por fase, (2) capturas antes/después de las dos pantallas en claro y oscuro, (3) cualquier desviación de la referencia con su motivo, (4) resultado de `typecheck`, `lint`, `build` y del grep de colores prohibidos.
