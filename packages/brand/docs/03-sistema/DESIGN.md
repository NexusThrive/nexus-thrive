# DESIGN.md — Sistema de diseño de NEXUS

Especificación **activa**: se lee antes de crear o cambiar una pantalla y se
actualiza cuando el sistema cambia. La fuente de los valores es el código; este
documento dice qué existe, dónde vive y cómo se usa.

| Documento | Para qué |
|---|---|
| Este archivo | Marca, tokens, componentes, movimiento, layout |
| [PRODUCT.md](../02-producto/PRODUCT.md) | A quién servimos, principios y restricciones |
| [packages/brand/docs/04-patrones/interaction-patterns.md](../04-patrones/interaction-patterns.md) | Diálogo, panel lateral, ventana flotante, página o en línea: cuándo cada uno |
| [packages/brand/docs/04-patrones/movimiento.md](../04-patrones/movimiento.md) | Guía de uso del movimiento: dueños, tokens, morfeo de modales, arrastre |
| [packages/brand/docs/04-patrones/pwa.md](../04-patrones/pwa.md) | PWA: qué se cachea (solo estáticos), instalación y límites |
| [packages/brand/docs/04-patrones/accessibility.md](../04-patrones/accessibility.md) | WCAG 2.2 AA: requisitos y cómo se verifican |
| [packages/brand/docs/05-calidad/quality-checklist.md](../05-calidad/quality-checklist.md) | Lista obligatoria antes de abrir un PR con UI |
| [packages/brand/docs/06-auditorias/auditoria-2026-10.md](../06-auditorias/auditoria-2026-10.md) | Inventario y auditoría de partida (octubre 2026) |
| Storybook (`pnpm storybook`) | Catálogo vivo de componentes y sus estados |

---

## 1. Marca (no se cambia) y lenguaje de interfaz: Soft Enterprise

La **marca** sale del logo y no cambia: negro y oro, Montserrat, la N con su
corte a 24°. La **interfaz** evoluciona hacia *Soft Enterprise*: tranquila,
limpia y suave sin perder la densidad que pide una operación de negocio.

- **Claro por defecto.** Fondo papel cálido (`--background`), superficies
  blancas (`--surface`), bordes sutiles y texto casi negro (`--nx-ink-soft`).
- **Oro como acento de acción, nunca como fondo dominante.** El botón
  principal (`Button` `primary`), lo seleccionado y el dato que importa.
  Una sola tarjeta de oro por tablero. Sin rellenos negros en la interfaz:
  el negro queda para el logo, el texto y piezas de identidad.
- **Radios suaves en tres niveles** (§2): controles 10 px, contenedores
  12–24 px, estado en píldora. Hojas y diálogos 28 px.
- **Profundidad sutil.** Escala de sombras cálidas `xs · sm · md · lg`: casi
  nada en reposo, `sm` al pasar el cursor, `md` en lo que flota (menús) y
  `lg` en diálogos y paneles. El borde sigue separando; la sombra solo eleva.
- **Un solo motivo gráfico:** el corte diagonal a −24° de la N (`--nx-angle`).
  Aparece en cargas, barras de progreso y destellos; nunca como decoración
  repetida.
- **Logo:** `packages/brand/src/BrandLogo.tsx` (N + THRIVE). La N sola es
  `components/atoms/n-mark.tsx` y sirve de indicador de carga.
- **Wordmark:** Montserrat 700 en mayúsculas con tracking amplio
  (`.nx-wordmark`). Es el único lugar con mayúsculas sostenidas.

### Tipografías

| Familia | Uso | Pesos | Variable |
|---|---|---|---|
| Montserrat | Títulos, cifras grandes, marca | 500 · 600 · 700 | `--font-display` |
| Inter | Interfaz, formularios, tablas | variable | `--font-sans` |
| JetBrains Mono | Códigos, referencias, IDs | 400 · 500 | `--font-mono` |
| Public Stunt | Portadas y piezas de marca (no UI) | 400 · itálica | `--font-stunt` |

Se cargan en `lib/fonts.ts` (next/font) y no se cambian. Public Stunt está
cargada y expuesta como `font-stunt`; hoy ningún componente de la interfaz la
usa. Su archivo es de uso personal
(`packages/brand/fonts/public_stunt/READ_BEFORE_ANY_USE.txt`): revisar la
licencia antes de llevarla a piezas públicas.

**Letra suave:** `base.css` activa el suavizado en gris y el kerning, y los títulos (`h1`–`h4`, `PageHeader`, `CardTitle`) van en Montserrat **500**;
la negrita queda para cifras y nombres propios. En Tailwind, `font-semibold` vale 550 y `font-bold` 620 (`globals.css`), así que toda la interfaz baja un
escalón sin tocar cada componente. Montserrat solo trae 500, 600 y 700.

