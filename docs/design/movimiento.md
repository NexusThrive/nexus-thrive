# Movimiento: guía de uso

Contrato del movimiento de NEXUS. La referencia de valores es el código
(`packages/brand/css/tokens.css`, `app/styles/motion.css`, `lib/motion/`); aquí
está **cuándo y cómo** usarlos. Resumen en [DESIGN.md §4](../../DESIGN.md);
catálogo vivo en Storybook (*Fundamentos → Movimiento*).

## 1. Principios

1. El movimiento **explica**: de dónde viene algo, qué cambió, que se guardó.
   Si no explica, no se pone.
2. Nada retrasa una acción: el control responde al instante y el foco no espera
   a la animación.
3. Solo `transform`, `opacity`, `filter` y `clip-path`. Nunca animar `width`,
   `height`, `top/left` ni sombras en bucle (excepciones puntuales y de una
   sola vez, documentadas en el componente: el logo del riel).
4. **Un dueño por transición.** Nunca CSS y JavaScript animando la misma
   propiedad del mismo elemento (ver §2).
5. Movimiento reducido es una variante de primera clase (§7).

## 2. Quién anima qué

| Superficie | Dueño | Dónde |
|---|---|---|
| Entrada de una vista al navegar | CSS `nx-view-in` | `app/[tenant]/(app)/template.tsx` |
| Modal flotante que abre un botón (PC): entrada y salida | Web Animations (morfeo y su reversa) | `responsive-sheet.tsx` → `connectToActivator` |
| Panel lateral: entra y sale deslizándose por la derecha (misma duración, en espejo) | CSS `drawer-in` / `drawer-out` | `responsive-sheet.module.css` |
| Sostén de la salida del modal (para que Radix espere) y fallbacks sin botón | CSS | `responsive-sheet.module.css` |
| Hoja inferior móvil | CSS (sube y baja; se arrastra) | `responsive-sheet.module.css` |
| Menús, popovers, ayuda, tooltips | CSS (`tw-animate-css` de Radix) | `components/molecules/*` |
| Buscador de la navbar: el campo se ensancha al enfocar (`max-width`, 320 ms) y el panel crece desde su borde inferior, del mismo ancho (`nx-drop-down`: clip-path + opacidad) | CSS | `navbar-search.tsx`, `app/styles/motion.css` |
| Tarjeta elevable | CSS `nx-lift` | `Card interactive`, `KpiCard` con enlace |
| Entrada de bloques | CSS `nx-rise` + `--i` | dashboard, tarjetas |
| Detalle que cambia en su sitio | CSS `nx-swap` | `WelcomeChecklist` |
| Arrastrar y soltar | dnd-kit (transform) | `lead-board.tsx` |
| Cifras, barras, trazos | Web Animations (`lib/motion`) | `CountUp`, `Sparkline` |

**Librerías:** CSS + Web Animations API + `@dnd-kit/core` (solo arrastre).
No se usan Motion for React, AutoAnimate, Vaul ni React Grid Layout (§9).

## 3. Tokens

| Token | Valor | Para |
|---|---|---|
| `--d1` / `--motion-feedback` | 120 ms | Presionar, marcar |
| `--d2` / `--motion-hover` | 200 ms | Hover, color, cambios en sitio |
| `--motion-popover` | 160 ms | Menús, buscador, ayuda |
| `--d3` | 320 ms | Barra lateral, logo del riel |
| `--motion-overlay-in` | 360 ms | Modal y panel entran |
| `--motion-overlay-out` | 200 ms | Modal y panel salen |
| `--d4` | 600 ms | Entradas de bloques y cifras |

Curvas: `--nx-ease-out` (entradas), `--nx-ease-in` (salidas),
`--nx-ease-in-out` (barridos), `--nx-ease-spring` (indicadores que se
deslizan). El morfeo del modal usa `cubic-bezier(0.22, 1, 0.36, 1)`.

## 4. Modales que nacen del botón («view transition» propia)

