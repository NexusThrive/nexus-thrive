# Inventario y auditoría de diseño · octubre 2026

[← DESIGN.md](../../DESIGN.md) · Punto de partida del rediseño
([REDISENO-NEXUS.md](../../REDISENO-NEXUS.md), Paso 0, puntos 1 y 2).
Hecho sobre el código de `main` (`f85ac9f`) el 2026-10-23.

> Herramientas: los comandos `/impeccable` **no están instalados** en este
> entorno; la auditoría se hizo a mano con su mismo enfoque (inventario →
> hallazgos por severidad → plan), más Playwright y axe-core sobre Storybook.
> Mobbin y SaaSUI no se consultaron (requieren cuenta); las decisiones se
> apoyan en WAI-ARIA APG y en el sistema existente.

## 1. Inventario: lo que ya existe y se conserva

| Área | Qué hay | Dónde |
|---|---|---|
| Marca | Logo N + THRIVE, negro dominante, oro único acento, radios 2–8 px, bordes sobre sombras, corte a −24° | `packages/brand/` |
| Tokens | Color claro/oscuro, tipografía, espacio 4 px, radios, movimiento d1–d4 y curvas, densidad, layout | `packages/brand/css/tokens.css`, `tokens.json` |
| Fuentes | Montserrat, Inter, JetBrains Mono, Public Stunt | `lib/fonts.ts` |
| Temas | Claro y oscuro (`.dark`), densidad compacta, reducir movimiento | `components/providers/preferences.tsx` |
| Movimiento | CSS + Web Animations API, sin librerías; resortes precalculados; `data-press`, `nx-rise`, barrido de tema | `app/styles/motion.css`, `lib/motion/` |
| Componentes | 31 átomos, 44 moléculas, 38 organismos, 6 plantillas, casi todos con historia | `components/` |
| Catálogo | Storybook 10 con addon a11y y temas; se construye en CI | `.storybook/` |
| Superposiciones | `ResponsiveSheet` (hoja móvil arrastrable / modal / cajón), usado en 27 lugares | `components/organisms/responsive-sheet.tsx` |
| Formularios | `Field` con cableado ARIA (25 usos), `Input`, `Select`, `Textarea`, `MoneyInput`, `PhoneInput` | `components/molecules/field.tsx`, `components/atoms/` |
| Avisos | Toast con deshacer y barra de tiempo, `LoadingToast`, `Alert`, `NetworkBanner` | `components/molecules/` |
| Estados | `EmptyState` con la N (21 usos), `PageSkeleton` (18), `Skeleton`, `NMark` | |
| Navegación | Barra lateral, barra superior, barra inferior móvil con "Crear", paleta de comandos | `components/organisms/` |

## 2. Hallazgos

Severidad: **Alta** = rompe accesibilidad o una tarea; **Media** = incoherencia
visible o riesgo; **Baja** = pulido.

### Componentes compartidos