Escala (`--text-*` en `tokens.css`): 12 · 14 · 16 · 18 · 20 · 24 · 30 · 40 ·
52 px. En la app: etiquetas 13 px/500, cuerpo 13–14 px, título de página
Montserrat 600 22–28 px, título de panel 18 px/600. Texto corrido hasta
`--content-prose` (72 ch).

---

## 2. Tokens

**Fuente única:** `packages/brand/css/tokens.css` (variables CSS, claro y
oscuro) y su espejo `packages/brand/tokens/tokens.json` (Figma, Canva, otras
apps). Tailwind v4 los expone en `packages/brand/css/theme-v4.css` y
`app/globals.css`. Un componente **nunca** escribe un color, una sombra, un
z-index o una duración sueltos: usa el token, y si falta, se agrega aquí.

### Color (semánticos)

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--background` | papel `#F7F6F3` | grafito 950 | Fondo de la app |
| `--surface` | blanco | grafito 900 | Tarjetas, paneles, diálogos |
| `--surface-muted` | grafito 100 | grafito 800 | Campos, zonas secundarias |
| `--border` / `--border-strong` | grafito 200 / `#D9D7D1` | grafito 700 / `#3A3A40` | Separadores |
| `--border-input` | `#D2D0CA` | `#3A3A40` | Controles editables |
| `--foreground` / `--foreground-muted` | grafito 950 / 550 (5,9:1) | papel / grafito 350 (8,5:1) | Texto |
| `--primary` | tinta | oro 500 | Botón principal |
| `--accent` / `--accent-text` | oro 500 / oro 700 | oro 500 | Acento; texto dorado legible |
| `--ring` | `#8F6F12` | oro 500 | Foco visible |
| `--success` · `--danger` · `--warning-*` | verde · rojo · oro | más claros | Estados (nunca decorativos) |
| `--overlay` | tinta 32 % | negro 50 % | Fondo de diálogos |

El tema se cambia con la clase `.dark` en `<html>` (Ajustes → Apariencia o el
interruptor de la barra). Densidad compacta con `data-density="compact"`
(`--control-h` 34 px, `--row-h` 46 px).

### Espacio, forma y tamaño

| Grupo | Tokens |
|---|---|
| Espacio (base 4 px) | `--space-1`…`--space-20` (4–80 px) |
| Radios (primitivos `--nx-radius-*`) | `xs` 6 · `sm` 8 · `md` 10 (controles) · `lg` 12 (tarjetas) · `xl` 14 · `2xl` 16 (menús, avisos) · `3xl` 24 (Widget, `--radius-widget`) · `sheet` 28 (diálogos y hojas). Utilidades `rounded-*`; `rounded-full` para estado. Sin `rounded-[Npx]` ni `rounded` plano |
| Sombras (primitivos `--nx-shadow-*`) | `shadow-xs` (campos, botón `outline`) · `shadow-sm` (tarjeta al pasar el cursor) · `shadow-md` (menús, ayuda; `--shadow-popover`) · `shadow-lg` / `shadow-overlay` (diálogos, paneles) · `shadow-focus` (halo oro de un campo enfocado). Sin `shadow-[…]` sueltas |
| Texto de interfaz (DR-02) | `text-2xs` 11 px (solo metadatos) · `text-xs` 12 · `text-ui` 13 (texto operativo: tablas, listas, menús) · `text-sm` 14 · `text-base` 16 · `text-lg` 18. Sin `text-[Npx]` nuevos (lo vigila `type-scale-freeze.test.ts`). `cn()` conoce `2xs` y `ui` como tamaños |
| Controles | `--control-h` 40 px (34 compacta, **44 px con puntero táctil**, DR-15) · `--row-h` 56 px |
| Documento e impresión (DR-05) | `--doc-ink` · `--doc-muted` · `--doc-soft` · `--doc-faint` · `--doc-rule` · `--doc-line` · `--doc-bg` · `--doc-gold` · `--doc-edge` · `--doc-edge-strong` (clases `text-doc-*`, `bg-doc-*`, `border-doc-*`): recibos, facturas y comprobantes se ven igual en cualquier tema |
| Layout | `--sidebar-width` 248 · colapsada 76 · `--topbar-height` 60 (72 desde 768 px) · `--content-max` 1280 (1480 desde 1536 px) · `--content-prose` 72 ch |
| Superficies | `--dialog-w-sm` 440 · `md` 520 · `lg` 640 · `xl` 768 · `--drawer-w` 440 · `--drawer-w-lg` 560 · `--popover-w` 320 |

### Elevación y capas

Profundidad sutil con la escala de sombras (§2): en reposo las superficies se separan por color y borde; la sombra crece con la
elevación (`xs` → `lg`). Una sola fuente: `--nx-shadow-*` en `tokens.css`; `theme-v4.css` solo las nombra para Tailwind.