**Qué se ve (PC, modal flotante):** al pulsar «Crear», «Editar»…
el modal sale del propio botón: arranca con su tamaño y posición,
crece hasta su sitio en 380 ms y «se enfoca» (de 4 px de desenfoque a nítido)
mientras la opacidad sube rápido para que la deformación del contenido casi no
se note. **Al cerrar hace exactamente lo mismo en reversa:** se encoge de
vuelta al mismo botón (misma duración, curva espejo) y se «guarda» en él; si el
botón se movió, vuelve a donde está ahora.

**Panel lateral:** NO hace morfeo. Siempre entra deslizándose (`translateX`)
desde el borde derecho, de donde sale, y al cerrar se desliza de vuelta por el
mismo borde, con la misma duración (360 ms) y curva espejo. **En móvil** la hoja
inferior sube y baja y se cierra arrastrándola.

**Cómo funciona:**

1. Un solo oyente global recuerda el último botón o enlace pulsado (clic,
   toque o Enter/Espacio).
2. Al montar el modal (`ref` de callback, antes del primer pintado) se mide ese
   botón y el modal; se lanza una animación Web Animations con
   `translate + scale` desde el rectángulo del botón.
3. `data-morph` apaga la entrada CSS mientras dure (un dueño). Se mantiene
   mientras esté abierto, porque quitarlo haría que la entrada CSS arrancara
   de nuevo. Al cerrar (incluso a mitad del morfeo) se cancela la entrada y se
   juega la reversa; el CSS (`modal-out-hold`, 380 ms) solo sostiene una
   animación para que Radix no desmonte antes, y la superficie deja de capturar
   el puntero al instante (cerrar no bloquea el clic).
   Importante: entrada y salida usan **la misma lista de funciones de
   transform y `transform-origin` al centro**; si no, el navegador interpola por
   matrices y la salida se pasa de largo del botón.
4. El foco, el atrapado de Tab, Escape, el scroll y la devolución del foco los
   sigue gestionando Radix: el morfeo es solo visual y **no bloquea nada**.

**Cuándo NO hay morfeo (entra la animación CSS centrada de 360 ms):**
el botón ya no existe (p. ej. un ítem de menú que se cierra al elegirlo), está
fuera de pantalla, el movimiento está reducido, o la forma es panel lateral
(entra deslizándose desde la derecha) u hoja móvil (sube desde abajo).

**Uso:** no hay que hacer nada. Todo diálogo creado con `ResponsiveSheet`,
`FormDialog`, `FormDrawer` o `ConfirmDialog` lo hereda. **No reimplementar**
este efecto ni animar `ResponsiveSheet` desde fuera.

**Por qué no la View Transitions API nativa** (`document.startViewTransition`
o `<ViewTransition>` de React): hoy `<ViewTransition>` solo está en canary de
React (el proyecto usa 19.2 estable); la API nativa exige envolver el cambio de
estado de React en el callback de la transición y toma una captura de toda la
página (sin interacción mientras dura), lo que choca con «no bloquear
controles» y con el foco gestionado por Radix; y la entrada de vistas ya tiene
dueño. El morfeo FLIP da el mismo resultado visual para esta superficie sin
esos costos. Se reevalúa con React estable y un caso real de elemento
compartido entre rutas (tarjeta → ficha de una obra), con `prefers-reduced-motion`
y fallback sin la API.

### Salida garantizada cuando el padre desmonta el panel

Casi toda la app monta el panel solo mientras está abierto
(`{abierto ? <Panel open … /> : null}`). Al cerrar, React lo quita en el acto y
Radix no llega a animar la salida: se veía «de golpe». `ResponsiveSheet` lo
resuelve solo: si se desmonta estando abierto, deja una **copia** del panel y
del fondo con `data-state="closed"` y anima la salida sobre la copia (reversa al
botón en el modal flotante, deslizamiento a la derecha en el lateral, bajada en
la hoja móvil). La copia no recibe clics, no repite ids y se borra sola a los
~500 ms. No hay que cambiar ninguna pantalla; las dos formas de montar
(siempre montado con `open`, o montado solo si está abierto) animan igual.
Pruebas: `Salida animada aunque el padre desmonte el panel` en
`e2e/overlays.spec.ts` y las historias `MountedOnlyWhileOpen*`.
Detalle técnico: el oyente que recuerda el botón pulsado se instala al cargar el
módulo, no al montar el panel (con montaje condicional el clic ocurre antes).

