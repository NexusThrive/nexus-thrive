# DESIGN.md — Sistema de diseño de NEXUS

Especificación **activa**: se lee antes de crear o cambiar una pantalla y se
actualiza cuando el sistema cambia. La fuente de los valores es el código; este
documento dice qué existe, dónde vive y cómo se usa.

| Documento | Para qué |
|---|---|
| Este archivo | Marca, tokens, componentes, movimiento, layout |
| [PRODUCT.md](PRODUCT.md) | A quién servimos, principios y restricciones |
| [docs/design/interaction-patterns.md](docs/design/interaction-patterns.md) | Diálogo, panel lateral, ventana flotante, página o en línea: cuándo cada uno |
| [docs/design/movimiento.md](docs/design/movimiento.md) | Guía de uso del movimiento: dueños, tokens, morfeo de modales, arrastre |
| [docs/design/pwa.md](docs/design/pwa.md) | PWA: qué se cachea (solo estáticos), instalación y límites |
| [docs/design/accessibility.md](docs/design/accessibility.md) | WCAG 2.2 AA: requisitos y cómo se verifican |
| [docs/design/quality-checklist.md](docs/design/quality-checklist.md) | Lista obligatoria antes de abrir un PR con UI |
| [docs/design/auditoria-2026-10.md](docs/design/auditoria-2026-10.md) | Inventario y auditoría de partida (octubre 2026) |
| Storybook (`pnpm storybook`) | Catálogo vivo de componentes y sus estados |

---

## 1. Marca (no se cambia)

Todo sale del logo: un bloque negro sólido, esquinas rectas y cortes
diagonales. De ahí las reglas:

- **Negro dominante, oro como único acento.** Proporción 60 % tinta/neutros
  oscuros, 30 % papel, 10 % oro. El oro marca *una* cosa por pantalla (el CTA
  principal, el dato que importa, el ítem activo).
- **Radios casi nulos** (2–8 px). Nada de píldoras salvo avatares e
  indicadores circulares.
- **Bordes en lugar de sombras.** Solo flotan con sombra las superficies que
  están *encima* de otras: diálogos, paneles, menús y notificaciones.
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
| `--foreground` / `--foreground-muted` | grafito 950 / 500 | papel / grafito 400 | Texto |
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
| Radios | `--radius-sm` 2 · `md` 4 · `lg` 6 · `xl` 8 px |
| Controles | `--control-h` 40 px · `--row-h` 56 px |
| Layout | `--sidebar-width` 248 · colapsada 76 · `--topbar-height` 60 (72 desde 768 px) · `--content-max` 1280 · `--content-prose` 72 ch |
| Superficies | `--dialog-w-sm` 440 · `md` 520 · `lg` 640 · `xl` 768 · `--drawer-w` 440 · `--drawer-w-lg` 560 · `--popover-w` 320 |

### Elevación y capas

Sombra solo en lo que flota: `--shadow-popover` (menús, ayuda) y
`--nx-shadow-overlay` (diálogos y paneles).

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

Diseño atómico en `components/`. Cada componente compartido tiene historia en
Storybook con sus estados.

| Nivel | Carpeta | Qué va | Ejemplos |
|---|---|---|---|
| Tokens | `packages/brand/css` | Valores | color, capas, movimiento |
| Átomos | `components/atoms` | Un control, sin estado de negocio | `Button`, `Input`, `Select`, `Switch`, `Badge`, `NMark`, `Skeleton` |
| Moléculas | `components/molecules` | Combinación pequeña con contrato | `Field`, `ContextHelp`, `Popover`, `Tooltip`, `Alert`, `EmptyState`, `LoadingState`, `Toast`, `PageHeader`, `KpiCard` |
| Organismos | `components/organisms` | Bloque con comportamiento | `ResponsiveSheet`, `FormDialog`/`FormDrawer`, `ConfirmDialog`, `DataTable`, `AppSidebar`, `CommandPalette` |
| Plantillas | `components/templates` | Esqueleto de página | `TenantShell`, `AuthLayout`, `OnboardingLayout` |
| De una función | `app/**/_components` | Componen lo compartido; no recrean modales ni campos | `CustomerSheet`, `TicketDesk` |
| Datos | `lib/**` | Repositorios, permisos, dinero | `lib/business/*-db.ts` |

### Capa de interacción (usar siempre estas)