| Capa | Token | Valor | Qué va |
|---|---|---|---|
| Elevado | `--z-raised` | 10 | Adornos sobre su tarjeta |
| Fijo | `--z-sticky` | 40 | Encabezados fijos dentro del contenido |
| Barra móvil | `--z-tabbar` | 45 | Barra inferior del celular |
| Barra lateral | `--z-sidebar` | 50 | Navegación |
| Navbar | `--z-topbar` | 55 | Barra superior global, a todo el ancho y sobre la lateral |
| Fondo | `--z-overlay` | 70 | Velo de diálogos |
| Modal | `--z-modal` | 71 | Diálogo, panel lateral, hoja |
| Aviso sobre un panel | `--z-alert-overlay` / `--z-alert` | 72 / 73 | «¿Guardar los cambios?»: su fondo oscuro y difuminado cubre también el panel de abajo |
| Flotante | `--z-popover` | 80 | Tooltip, menú, ayuda "?" — **siempre sobre el modal que los contiene** |
| Aviso | `--z-banner` | 85 | Conexión, barra de ruta |
| Notificación | `--z-toast` | 90 | Toasts |
| Pantalla completa | `--z-takeover` | 120 | Paleta de comandos, escáner, cinemáticas |

En Tailwind: `z-(--z-popover)`. En CSS: `z-index: var(--z-modal)`.

### Barra de scroll

Una sola, sutil y propia para toda la app: pista transparente y trazo de 6 px
redondeado (`--scrollbar-thumb`, más oscuro al pasar el puntero con
`--scrollbar-thumb-hover`; `--scrollbar-size` 10 px de zona). Se define en
`app/globals.css`; ningún componente la estiliza por su cuenta. Para ocultarla
a propósito (carruseles, listas con scroll táctil) se usa
`[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`, y solo donde el
contenido sigue siendo alcanzable con teclado y toque.

### Foco

`:focus-visible` dibuja `--focus-ring-width` (2 px) en `--ring`, separado
`--focus-ring-offset` (2 px). No se quita nunca el contorno sin reemplazarlo
por uno igual de visible.

---

## 3. Componentes

Diseño atómico en `components/`.

**Storybook es la fuente de verdad del catálogo.** El diseño fluye de Storybook a la app, nunca al revés:

1. Un componente nuevo empieza por su historia: anatomía, variantes y estados (normal, foco, deshabilitado, cargando, error,
   vacío) con datos de muestra. El código cumple ese contrato; no se documenta después de implementar.
2. Un cambio de aspecto (una barra lateral, un botón) se hace en el componente compartido y se revisa en su historia: todas
   las pantallas que lo usan cambian a la vez. Una pantalla no reimplementa ni sobrescribe el aspecto de un componente.
3. Una variante antes que un componente nuevo; un componente nuevo solo con dos usos reales (§ «Proponer una variante»).
4. Lo vigila `tests/architecture/stories-coverage.test.ts`: un componente de `components/` sin historia hace fallar las
   pruebas. La deuda heredada está en `stories-baseline.json` y solo baja (`node scripts/stories-baseline.mjs`).

| Nivel | Carpeta | Qué va | Ejemplos |
|---|---|---|---|
| Tokens | `packages/brand/css` | Valores | color, capas, movimiento |
| Átomos | `components/atoms` | Un control, sin estado de negocio | `Button`, `Input`, `Select`, `Switch`, `Badge`, `NMark`, `Skeleton` |
| Moléculas | `components/molecules` | Combinación pequeña con contrato | `Field`, `ContextHelp`, `Popover`, `Tooltip`, `Alert`, `EmptyState`, `LoadingState`, `Toast`, `PageHeader` |
| Widgets | `components/widgets` | Tarjeta de tablero con una cifra o un dibujo; se compone de átomos y moléculas y no conoce rutas ni permisos | `Widget`, `KpiCard`, `ChartWidget`, `DonutChart`, `GaugeChart`, `SeriesChart` |
| Organismos | `components/organisms` | Bloque con comportamiento | `ResponsiveSheet`, `FormDialog`/`FormDrawer`, `ConfirmDialog`, `DataTable`, `AppSidebar`, `CommandPalette` |
| Plantillas | `components/templates` | Esqueleto de página | `TenantShell`, `AuthLayout`, `OnboardingLayout` |
| De una función | `app/**/_components` | Componen lo compartido; no recrean modales ni campos | `CustomerSheet`, `TicketDesk` |
| Datos | `lib/**` | Repositorios, permisos, dinero | `lib/business/*-db.ts` |

### Capa de interacción (usar siempre estas)