### Cambios sin guardar

Un panel (`ResponsiveSheet`, `FormDialog`, `FormDrawer`) con datos que la
persona **escribió o cambió** (en creación **y en edición**, con o sin
`<form>`) no se cierra de golpe: al intentar cerrarlo (Escape, fondo, X,
«Cancelar», arrastrar la hoja) pregunta **«¿Guardar los cambios?»**:

- **Guardar:** envía el formulario (con su validación; si falta algo el panel
  sigue abierto y marca los errores). Sin `<form>` pulsa el botón marcado
  `data-save` o, si no hay, el último del pie.
- **Descartar:** el aviso se va en ~120 ms y, enseguida, el panel sale con su
  animación (reversa al botón, deslizamiento o bajada).
- **Seguir editando:** el aviso se va y todo queda como estaba.

**Cómo detecta cambios:** una huella de los campos (valores, casillas,
archivos) tomada mientras la persona no ha tocado nada (se mantiene al día si
los campos llegan tarde, p. ej. al cargar una ficha) y fijada justo antes del
primer cambio. Si se revierte lo escrito, ya no pregunta. Se ignoran los campos
de búsqueda o filtro (`type=search`, placeholder o aria-label «buscar»/«filtrar»)
y lo que esté en `[data-no-guard]`. Un guardado exitoso no pregunta (cierra por
el camino del padre). `unsavedGuard={false}` lo apaga (las confirmaciones).

**Capa propia del aviso (`alert`):** va por encima del panel que lo origina
(`--z-alert-overlay` 72 / `--z-alert` 73) con un fondo más oscuro y difuminado
(`--overlay-strong` + `blur(3px)`) que atenúa también el panel de abajo; entra y
sale rápido (160/120 ms) y no hace morfeo desde un botón. Cualquier aviso que
vaya sobre otro panel usa `<ResponsiveSheet alert …>`.

### Estados de carga

Nunca un texto suelto «Cargando…». Contenido que llega dentro de un panel, ficha
o lista: `SkeletonRows` (conserva la forma; `variant="form"` para fichas). Espera
corta de una sección sin forma conocida o en línea: `LoadingState` (la N de
marca). Página entera: `PageSkeleton` en `loading.tsx`.

## 5. Elegir la superficie

| Contenido | Superficie | Movimiento |
|---|---|---|
| Acción breve, confirmación, formulario corto | Diálogo (`FormDialog`, `ConfirmDialog`) | Morfeo desde el botón |
| Ficha o formulario largo que conserva el contexto | Panel lateral (`FormDrawer`) | Desliza desde la derecha |
| Control pequeño asociado a un elemento | `Popover` / `DropdownMenu` | Escala 95 % → 100 % desde su disparador |
| Proceso extenso o con URL propia | Página | `nx-view-in` |
| Edición sencilla en su sitio | En línea | Sin movimiento propio |

Detalle en [interaction-patterns.md](interaction-patterns.md).

## 6. Arrastrar y soltar

Solo con `@dnd-kit/core`, en el tablero de leads
(`app/admin/crm/_components/lead-board.tsx`). Reglas que se mantienen en
cualquier uso nuevo:

1. **Nunca es el único camino.** Siempre hay una alternativa sin arrastrar
   (en el tablero: el menú «Mover a»; con teclado: Espacio, ← →, Espacio).
2. Con el cursor se toma **la tarjeta entera** (con 6 px de movimiento, así el
   clic en sus enlaces sigue funcionando); el teclado solo desde el **asa**
   (≥ 24 px) para que Enter/Espacio en un enlace no inicien un arrastre. En táctil se exige mantener 220 ms para no pelearse con
   el scroll; con mouse, mover 6 px.
3. Vista previa del elemento (`DragOverlay`), destino resaltado con borde
   discontinuo y, si no se puede soltar ahí, una nota que dice por qué.