| # | Sev. | Hallazgo | Estado |
|---|---|---|---|
| C1 | Alta | Al cerrar un `ResponsiveSheet` abierto con `open` (sin `trigger`), el foco se perdía (Radix solo devuelve el foco a su propio `Trigger`). Afectaba a los ~27 paneles de la app. Lo encontró la prueba de Playwright. | **Corregido** (PR 1) |
| C2 | Alta | Capas `z-index` sin sistema: tooltip y menús en `z-50`, por **debajo** de los paneles (`z-71`) que los contienen; barra lateral también en 50 que el diálogo de shadcn. 19 valores distintos. | **Corregido**: escala `--z-*` (PR 1) |
| C3 | Alta | `DeleteBusinessDialog` hecho a mano: sin foco atrapado, sin Escape, sin devolución del foco; colores `rose-*` fuera de la marca. | **Corregido**: sobre `ConfirmDialog` (PR 1) |
| C4 | Media | `Field` apuntaba `aria-describedby` a la descripción aunque no se mostrara (con error se ocultaba): referencia rota y la descripción desaparecía al equivocarse. Sin `aria-required`, sin "(opcional)". | **Corregido** (PR 1) |
| C5 | Media | No había ayuda "?" accesible: la explicación vivía en atributos `title` (62 archivos de `app/` los usan; no llegan por teclado ni táctil). | `ContextHelp` creado (PR 1). PR 2: los `title` que explicaban en botones y enlaces (invitación, salud de la cuenta, desvincular) pasan a `ContextHelp` o a la confirmación; quedan `title` de texto truncado (no son ayuda) |
| C6 | Media | Tres diálogos distintos: `ResponsiveSheet`, `organisms/dialog.tsx` y `organisms/sheet.tsx` (shadcn sin adaptar: `bg-black/50`, `z-50`, sin hoja móvil). | PR 2: sus 3 usos migrados (ficha del negocio, suspender, paleta del panel CEO) y **eliminados**; la prueba de UI impide usar Radix Dialog fuera de la base |
| C7 | Media | No había formulario en superficie: cada panel repetía pie, botón de carga, bloqueo y manejo de errores, con resultados distintos. | `FormDialog`/`FormDrawer` (PR 1) |
| C8 | Media | Confirmaciones con `window.confirm`: 10 usos en 9 archivos (texto del navegador, sin marca, no muestra el error). La única confirmación propia vivía dentro de CRM. | `ConfirmDialog` + `useConfirm()` compartidos (PR 1); **PR 2: todos migrados**, y los 5 `window.alert` pasaron a avisos. La prueba `lib/design/ui-rules.test.ts` impide sumar nuevos |
| C9 | Media | La opción `drawer` del panel no la usa nadie: fichas y registros largos (cliente: 24 campos; lead: 27) abren como modal centrado. | **PR 2**: 10 fichas y registros pasan a panel lateral (§4) |
| C10 | Baja | Faltaban tokens de capas, elevación, foco, anchos de superficies y movimiento de superposiciones; duraciones repetidas a mano. | **Corregido** (PR 1) |
| C11 | Baja | No había `LoadingState` para secciones (solo `PageSkeleton` de página o spinners sueltos). | Creado (PR 1) |
| C12 | Baja | Public Stunt está cargada pero ningún componente la usa; su archivo es de uso personal. | Documentado; sin cambios |

### Panel CEO (`/admin`)

| # | Sev. | Hallazgo | Propuesta |
|---|---|---|---|
| P1 | Media | Navegación agrupada como "Operaciones · Clientes · Administración · Sistema", que no sigue el trabajo del equipo: "Onboarding" y "Negocios" en Operaciones pero "Salud de cuentas" en Clientes; "Presence Thrive" junto a Soporte; "Accesos" (códigos de activación) con un nombre que no dice qué es. | **PR 2**: reagrupado por responsabilidad: **Hoy** (Inicio, Bandeja, Soporte) · **Cuentas** (Negocios, Onboarding, Salud, Facturación) · **Comercial** (CRM, Presence, Satisfacción) · **Producto** (Planes y módulos, Accesos) · **Plataforma** (Equipo y permisos, Auditoría). El nombre "Accesos" se conserva (lo fija una prueba existente) |
| P2 | Media | El inicio muestra hasta 9 grupos de prioridad seguidos antes de las métricas; los vacíos ocupan sitio. | **PR 2**: solo los grupos con pendientes van como tarjeta; los que están al día se resumen en una línea |
| P3 | Media | Mezcla de idiomas: "Operations Center", "lead", "Presence Thrive", "Onboarding". | Sin cambios en PR 2 (decisión de producto, no de diseño); se dejan los nombres actuales |
| P4 | Media | `beneficios`: dos formularios de creación incrustados en la página; la lista queda debajo. | Pasar a "Nuevo código" en panel lateral (PR 5, junto con los códigos a medida) |
| P5 | Baja | `tenant-drawer` y `suspend-dialog` usan el `Sheet`/`Dialog` de shadcn (C6). | **PR 2**: migrados |
| P6 | Baja | Tres `window.confirm` (quitar integrante, eliminar lead, suspender por falta de pago). | **PR 2**: migrados |