| Necesito… | Componente | Archivo |
|---|---|---|
| Diálogo o panel lateral genérico | `ResponsiveSheet` (`drawer`, `size`, `busy`) | `components/organisms/responsive-sheet.tsx` |
| Lista con controles (migas, búsqueda, filtros, vistas, paginador) | `ListControlPanel` (base de Odoo, modernizada) | `components/organisms/list-control-panel.tsx` |
| Búsqueda avanzada de una lista (Buscar en · Filtros · Agrupar por · Favoritos) | `AdvancedSearch` (barra con chips + panel; recibe un `SearchSchema`, favoritos y sus acciones; estado en la URL) y el motor `lib/foundation/list-search.ts`. Una sección nueva solo define sus filtros, agrupaciones y campos (ver `lib/business/customers/customer-search.ts`) | `components/organisms/advanced-search/advanced-search.tsx` |
| Migas de un registro («← Atrás» · «Clientes › Nombre») | `RecordBreadcrumbs` | `components/organisms/record-breadcrumbs.tsx` |
| Crear algo: alta rápida y ficha completa aparte | Un modal por tipo de alta: alta rápida con lo esencial (`size="sm"`, 3 campos) que abre la ficha; la ficha completa se edita en su propia pantalla. Nunca un solo modal para todo | `app/[tenant]/(app)/crm/_components/customer-quick-create.tsx` |
| Formulario en diálogo | `FormDialog` | `components/organisms/form-sheet.tsx` |
| Formulario en panel lateral | `FormDrawer` | `components/organisms/form-sheet.tsx` |
| Confirmar (anular, eliminar) | `ConfirmDialog` o `useConfirm()` | `components/organisms/confirm-dialog.tsx` |
| Ventana flotante compacta | `Popover` | `components/molecules/popover.tsx` |
| Asistente del negocio (chat), en la esquina | `AuriAssistant` (botón con la cara de AURI AI y ventana flotante de chat; abre el Centro de ayuda desde su pie). Hoy es solo interfaz: no inventa respuestas. La cara es `EyeTracker` (de Bencho, MIT; colores de la marca en `app/styles/eye-tracker.css`) | `components/organisms/auri-assistant.tsx` · `components/atoms/eye-tracker.tsx` |
| Ayuda "?" | `ContextHelp` | `components/molecules/context-help.tsx` |
| Nombre de un botón de icono | `Tooltip` (además del `aria-label`) | `components/molecules/tooltip.tsx` |
| Campo con etiqueta, descripción y error | `Field` (+ `FieldError`, `FieldDescription`, `focusFirstInvalid`) | `components/molecules/field.tsx` |
| Resultado de una acción | `useToast()`. Con `receipt` (un cobro) es un comprobante pequeño que sube desde abajo a la derecha, con `actions` («Compartir», «Ver»), 8 s pausables con cursor o foco, y al irse baja por el mismo camino; el modal del cobro ya se cerró | `components/molecules/toast.tsx` |
| Confirmar algo que mueve dinero sin que un toque suelto lo dispare (cobrar) | `SlideToConfirm`: deslizar el asa hasta el final (Enter o Espacio con teclado); al confirmar el asa llena la pista y muestra «Procesando…» y luego el estado; si falla, vuelve. Sin librerías (idea de Bencho, MIT) | `components/molecules/slide-to-confirm.tsx` |
| Varias personas de un vistazo (clientes nuevos, equipo) | `AvatarStack`: círculos superpuestos con foto o blobatar; se alzan al pasar el cursor o enfocar, y un círculo final opcional de resumen («+3») | `components/molecules/avatar-stack.tsx` |
| Cajón de aplicaciones de Inicio | `AppGrid`: nombre en una línea con «…», transición al pasar el cursor, favoritos y orden propio (mantener presionado para alzar y soltar, asa «Mover» con teclado: al soltar queda en su lugar, sin animación; orden y favoritos en este navegador) | `components/organisms/app-grid.tsx` |
| Error o aviso dentro del formulario | `Alert` | `components/molecules/alert.tsx` |
| Nada que mostrar | `EmptyState` ([formato completo](../04-patrones/estados-vacios.md)). Vista entera vacía (una lista o un tablero sin nada): `mark="page"`, centrado y sin dejar scroll: icono del área en un recuadro, título, para qué sirve, la acción principal (con destello `nx-flash`, apagado con movimiento reducido) y `secondaryAction` (p. ej. importar), y `highlights` con tres primeros pasos; detrás, `preview` con datos de ejemplo (no un esqueleto de carga). La precarga siguiente muestra este estado en esqueleto (`remember`; apágalo con búsqueda o filtros). Vacíos pequeños (tarjeta, panel, Actividad reciente): `corner`, texto a la izquierda y N en la esquina inferior derecha. En una lista vacía, `action` lleva el botón de crear el primero | `components/molecules/empty-state.tsx` |
| Una pantalla o un bloque no se pudo cargar (`error.tsx`) | `ErrorState` (`page` o `block`; reintentar + salida + referencia) | `components/molecules/error-state.tsx` |
| El rol no puede usar una función | `PermissionNotice` (texto derivado de la matriz de permisos, DR-34) | `components/molecules/permission-notice.tsx` |
| Listado de registros (tabla en ancho, lista en angosto, DR-08) | `AdaptiveTable` (columnas con rol `primary` · `secondary` · `detail` · `figure` · `status` · `action`; `footer` de totales; una sola representación en el DOM; componente de cliente) | `components/organisms/adaptive-table.tsx` |
| Estado de una herramienta externa (DR-47) | `ConnectionCard` (estado real de la conexión, entorno, madurez, quién la gestiona) | `components/molecules/connection-card.tsx` |
| Estado de un registro | `Badge` + `StatusDot` (glifo ✓ × ! ● – y texto: el estado no depende del color, DR-27) | `components/atoms/badge.tsx` |
| Esperando una sección (sin forma conocida / en línea) | `LoadingState` (la N) | `components/molecules/loading-state.tsx` |
| Esperando contenido dentro de un panel, ficha o lista | `SkeletonRows` (esqueleto con la forma de lo que viene) | `components/molecules/skeleton-rows.tsx` |
| Esperando la página | `PageSkeleton` (en `loading.tsx`) | `components/organisms/page-skeleton.tsx` |
| Esperando el sistema completo (carga o refresco del negocio) | `TenantShellSkeleton`: barra lateral, barra superior y panel con el esqueleto de la ruta (`RouteLoading`). Sin pantalla en blanco y **sin la N**: la intro de la N ya no se monta al entrar | `components/templates/tenant-shell-skeleton.tsx` (en `app/[tenant]/loading.tsx` y en el `Suspense` de `app/[tenant]/layout.tsx`) |
| Elegir una opción de una lista | `Select` propio (mismos props que `<select>`; **no** usar `<select>` nativo). Siempre trae un buscador arriba de la lista (`searchable={false}` lo quita) | `components/atoms/select.tsx` |
| Elegir una fecha | `DateInput` (calendario propio; **no** usar `<input type="date">`) | `components/molecules/date-input.tsx` |
| Menú de acciones | `DropdownMenu` (el panel viaja desde su botón y vuelve a él; ver `packages/brand/docs/04-patrones/movimiento.md`) | `components/molecules/dropdown-menu.tsx` |
| Inicio que cada persona ordena | `CustomizableDashboard` (12 columnas; se edita manteniendo presionado un bloque, sin botón «Personalizar»; arrastrar, ancho y alto por las esquinas, ocultar y «Agregar» gráficos del catálogo `lib/dashboard/chart-catalog.ts`; cada tarjeta es su propio bloque `widgets` con `id`, `label`, `span` y `half`; preferencia versionada en `localStorage`) | `components/organisms/customizable-dashboard.tsx`, lógica en `lib/dashboard/layout.ts` |
| Crear sin salir de la pantalla (pago, gasto, socio) | **Mini-modal de creación**: `QuickCreateProvider` + `useQuickCreate().open(key)` abren una hoja encima de la pantalla actual desde «Crear», «Acciones rápidas» y la paleta (`QuickActionLink` conserva el `href`: Ctrl/⌘-clic o sin JS navegan). Cada hoja lleva `FullPanelLink` («Abrir en el panel completo →» a la sección). Una operación nueva declara su acción una vez en `lib/navigation/quick-create.ts` (`quickSheetFor`) y reutiliza el formulario del módulo | `components/organisms/quick-create-host.tsx`, `quick-action-link.tsx`, `components/molecules/full-panel-link.tsx`; hojas: `finance-sheets.tsx`, `customer-sheet.tsx` |
| Guiar a una cuenta nueva | `WelcomeChecklist` («Primeros pasos»): pasos por módulo activo, marcados por datos reales; «Ocultar» por negocio en `localStorage` | `components/organisms/welcome-checklist.tsx`, armado en `app/[tenant]/(app)/page.tsx` |
| Buscar clientes y catálogo | `CommandPalette` (Ctrl K) + `searchEntitiesAction`: desde 2 letras, 250 ms de espera, máx. 5 por tipo, solo módulos activos y siempre por `tenantId` | `components/organisms/command-palette.tsx`, `app/[tenant]/(app)/_actions/search.ts` |
| Instalar la app / aviso de versión | `usePwa()`, `UpdateNotice` | `components/providers/pwa.tsx` (política en `packages/brand/docs/04-patrones/pwa.md`) |