4. Cada paso se anuncia a lectores de pantalla en español.
5. El cambio es **optimista** (`useOptimistic`): el elemento cambia de columna
   al soltarlo; si el servidor rechaza, vuelve solo; un conflicto (otra
   persona ya lo movió) no pisa su trabajo (`expectedStage`).
6. Una acción de servidor por movimiento, con permiso comprobado en el
   servidor (`leads.edit`), y el estado real del dato cambia (no solo la
   apariencia).
7. Con `canEdit` falso no se renderizan asas ni menú.

## 7. Movimiento reducido

`prefers-reduced-motion: reduce` o *Ajustes → Reducir movimiento*
(`<html data-motion="off">`) llevan toda animación a 1 ms y el JavaScript
consulta `motionOff()`. El morfeo del modal se omite (el modal aparece sin
viaje); el arrastre usa `dropAnimation` de 0 ms; los contadores muestran el
valor final. Todo cambio de estado se sigue entendiendo por texto, color o
icono: la animación nunca es la única señal.

## 8. Cómo probarlo

- Storybook: *Organismos → ResponsiveSheet → MorphFromButtons* (botones en
  varios puntos de la pantalla) y *Páginas → CRM comercial → LeadBoard*.
- `pnpm test:e2e`: `e2e/overlays.spec.ts` («Modal conectado al botón»),
  `e2e/crm-pipeline.spec.ts` («Pipeline de leads arrastrable»).
- A ojo: abrir el mismo modal desde un botón arriba a la izquierda y otro
  abajo a la derecha; el origen debe cambiar. Repetir con *Reducir movimiento*.
- Rendimiento: lo medido y lo pendiente está en el informe de la sesión; no se
  afirma una tasa de cuadros sin medirla en el dispositivo.

## 9. Herramientas evaluadas

| Herramienta | Decisión | Motivo |
|---|---|---|
| CSS + Web Animations | **Conservadas** | Cubren todo el movimiento actual sin dependencias |
| `@dnd-kit/core` 6.3.1 (MIT, peer React ≥ 16.8) | **Añadida** | Arrastre con sensores de mouse, táctil y teclado, anuncios y vista previa; evita reimplementar accesibilidad de arrastre |
| Motion for React | Descartada | No hay animación que CSS/WAAPI no cubra; sumaría un segundo sistema |
| AutoAnimate | Descartada | Se solapa con `nx-rise`/`nx-swap` y no hay listas que lo necesiten |
| Vaul | Descartada | `ResponsiveSheet` ya es hoja arrastrable en móvil |
| Base UI | Descartada | Radix ya cubre los primitivos |
| React Grid Layout | Descartada por ahora | El inicio personalizable necesita orden y visibilidad, no una cuadrícula 2D redimensionable |
| View Transitions (API/React) | No usadas | Ver §4 |
| Impeccable | No instalado | Instala hooks que editan archivos y su licencia no está declarada; ver `CLAUDE.md` |

## 10. Inicio personalizable (modo de edición)

`CustomizableDashboard` (12 columnas): «Personalizar» entra al modo de edición
(barra de edición, bloques con borde discontinuo). Por bloque: arrastrar (asa,
teclado o ↑ ↓), ancho (¼, ⅓, ½, ⅔, todo; desde `lg`, en pantallas chicas una
columna) y mostrar/ocultar. Vista previa en vivo, **Guardar / Cancelar /
Restablecer**. Preferencia versionada (`lib/dashboard/layout.ts`, v2; la v1 se
lee y se completa) y por persona en el navegador; pasarla a la base de datos
solo cambia dónde se guarda ese objeto (requiere un campo nuevo: decisión de
producto pendiente).

## 11. Select propio

`components/atoms/select.tsx`: botón con forma de campo y lista flotante de
divs (nunca el menú nativo). Mismos props que `<select>`; debajo vive un
`<select>` oculto que es el que se envía y valida. Prohibido el `<select>`
nativo (`lib/design/ui-rules.test.ts`). Radix: `dialog`, `dropdown-menu`,
`popover` y `tooltip` deben mantenerse en versiones que compartan
`@radix-ui/react-dismissable-layer` (una sola copia); con dos copias, un
Popover dentro de un diálogo no recibe clics ni respeta Escape.