Lo que está bien y se conserva: el inicio pone primero lo que pide acción, las
métricas son reales (`getExecutiveMetrics`) y lo que aún no existe
(`informes`) no se muestra.

### Espacio del negocio (`/{negocio}`)

| # | Sev. | Hallazgo | Propuesta |
|---|---|---|---|
| W1 | Media | La barra lateral pone todos los módulos en un solo grupo "Gestión", en el orden en que se activaron. Con 8 módulos se vuelve una lista larga sin forma. | **PR 2**: agrupado en **Clientes y operación** · **Dinero** · **Canales**, sin grupos vacíos; los encabezados de página usan el mismo nombre |
| W2 | Media | Un taller o una guía turística con `quotes` ve "Catálogo APU" (es de construcción). | Separar construcción de cotizaciones (PR 6, ARCH-01) |
| W3 | Media | 7 `window.confirm` (6 archivos) en anular venta, cancelar membresía, regenerar QR, eliminar partida/capítulo, cerrar obra, borrar ítem. | **PR 2**: migrados |
| W4 | Media | Formularios del proyecto de obra incrustados en pestañas (Lean: 5, cotizaciones de la obra: 3) junto a listas. | Pendiente: requiere probar cada flujo de obra con datos reales (ver PR 2) |
| W5 | Baja | `orders` es una pantalla vacía en el menú. | Fuera del alcance del rediseño (producto, Bloque B) |

## 3. Herramientas

| Herramienta del mandato | Estado |
|---|---|
| Impeccable (`/impeccable …`) | No disponible en este entorno; equivalente manual documentado aquí |
| Mobbin, SaaSUI | No consultados (requieren cuenta) |
| shadcn/ui + Radix | Ya en el proyecto; se agregó `@radix-ui/react-popover` (misma familia, para `Popover` y `ContextHelp`) |
| Motion for React | **No se instala**: CSS + WAAPI cubren todo lo actual (DESIGN.md §4) |
| WAI-ARIA APG | Referencia de `ContextHelp` (toggletip), diálogos y foco |
| Playwright | Agregado (`@playwright/test`), sobre Storybook estático |
| axe-core | Agregado (`@axe-core/playwright`), WCAG 2.2 AA en claro y oscuro |
| Storybook | Ya existía; historias nuevas para cada componente agregado |
| Lighthouse | No corrido sobre la app autenticada (requiere sesión); pendiente con usuario de prueba |

## 4. Formularios

Patrón objetivo de cada formulario existente. "Hoy" es como abría en `main`
antes del rediseño.

**Aplicado en el PR 2:** todo lo marcado **Panel lateral**, la ficha del
negocio, suspender, y todas las confirmaciones. **Pendiente:** los tamaños
`lg`/`xl` puntuales y los formularios en línea del proyecto de obra (Lean,
bitácora, avance, cotizaciones de la obra), que necesitan probarse con datos
reales de una obra antes de moverlos.

### Espacio del negocio