**Prohibido en código nuevo:** `window.confirm`/`alert`, un `<div
className="fixed inset-0">` como modal, Radix Dialog directo (el Dialog y el
Sheet de shadcn se eliminaron: todo compone `ResponsiveSheet`), un
`z-index` numérico y el atributo `title` como único medio para explicar algo.

### Contratos clave

- **`ResponsiveSheet`**: hoja inferior arrastrable en móvil; modal centrado o
  panel derecho desde 768 px. Foco al primer campo en PC (o a
  `data-autofocus`), al panel en móvil; Escape y el fondo cierran; el foco
  vuelve al control que lo abrió; `busy` bloquea el cierre.
- **`FormDialog`/`FormDrawer`**: `onSubmit(formData)` devuelve `void`,
  `{ ok: true }` o `{ ok: false, message, fieldErrors }`. Con error: sigue
  abierto, conserva lo escrito, `Alert` arriba y foco al primer campo
  inválido. Con éxito: cierra y llama `onSuccess` (ahí va el toast).
- **`ConfirmDialog`**: foco en "Cancelar"; `confirmText` exige escribir una
  palabra para borrados de raíz; si `onConfirm` falla, muestra el error.
- **`Field`**: `hint` es la descripción persistente (sigue visible con
  error); `help` es la ayuda opcional `ContextHelp`; `required` dibuja "*" y
  anuncia "obligatorio"; `optional` escribe "(opcional)".