| Necesito… | Componente | Archivo |
|---|---|---|
| Diálogo o panel lateral genérico | `ResponsiveSheet` (`drawer`, `size`, `busy`) | `components/organisms/responsive-sheet.tsx` |
| Formulario en diálogo | `FormDialog` | `components/organisms/form-sheet.tsx` |
| Formulario en panel lateral | `FormDrawer` | `components/organisms/form-sheet.tsx` |
| Confirmar (anular, eliminar) | `ConfirmDialog` o `useConfirm()` | `components/organisms/confirm-dialog.tsx` |
| Ventana flotante compacta | `Popover` | `components/molecules/popover.tsx` |
| Ayuda "?" | `ContextHelp` | `components/molecules/context-help.tsx` |
| Nombre de un botón de icono | `Tooltip` (además del `aria-label`) | `components/molecules/tooltip.tsx` |
| Campo con etiqueta, descripción y error | `Field` (+ `FieldError`, `FieldDescription`, `focusFirstInvalid`) | `components/molecules/field.tsx` |
| Resultado de una acción | `useToast()` | `components/molecules/toast.tsx` |
| Error o aviso dentro del formulario | `Alert` | `components/molecules/alert.tsx` |
| Nada que mostrar | `EmptyState` | `components/molecules/empty-state.tsx` |
| Esperando una sección (sin forma conocida / en línea) | `LoadingState` (la N) | `components/molecules/loading-state.tsx` |
| Esperando contenido dentro de un panel, ficha o lista | `SkeletonRows` (esqueleto con la forma de lo que viene) | `components/molecules/skeleton-rows.tsx` |
| Esperando la página | `PageSkeleton` (en `loading.tsx`) | `components/organisms/page-skeleton.tsx` |
| Elegir una opción de una lista | `Select` propio (mismos props que `<select>`; **no** usar `<select>` nativo) | `components/atoms/select.tsx` |
| Menú de acciones | `DropdownMenu` | `components/molecules/dropdown-menu.tsx` |
| Inicio que cada persona ordena | `CustomizableDashboard` (12 columnas; se edita manteniendo presionado un bloque, sin botón «Personalizar»; arrastrar, ancho y alto por las esquinas, ocultar y «Agregar» gráficos del catálogo `lib/dashboard/chart-catalog.ts`; cada tarjeta es su propio bloque `widgets` con `id`, `label`, `span` y `half`; preferencia versionada en `localStorage`) | `components/organisms/customizable-dashboard.tsx`, lógica en `lib/dashboard/layout.ts` |
| Guiar a una cuenta nueva | `WelcomeChecklist` («Primeros pasos»): pasos por módulo activo, marcados por datos reales; «Ocultar» por negocio en `localStorage` | `components/organisms/welcome-checklist.tsx`, armado en `app/[tenant]/(app)/page.tsx` |
| Buscar clientes y catálogo | `CommandPalette` (Ctrl K) + `searchEntitiesAction`: desde 2 letras, 250 ms de espera, máx. 5 por tipo, solo módulos activos y siempre por `tenantId` | `components/organisms/command-palette.tsx`, `app/[tenant]/(app)/_actions/search.ts` |
| Instalar la app / aviso de versión | `usePwa()`, `UpdateNotice` | `components/providers/pwa.tsx` (política en `docs/design/pwa.md`) |

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
5. **Modales que nacen del botón.** En PC, `ResponsiveSheet` (modal
   centrado) se abre con un morfeo desde el control que lo activó (arranca con
   su tamaño y posición, 380 ms, con enfoque) y se cierra hacia él (200 ms). Si
   el control ya no existe, está fuera de pantalla, hay movimiento reducido o
   la forma es panel lateral u hoja móvil, entra la animación centrada de
   siempre. No bloquea la interacción ni el foco. Detalle y fundamento (por qué
   no la API nativa de View Transitions) en
   [docs/design/movimiento.md](docs/design/movimiento.md).
6. **Propietario de cada transición** (una sola técnica por superficie):

   | Superficie | Dueño |
   |---|---|
   | Entrada de una vista al navegar | CSS: `nx-view-in` en `template.tsx` |
   | Diálogo, panel, hoja | CSS (módulo de `ResponsiveSheet`) + origen contextual |
   | Menús, popovers, ayuda, buscador | CSS (`tw-animate-css` de Radix / `nx-drop`) |
   | Cifras, barras, gráficos | Web Animations (`lib/motion`) |

   **View Transitions: no se usan.** La documentación de Next 16 las ofrece
   con `<ViewTransition>` de React, pero hoy (React 19.2 estable) esa pieza
   solo existe en canary, la entrada de vistas ya tiene dueño (CSS) y dos
   dueños sobre la misma navegación se pisan. Se reevalúa cuando sea estable y
   haya un caso real de elemento compartido (p. ej. tarjeta → ficha de una
   obra), con `prefers-reduced-motion` y fallback sin la API.
7. **Movimiento reducido:** `prefers-reduced-motion` o Ajustes → Reducir
   movimiento (`<html data-motion="off">`) llevan toda animación a 1 ms.
   El cambio de estado se sigue entendiendo (texto, color, icono).

---

## 5. Layout y responsive

- **Shell de la app** (`TenantShell`, y el mismo para el panel CEO): barra
  lateral fija desde 768 px (completa o riel), barra superior con desenfoque,
  barra inferior con "Crear" en el celular.
- **Página:** `PageHeader` (eyebrow, título, descripción, acción principal a
  la derecha) → filtros → contenido. Ancho máximo `--content-max`.
- **Puntos de quiebre:** `sm` 640 · `md` 768 (modal centrado y panel lateral;
  barra lateral) · `lg` 1024 · `xl` 1280.
- **Móvil:** diálogos y paneles son hojas inferiores; tablas pasan a lista;
  nada de scroll horizontal accidental (`overflow-x: clip` en `html`).
- **Impresión:** recibos y cuentas de cobro imprimen solo el documento.

---

## 6. Cómo se mantiene

1. ¿Falta un token? Se agrega en `tokens.css` **y** `tokens.json`, y en la
   tabla de arriba.
2. ¿Un componente compartido nuevo o una variante nueva? Historia en
   Storybook con sus estados, prueba en `e2e/` si tiene interacción, y fila
   en la §3.
3. ¿Cambió un patrón de interacción? Se actualiza
   `docs/design/interaction-patterns.md` en el mismo PR.
4. `pnpm test:e2e` (Playwright + axe sobre Storybook) antes de abrir el PR.
   Pendiente: sumarlo al CI (`.github/workflows/ci.yml`; el cambio está
   descrito en el PR del rediseño, requiere permiso `workflow`).
5. `lib/design/ui-rules.test.ts` (en `pnpm test`) falla si aparece un
   `window.confirm`, un modal hecho a mano, Radix Dialog directo o un
   `z-index` numérico fuera de sus listas de deuda, que solo se achican.