| Formulario | Hoy | Objetivo | Por qué |
|---|---|---|---|
| Cliente nuevo/editar (`crm/customer-sheet`) | Diálogo | **Panel lateral** | 24 campos, secciones por rubro |
| Detalle de cita (`bookings/booking-detail`) | Diálogo | **Panel lateral** | Detalle con contexto de la agenda |
| Cita nueva (`bookings/booking-sheet`) | Diálogo | Diálogo `lg` | Se crea rápido sobre la agenda |
| Producto nuevo/editar (`inventory/product-sheet`) | Diálogo | **Panel lateral** | 18 campos |
| Ficha de producto (`inventory/product-detail`) | Diálogo | **Panel lateral** | Detalle con movimientos |
| Cuenta de cobro (`billing/invoice-sheet`) | Diálogo | **Panel lateral** | Líneas y totales |
| Membresía nueva (`memberships/membership-form`) | Diálogo | Diálogo | Pocos campos |
| Renovar / congelar / recordatorio | Diálogo | Diálogo | Acción corta |
| Cerrar caja con arqueo (`finance/cash-panel`) | Diálogo | Diálogo `lg` | Acción corta con conteo |
| Detalle de movimiento (`finance/money-detail-sheet`) | Diálogo | **Panel lateral** | Detalle |
| Escanear pago | Diálogo | Diálogo | Acción corta |
| Taquilla: vender / anular (`tickets/ticket-desk`) | Diálogo + `window.confirm` | Diálogo + `ConfirmDialog` | Rapidez en mostrador |
| Invitar persona (`settings/team-tab`) | Diálogo | Diálogo | Pocos campos |
| Perfil del negocio (`settings/profile-tab`) | Página (pestaña) | Página | Configuración amplia |
| Módulos (`settings/modules-tab`) | En línea | En línea | Interruptores |
| Notas del cliente (`crm/[id]/notes-panel`) | En línea | En línea | Una nota en su contexto |
| Check-in (`checkin/checkin-station`) | Página | Página | Estación dedicada |
| Proyecto nuevo (`projects/new-project-modal`) | Diálogo | Diálogo | Pocos campos |
| Capítulo, partida, AIU, APU, importar catálogo | Diálogo | Diálogo (`xl` para APU) | Edición puntual sobre el presupuesto |
| Ficha del proyecto (`project-header-form`) | Página (pestaña) | Página | Documento largo |
| Bitácora, avance, Lean, cotizaciones de la obra | En línea en pestañas | Revisar uno a uno: crear → diálogo; la lista queda en la pestaña | Hoy mezclan formulario y lista |
| Catálogo APU (`catalog/items-bank`, `activity-catalog`) | Diálogo + `window.confirm` | Diálogo + `ConfirmDialog` | |
| Cotizaciones antiguas (`quotes/legacy-quotes`) | En línea | En línea | Acción "pasar a obra" puntual |

### Panel CEO

| Formulario | Hoy | Objetivo | Por qué |
|---|---|---|---|
| Negocio nuevo (`tenant-form`) | Diálogo | Diálogo `lg` | 10 campos, sin contexto |
| Ficha del negocio (`tenant-drawer`) | Cajón shadcn | **Panel lateral** (`ResponsiveSheet drawer`) | Unificar con el resto |
| Suspender (`suspend-dialog`) | Diálogo shadcn | `FormDialog` destructivo | Motivo obligatorio |
| Lead nuevo/editar (`crm/lead-sheet`) | Diálogo | **Panel lateral** | 27 campos |
| Eliminar lead, quitar integrante, suspender por falta de pago | `window.confirm` | `ConfirmDialog` | |
| Ticket de soporte (`soporte/ticket-sheet`) | Diálogo | **Panel lateral** | Conversación y estado |
| Cobro y suscripción (`facturacion/*-sheet`) | Diálogo | **Panel lateral** | Detalle con historial |
| Rol (`equipo/role-builder`) | Diálogo | Diálogo `lg` | Matriz de permisos |
| Rubro (`planes/verticals-panel`) | Diálogo | Diálogo | |
| Contactos del negocio | Diálogo | Diálogo | |
| Códigos de activación (`beneficios`) | En la página | **Panel lateral** | Ver P4 (PR 5) |
| Cuenta del negocio (`negocios/[id]/account-form`) | Página | Página | Configuración amplia |
| Presence: solicitudes | En línea | En línea | Cambiar estado |
| Auditoría: filtros | En línea | En línea | Filtros |