- **`ContextHelp`**: botón de 24 px con nombre "Ayuda sobre …"; hover, clic,
  toque o Enter la abren; Escape la cierra; el texto se anuncia por una región
  `status`. Lo imprescindible no va aquí.

---

## 4. Movimiento

Todo nace de la N: el trazo recorre el contorno, el texto entra con enfoque y
los cortes caen a −24°. El movimiento **explica** (de dónde viene algo, qué
cambió, que se guardó); nunca adorna.

| Token | Duración | Para |
|---|---|---|
| `--d1` / `--motion-feedback` | 120 ms | Presionar, marcar |
| `--d2` / `--motion-hover` | 200 ms | Hover, color, borde |
| `--motion-popover` | 160 ms | Tooltip, menú, ayuda |
| `--d3` | 320 ms | Barra lateral, pestañas |
| `--motion-overlay-in` | 360 ms | Diálogo y panel entran |
| `--motion-overlay-out` | 200 ms | Diálogo y panel salen (cerrar no hace esperar) |
| `--motion-view` | 360 ms | Entrada de una vista |
| `--d4` | 600 ms | Entradas de bloques y cifras |

Curvas: `--nx-ease-out` (entradas), `--nx-ease-in` (salidas),
`--nx-ease-in-out` (barridos), `--nx-ease-spring` (indicadores que se
deslizan), `--nx-ease-bounce` (interruptores).

Reglas:

1. CSS o Web Animations API (`lib/motion`). **Sin librerías de animación**:
   no se instala Motion for React mientras CSS cubra el caso (hoy lo cubre).
2. Solo `transform`, `opacity`, `filter` y `clip-path`.
3. Diálogos y paneles: entran con `--motion-overlay-in` y salen con
   `--motion-overlay-out`; la hoja móvil sube con un rebote corto. El
   contenido es legible durante la transición y el foco no espera a la
   animación.
4. Escalonado solo en la primera carga de una lista (`nx-rise`, 50 ms por
   ítem, máximo ~8 ítems).
   **Desplazamiento con inercia:** `SmoothScroll` (`components/providers/smooth-scroll.tsx`) lleva la rueda y el trackpad del panel con dos filtros en cascada
   (sin sobrepaso ni temblor; sin librerías; el táctil y el teclado quedan nativos).
5. **Modales que nacen del botón.** En PC, `ResponsiveSheet` (modal
   centrado) se abre con un morfeo desde el control que lo activó (arranca con
   su tamaño y posición, 380 ms, con enfoque) y se cierra hacia él (200 ms). Si
   el control ya no existe, está fuera de pantalla, hay movimiento reducido o
   la forma es panel lateral u hoja móvil, entra la animación centrada de
   siempre. No bloquea la interacción ni el foco. Detalle y fundamento (por qué
   no la API nativa de View Transitions) en
   [packages/brand/docs/04-patrones/movimiento.md](../04-patrones/movimiento.md).
6. **Propietario de cada transición** (una sola técnica por superficie):

   | Superficie | Dueño |
   |---|---|
   | Entrada de una vista al navegar | CSS: `nx-view-in` en `template.tsx` |
   | Cambio de sección en móvil, empuje tipo iOS (la nueva entra desde la derecha sobre la anterior; atrás, la actual sale hacia la derecha y deja ver la anterior) | Web Animations sobre `#contenido` y su copia: `NavTransitions` (solo < 768 px) |
   | Diálogo, panel, hoja | CSS (módulo de `ResponsiveSheet`) + origen contextual |
   | Menús, popovers, ayuda, buscador | CSS (`tw-animate-css` de Radix / `nx-drop`) |
   | Cifras, barras, gráficos | Web Animations (`lib/motion`) |

   | Barra superior al cambiar de barra (Inicio ↔ módulo ↔ Sistema) | View Transitions: `<ViewTransition>` de React en `app-topbar.tsx` |
   | Abrir una app desde Inicio y volver (≥ 768 px) | View Transitions: icono del cajón (`app-grid.tsx`) y vista de la app (`AppStage`), mismo nombre `appTransitionName`, clase `nx-app` |
   | Crear el negocio (onboarding): AURI pasa de su cuadro al centro de la pantalla de creación | View Transitions: `<ViewTransition name="auri-onboarding">` en `onboarding-scene.tsx` (origen) y `creation-cinematic.tsx` (destino), clase `nx-auri`, `--d4` |

   **View Transitions: solo la barra superior.** Next 16.3 trae `<ViewTransition>` en el React del App Router. Caso real: la barra de
   Inicio y la de módulo son componentes distintos, así que el logo, los avisos, el tema, el nombre del negocio y la cuenta se quitaban
   y volvían a aparecer. Ahora cada pieza lleva un nombre compartido (`nx-topbar-*`, clase `nx-morph`, `--d3`) y viaja a su lugar; el
   módulo y sus pestañas solo aparecen (`nx-appear`, `--d2`). El final de la barra es el mismo en todas y en el mismo orden (avisos,
   tema, negocio, cuenta) para que nada se cruce. `default="none"`: nada más anima con esta API, y la entrada de vistas sigue siendo de
   CSS. No se agregan otros nombres sin un caso de elemento compartido y su justificación en el PR.

   **Segundo caso: abrir una app.** El icono del cajón y la vista de la app son el mismo objeto (la app), en páginas distintas: una
   ventana redondeada crece del icono hasta la vista (`--d4`) y al volver, con el enlace o con «atrás» del navegador, se encoge hasta
   él. Las capturas no se estiran (`object-fit: none`): la vista se revela nítida y el icono no se pixela. Sin pareja (Inicio aún
   cargando su esqueleto) la vista se encoge y se apaga en su sitio (`nx-app-exit`). En el celular no anima: ahí manda
   `NavTransitions`.

   Los formularios completos (p. ej. `…/nuevo`) **no** se animan desde su botón: entran como cualquier vista.
7. **Movimiento reducido:** `prefers-reduced-motion` o Ajustes → Reducir
   movimiento (`<html data-motion="off">`) llevan toda animación a 1 ms (también las de View Transitions: el cambio es inmediato).
   El cambio de estado se sigue entendiendo (texto, color, icono).

---

## 5. Layout y responsive

- **Shell de la app** (`TenantShell`, y el mismo para el panel CEO): barra
  inferior con "Crear" bajo 768 px; **riel de 88 px con etiqueta abreviada de 768 a 1023 px**; **barra lateral expandida (248 px) desde 1024 px** (DR-13, DR-14); barra superior con desenfoque. Las etiquetas abreviadas salen de `short-label.ts`.
- **Armazón del negocio en PC (variante `workspace`):** `AppSidebar variant="workspace"` y `AppTopbar variant="workspace"`. Marco gris claro
  (`surface-muted`) **sin líneas divisorias**: la separación la hace el contenido, que va en un panel blanco (`card`) con esquinas redondeadas que flota
  a la derecha de la barra lateral (`.panel` en `tenant-shell.module.css`). La barra lateral lleva arriba el bloque del negocio con la **N en negro**
  y el botón de contraer; el ítem activo es una píldora blanca sin sombra ni corte oro. **Menú con scroll:** la barra de desplazamiento va oculta (robaba ancho justo donde el ítem activo se une al panel), así que cuando hay más menú arriba o abajo ese borde se tapa con un degradado y una flecha (`data-more` en `.nav`); desaparecen solos al llegar al extremo. La barra superior (sin celda de marca ni lanzador) lleva el título
  de la pantalla, el buscador en píldora blanca (`NavbarSearch variant="pill"`), «Crear» de icono, conversaciones y agenda (solo si esas funciones están
  encendidas), avisos y la cuenta con su nombre y rol; **sin cambio de tema ni de negocio** mientras el blanco sea el único tema y cada cuenta use un solo
  negocio. Inicio usa este mismo armazón (ya no es una pantalla aparte). Sin rellenos negros: los botones principales y los acentos van en oro. Inicio
  es un tablero fijo, sin edición (`AppHome`), en tres filas de tarjetas como el story «Tablero de inicio (referencia)»: cifras clave; ventas de la semana y
  dona de ingresos contra gastos; «Para hoy», actividad reciente y agenda de hoy. Usa los datos reales de `loadHomeSummary`; `/resumen` redirige a Inicio. Bajo 768 px no cambia: barra superior de siempre y barra inferior. El panel CEO conserva su
  barra lateral y su navbar sin la variante.
- **Widgets de tablero (`Widget`, `components/widgets/widget.tsx`):** la tarjeta suave de Inicio. Esquinas `--radius-widget` (24 px), borde casi
  invisible (`border/60`), sin sombra, filas interiores en gris suave (`widgetRow`) y botón circular con flecha arriba a la derecha (`WidgetHead href`).
  Tipos: cifra con `DeltaPill` (`WidgetValue`), barras con fondo rayado (`HatchBars`), línea sobre oro (`LineArea`), fichas de acceso (`QuickTile`) y
  pila de avatares (`AvatarStack`). Una sola tarjeta de oro (`variant="accent"`) por tablero. Historia: «Widgets/Widget».
  **Saludo de Inicio:** el protagonista del tablero, no una cabecera: fondo cálido `accent-subtle` con un velo de oro, esquinas de 28 px, Montserrat 500 a 48 px
  (el nombre en 600 y oro), una frase con lo que pasa hoy y píldoras suaves (`rounded-full`, fondo `card/70`) con el negocio y la prueba gratuita.
- **Página:** `PageHeader` (eyebrow, título, descripción, acción principal a
  la derecha) → filtros → contenido. Ancho máximo `--content-max`.
- **Puntos de quiebre:** `sm` 640 · `md` 768 (modal centrado y panel lateral;
  barra lateral) · `lg` 1024 · `xl` 1280.
- **Móvil:** diálogos y paneles son hojas inferiores; tablas pasan a lista (`AdaptiveTable`); todo control táctil mide 44 px (DR-15);
  nada de scroll horizontal accidental (`overflow-x: clip` en `html`).
- **Impresión:** recibos y cuentas de cobro imprimen solo el documento.
- **Vista de registro (alta y ficha)** (`contactos/nuevo`, `contactos/[id]`, `crm/oportunidades/[id]`): página a todo el ancho
  (`data-bleed`) con panel de control sin caja (volver 34 px, ruta 18 px, acciones a la derecha) y debajo, con el mismo margen de
  20 px, el contenido a la izquierda (`flex-1`) y una columna de 400–440 px a la derecha separada por una línea (la actividad sin
  fondo, o la vista previa en el alta); bajo `lg` se apilan. Sin relleno de más abajo: si no hay contenido, no hay scroll. Tarjetas `bg-card`, borde, radio 12, padding 22. El
  alta y la edición son el mismo formulario (`?editar=1`; `?campo=` enfoca un dato); la ficha es su modo lectura: los datos que
  faltan muestran «Sin registrar» y un enlace «Añadir» a ese campo. Los botones de resumen abren su pestaña del historial; el
  paginador recorre la lista de origen (`q`, `status`, `sort` viajan en la URL). Estados con `Badge` + `StatusDot`.
- **Tablero de etapas (pipeline del CRM)** (`crm/_components/pipeline`): panel de control de 3 zonas como las listas; columnas de
  300 px con scroll horizontal, encabezado (nombre, cantidad, total corto «$9,6 M», «+» de 28 px) y barra de 3 px por estado de la
  actividad; tarjetas `bg-card` radio 12, padding 14, gap 10, con estrellas, chip de actividad y responsable. Creación rápida como
  tarjeta con borde y halo dorados al inicio de la columna, con un combobox de contacto que busca o crea. Arrastrar y soltar según
  `movimiento.md` §6 (asa para teclado, «Mover a», Subir/Bajar, optimista). La etapa ganada lleva borde izquierdo verde. «+ Etapa» abre una columna de 300 px a la derecha con el formulario (nombre con ✓ y ✕, probabilidad por defecto, «Colocar
  después de»; Enter crea, Esc cancela; Ganado siempre al final) y tres tarjetas fantasma; el nombre de una etapa se renombra con
  doble clic (o Enter) y el encabezado se arrastra para reordenar (alternativa con teclado: Configuración › Etapas).

---

## 6. Cómo se mantiene

1. ¿Falta un token? Se agrega en `tokens.css` **y** `tokens.json`, y en la
   tabla de arriba.
2. ¿Un componente compartido nuevo o una variante nueva? Historia en
   Storybook con sus estados, prueba en `e2e/` si tiene interacción, y fila
   en la §3.
3. ¿Cambió un patrón de interacción? Se actualiza
   `packages/brand/docs/04-patrones/interaction-patterns.md` en el mismo PR.
4. `pnpm test:e2e` (Playwright + axe sobre Storybook) antes de abrir el PR.
   Pendiente: sumarlo al CI (`.github/workflows/ci.yml`; el cambio está
   descrito en el PR del rediseño, requiere permiso `workflow`).
5. `tests/architecture/ui-rules.test.ts` (en `pnpm test`) falla si aparece un
   `window.confirm`, un modal hecho a mano, Radix Dialog directo o un
   `z-index` numérico fuera de sus listas de deuda, que solo se achican.
