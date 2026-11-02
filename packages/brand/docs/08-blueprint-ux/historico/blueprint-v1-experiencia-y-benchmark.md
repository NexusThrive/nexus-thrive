# Nexus Thrive · Blueprint del sistema de experiencia (Fases 0 y 1)

Fecha: 2026-11-01 · Rama inspeccionada: `chore/HU-corregir-p1-responsive-01` (`ef7c749`) · Alcance: solo lectura. No se modificó código.
Convención: **[H]** hecho observado · **[Y]** hipótesis · **[R]** recomendación.

---

## 0. Estado verificado del repositorio

| Elemento | Resultado |
|---|---|
| Repos | `nexus-thrive` (principal) y `nexus-thrive-web`. El directorio padre no es repo. |
| PR abiertos | #122, #123, #140 y #141 (base `main`); #142 (base #141); #143 (base #142). Pila responsive: main ← #141 ← #142 ← #143. |
| Checks | Los seis PR tienen checks en SUCCESS. #140–#143 mergeables. |
| Rama activa | `chore/HU-corregir-p1-responsive-01`, sincronizada con `origin`, sin cambios en archivos rastreados. |
| Sin rastrear | `.claude/skills/{banner-design,brand,design-system,design,slides,ui-styling,ui-ux-pro-max}`: skills de terceros (claudekit), **no mías ni del repo**. No las toqué. |
| Servidor | Puerto 3001 escuchando (conservado). |
| Worktrees | Solo el principal. Sin otro proceso detectado sobre la rama. |
| No verificado | No volví a ejecutar `pnpm verify`, la suite de 224 ni los 2 fallos intermitentes de `overlays.spec.ts`: los cito del reporte. |

**Hallazgo estratégico [H]:** el sistema de diseño **ya existe y es sólido**. No partimos de cero.

- `packages/brand/` tiene tokens (`css/tokens.css`), 7 carpetas de docs, `DESIGN.md`, `SYSTEM-DESIGN.md` (seis niveles), `inventario-patrones.md`, `decisiones-nexus-design-system.md` (decisiones 1–3 y principio 08 móvil ratificado), `guia-de-tono.md`, accesibilidad, movimiento, PWA.
- 138 componentes compartidos (atoms 34 / molecules 52 / organisms 46 / templates 6), ~146 archivos de historias, Playwright + axe, infraestructura responsive.
- `CLAUDE.md` ya impone: reusar antes de crear, cuatro estados, prohibiciones (`window.confirm`, modales manuales, z-index numérico), pruebas en 320/360/412/820/1180/1280.

**Consecuencia [R]:** el trabajo no es «inventar un sistema» sino **cerrar brechas, unificar y adoptar**. El pedido de «un segundo sistema de tokens» queda descartado, tal como indica la instrucción.

---

## 1. Qué está bien construido [H]

| Área | Evidencia (re-medida hoy con `node scripts/design-inventory.mjs`) |
|---|---|
| Interacción consolidada | 0 `window.confirm/alert`; 0 modales manuales; `Field` 251 usos; `ResponsiveSheet` 31; `FormDialog/Drawer` 28; `ConfirmDialog` 13; `EmptyState` 44; `Alert` 47; `useToast` 64 |
| Base técnica alineada con shadcn | Radix (dialog, dropdown, popover, tooltip, switch, checkbox, avatar, slot) + `class-variance-authority` + `cmdk` + Tailwind 4 + `lucide-react`. `Button` ya tiene forma shadcn (variantes + `asChild`) |
| Marca y tokens | Fuente única en `packages/brand`; densidad `data-density="compact"` (`--control-h` 40→34 px) |
| Navegación por capacidades | `tenant-nav.ts` + `registry.ts` generan el menú por rubro y módulos activos, con vocabulario por vertical (Socios, Pacientes, Obras). Un solo origen para menú, «Funciones» y encabezados de página (`routeCategory`) |
| Documentación de calidad | Checklist de PR, límites de análisis declarados |
| Responsive | Infra de pruebas (#141), historia fiel (#142), P1 corregidos (#143) |

---

## 2. Qué está duplicado o inconsistente [H]

| # | Hallazgo | Medición | Gravedad |
|---|---|---|---|
| 1 | **Ninguna ruta tiene `error.tsx`**, ni `global-error.tsx`; `not-found` solo en la raíz | 0 de 72 páginas | Alta (confianza) |
| 2 | **Sin patrón de tabla**: `DataTable` (46 líneas, `min-w-full`, sin variante móvil) tiene 0 usos; 33 `<table>` nativas en 31 archivos | | Alta, y es la mayor brecha responsive |
| 3 | **Escala tipográfica**: 736 usos de tamaños fuera de token en 199 archivos (`text-[13px]` ×308, `[13.5px]` ×73, `[12.5px]` ×64…). Decisión 1 aprobada (`text-2xs` 11, `text-ui` 13), **sin implementar** | | Media-alta |
| 4 | **API doble de botón**: `buttonVariants` sobre `<button>` (385 llamadas reales) frente a `<Button>` (54). Decisión 2 aprobada como dirección, **sin migrar**; 2b (tamaño por defecto) **pendiente** | | Media |
| 5 | **Cobertura de estados**: `loading.tsx` en 37 de 72 páginas (51 %); 0 historias «Sin conexión» y 0 «Guardando»; solo 4 archivos con historia «Cargando» | | Media |
| 6 | **19 componentes sin uso, 24 sin historia** (clasificación provisional 5 conservar / 10 consolidar / 4 retirar a Laboratorio) | | Baja-media |
| 7 | **Breakpoints del shell**: etiquetas de sidebar y topbar desde **1200 px** (`app-sidebar.module.css`, `app-topbar.module.css`), no 1024. Entre 768 y 1199 solo hay riel de iconos | | Alta frente a la regla pedida (≥1024 expandida) |
| 8 | **Tablet** (de la auditoría #140): riel sin etiquetas, etiqueta de grupo recortada a 10 px, buscador truncado con `Ctrl K` en pantalla táctil; un iPad mini (744 px) recibe el diseño de teléfono | | Media (P2) |
| 9 | **Targets táctiles de 40 px** en acciones de cabecera y cierre de hojas | | Media (P2) |
| 10 | Valores sueltos: 25 `z-index` numéricos, 114 colores arbitrarios (concentrados en recibos/documentos/facturas), 28 `style={{}}` | | Baja |
| 11 | **Nomenclatura**: «Pagos» (nav de Finanzas), «Cobros en línea», «Cartera», «Taquilla», «Existencias», «Catálogo» (inventario) y «Catálogo APU» (construcción) coexisten sin glosario oficial | ver §6 | Media |
| 12 | **Integraciones dispersas**: Google, WhatsApp, Factura electrónica, Wompi y webhooks viven como módulos sueltos; no hay un lugar que diga «qué está conectado y quién es dueño del dato». Existe `ExternalConnection`/`ProviderEvent` en Prisma y `lib/integrations/{einvoice,google,maps,providers}` | | Oportunidad |

**Contradicción a resolver [H]:** `CLAUDE.md` ordena probar en 375 y en otro lugar en 360/412; la auditoría #140 propone 320/360/412/820/1180/1280 y el brief actual agrega 375 como regresión. Propongo fijarlo (ver §8).

**Skills de terceros [H]:** `ui-styling` (claudekit) describe shadcn/ui y trae sus propios patrones, pero **no hay `components.json`** en el repo, es decir shadcn nunca se inicializó. [R] Se usará solo como referencia técnica; no ejecutar `shadcn init` (reescribiría `globals.css` y tokens). Si se necesita un componente, se copia a mano adaptando a tokens Nexus.

---

## 3. Benchmark de referencia

**Limitaciones declaradas.** Solo pude consultar documentación y páginas públicas (búsqueda web estándar). **No accedí a las pantallas internas** de Odoo, Zoho, Alegra, Siigo, Holded, Shopify ni Square con cuenta; no hay observación directa de sus dashboards. Sobre **Siigo y Holded no encontré fuentes primarias**: quedan sin evaluar hasta tener acceso (demo o documentación oficial). Varias fuentes secundarias son comparativas promocionales. Antes de decidir lo marcado como «verificar», hay que revisar la fuente primaria.

| Área | Referencia | Patrón observado | Ventaja | Riesgo | Decisión para Nexus | Fuente / confianza |
|---|---|---|---|---|---|---|
| Tablas móviles | Shopify Polaris | `Table` nuevo renderiza **lista en pantallas pequeñas y tabla en grandes** (variante `Auto`); cada columna declara su rol en la lista (`listSlot`); filas navegan al detalle; paginación sobre 50 ítems; el `IndexTable` React oculta acciones masivas bajo 490 px (`condensed`) | Sin scroll horizontal; acciones coherentes | Ocultar selección masiva quita capacidad; un foro reporta que la variante `table` revierte a lista en móvil | Adoptar el patrón «tabla ↔ lista por rol de columna» en `DataTable`; la selección masiva queda accesible (barra inferior), no oculta | [shopify.dev Table](https://shopify.dev/docs/api/app-home/latest/web-components/layout-and-structure/table), [Polaris Index table](https://polaris.shopify.com/components/lists-and-tables/index-table). Alta para docs; media para el bug (foro) |
| Navegación jerárquica | Odoo 17/18 | Tres niveles: raíz en conmutador de apps, primer nivel en la barra superior, acciones debajo. Odoo 18 ofrece PWA instalable por app | Escala a muchos módulos | Barra superior de módulos no cabe en móvil; documentación consultada no cubre el menú móvil | Conservar sidebar por categorías (ya escala); **no** copiar el conmutador de apps | [Odoo 18 release notes](https://www.odoo.com/odoo-18-release-notes), [tutorial](https://www.odoo.com/documentation/18.0/developer/tutorials/server_framework_101/05_firstui.html). Media: no vi la UI |
| Ecosistema | Zoho | Interfaz unificada entre apps; marketplace con 2.900+ extensiones en 40+ categorías (cifra de Zoho); integración nativa se configura desde Configuración → Integraciones; Zapier con 500+ apps; el plan no incluye las extensiones | Una sola puerta de entrada | Cifras de marketing; complejidad de planes | Un centro **Integraciones** en Configuración con estado por herramienta, sin promesas de catálogo | [Zoho One](https://www.zoho.com/one/), [FAQ](https://www.zoho.com/one/applications/faq.html), [Books add-ons](https://www.zoho.com/us/books/addons/). Media |
| Marketplace local | Alegra | Marketplace con categorías (e-commerce, pagos en línea, POS, documentos, CRM, mercadeo); la mayoría de apps se configura en pocos clics y muestra costo | Referencia colombiana; adopción simple | Fuente consultada es artículo promocional | Categorías por **función de negocio**, costo y estado visibles; solo listar lo que existe | [Siempre al Día](https://siemprealdia.co/colombia/contabilidad/marketplace-de-alegra/). **Baja**: verificar en alegra.com |
| Integraciones nativas | Siigo / Alegra | Integraciones nativas con Shopify, WooCommerce y MercadoLibre (según comparativa) | Relevante para el mercado colombiano | Fuente secundaria | Priorizar *importar/exportar* y *conexión por proveedor* sobre sincronización bidireccional | [Guía de Software](https://www.guiadesoftware.com/blog/mejor-software-contabilidad-colombia). **Baja** |
| Conexión y desconexión | Square | Instalar desde Configuración → Integraciones de apps (o por categorías); desconectar desde el menú «⋯» de cada app; add-ons dentro del dashboard solo en alfa privada, con librería de componentes React propia | Patrón claro de ciclo de vida | Add-ons incrustados aún no disponibles | Tarjeta de conexión con menú de acciones (reconectar, desconectar, ver permisos) | [Square Help](https://squareup.com/help/article/5437), [Dashboard add-ons](https://square.github.io/dashboard-addons-docs). Alta (ayuda) |
| Holded | Holded | Sin fuentes primarias obtenidas | — | — | **No evaluado** | — |

**Separación [H/R]:**
- *Patrones comunes del sector:* navegación por categorías/módulos, tabla que se vuelve lista en móvil, centro de integraciones en Configuración, categorías de marketplace.
- *Decisiones particulares (no copiar):* conmutador de apps de Odoo, planes/extensiones de Zoho, add-ons incrustados de Square.
- *Diferenciación para Nexus [Y]:* **procedencia del dato** («este dato lo gestiona Alegra / Nexus»), conflictos de sincronización visibles, y vocabulario por rubro. Ninguna de las fuentes consultadas lo muestra como patrón central, pero mi cobertura fue limitada; es hipótesis a validar.

---

## 4. Escala de patrones: estado y plan

Regla de 3 pasos antes de crear: *(1) ¿existe?* → *(2) ¿se adapta con una variante?* → *(3) ¿hay dos usos reales?* (ya es política de `CLAUDE.md`).

| Nivel | Existe hoy [H] | Brecha | Acción [R] |
|---|---|---|---|
| 1 Tokens | `packages/brand/css/tokens.css`, `theme-v4.css` | `text-2xs`/`text-ui` aprobados sin crear; tokens de documento/impresión inexistentes (colores a mano); breakpoints no tokenizados | Añadir 2 tokens de texto, familia `--doc-*` para recibos/facturas, tokens de breakpoint documentados |
| 2 Primitivas | Button, Input, Select, Checkbox, Switch, Badge, Avatar, Skeleton, Label, Textarea, Kbd | Tooltip/Separator/Radio no son átomos propios (Tooltip vive en Radix); `Checkbox` y `Avatar` sin uso; API doble Button/Input | Cerrar decisiones 2/2b/2c; no crear Radio hasta tener 2 usos |
| 3 Compuestos | Field, Alert, EmptyState, LoadingState, Breadcrumbs, PageHeader, Pagination, Popover, DropdownMenu, CommandPalette, ResponsiveSheet, ConfirmDialog | **FilterBar, DateRangePicker, ErrorState (de ruta), NotificationItem** no existen como componentes; `MonthCalendar` sin uso | Crear solo `ErrorState` y `FilterBar` (los dos con usos reales demostrables); evaluar DateRange con los selectores de periodo existentes |
| 4 Patrones | Formulario en diálogo/panel, confirmación destructiva, estado vacío | **Tabla con filtros y variante móvil**, importación/exportación como patrón, conexión de integración, gestión de permisos, panel de actividad | Fichas de patrón en Storybook («4 · Patrones», propuesto en el inventario) |
| 5 Templates | 6 (TenantShell y otros) | Listado, Detalle, Formulario, Configuración, Reportes sin template | Extraer Listado y Configuración primero (más repetidos) |
| 6 Experiencias | 24 historias de Páginas | Sin recorridos de estados por flujo | Reorganizar por flujo; piloto: «Registrar cliente» y «Cobrar» |
| 7 Módulos | 24 capacidades en 8 categorías | Cada módulo arma su tabla/filtros | Adopción progresiva por módulo con checklist |

**Densidad [R]:** conservar dos escalas ya implementadas (estándar 40 px, compacta 34 px). **No** agregar «cómoda»: sin evidencia de necesidad. Excepción: contexto táctil (`pointer-coarse`) sube a 44 px *solo en acciones primarias*, según auditoría #140 (decisión pendiente tuya).

**Reglas de diseño de densidad:** cifras financieras ≥ 16 px (ya en #143), metadatos ≥ 11 px, tablas operativas 13 px, sin sombras decorativas (bordes en lugar de sombras: ya es principio de marca).

---

## 5. Estados y mensajes

Matriz de 11 estados de `inventario-patrones.md` §5.3 se mantiene. Cierre de brechas:

| Estado | Falta | Acción |
|---|---|---|
| Error de ruta | `error.tsx`, `global-error.tsx`, `not-found` por segmento | Un `ErrorState` compartido + archivo por segmento (cambio pequeño, alto valor) |
| Sin conexión | Historia y comportamiento por acción | Historias de `NetworkBanner`; definir qué acciones se deshabilitan |
| Guardando / Guardado | Sin patrón fuera de formularios | Convención: botón con estado + `useToast` + «qué sigue» |
| Sin permiso | Dos tratamientos (`notFound()` y `StaffAccessNotice`) | Criterio: ruta inexistente para el rol → 404; función existente sin permiso → aviso con quién puede concederlo |
| Sincronización (nuevo) | No existe | Definir solo cuando haya integración real: Conectado · Desconectado · Sincronizando · Requiere atención |

---

## 6. Lenguaje de interfaz (UX Writing)

`guia-de-tono.md` ya define: tú, español de Colombia, verbos concretos, estructura de mensaje (qué pasó → qué significa → qué hacer), prohibiciones. **No se reescribe: se amplía.**

### 6.1 Lo que falta [R]
1. **Glosario oficial** (hoy no existe). Borrador de decisiones a validar contigo:

| Concepto | Término propuesto | Evitar | Nota |
|---|---|---|---|
| Panel principal | Inicio | Dashboard, Panel | Ya es la etiqueta de nav |
| Dinero recibido de un cliente | Cobro | Pago (reservar «Pago» para lo que el negocio paga) | Hoy «Pagos» y «Cobros en línea» coexisten: **requiere revisar significado y uso real** antes de renombrar |
| Gasto del negocio | Gasto / Compra | | |
| Deuda de clientes | Cartera | | Mantener (término contable colombiano) |
| Stock | Inventario (general), Existencias (cantidades) | Stock | Nav usa «Catálogo» y «Existencias» |
| Herramienta externa | Integración | Plugin, conector, app | «Conectar herramienta» como verbo |
| Actividad de sistema | Historial | Log, bitácora | La guía usa «bitácora»: unificar |

   **No cambiar etiquetas existentes** hasta revisar uso real (instrucción del brief).
2. **Vocabulario de estados** con texto *y* icono (no solo color): Activo · Pendiente · En proceso · Completado · Cancelado · Vencido · Conectado · Desconectado · Requiere atención. Una tabla única en `Badge`, validada con pruebas de axe.
3. **Plantillas de mensaje** por situación (confirmación, error, advertencia, validación, vacío, carga, sin resultados, permisos, conexión, sincronización, irreversible) con ejemplo correcto/incorrecto cada una. Ya existen 6 en la guía; faltan sincronización, permisos, conexión y acción irreversible.
4. **Formularios:** etiqueta siempre visible, placeholder nunca como etiqueta, error con acción. `Field` ya lo soporta (251 usos): falta una prueba que lo exija.
5. **Verbos de botón:** lista cerrada («Crear cliente», «Guardar cambios», «Exportar datos», «Conectar herramienta», «Ver detalles») y prohibición de «Aceptar»/«OK» salvo diálogos informativos. [Y] Se puede automatizar con una regla de lint sobre el texto de `<Button>`; sin medir cuántos casos hay hoy: **línea base pendiente**.

### 6.2 Contradicción con la guía actual
La guía prohíbe «ecosistema 360» y «solución integral» en comunicación, y su sección 6 exige distinguir *disponible / prototipo / plan futuro*. Aplica a Integraciones: **cada herramienta del centro de integraciones llevará una de esas tres etiquetas**; prohibido listar marcas que no estén conectadas de verdad.

---

## 7. Arquitectura de navegación

### 7.1 Estado actual [H]
General (Inicio) → 8 categorías generadas por capacidades activas → Sistema (Funciones · Importar y exportar · Configuración, anclado). Ventas y Compras son plegables. Móvil: barra inferior (Inicio, Clientes, Obras, Más + botón Crear). Búsqueda con `Ctrl K` (command palette).

### 7.2 Recomendación
Conservar el modelo; **no rediseñarlo desde cero**. Cambios:

| Cambio | Motivo | Riesgo |
|---|---|---|
| **Expandido desde 1024 px** (hoy 1200 px) | Regla pedida; evita que la tablet horizontal (1024–1199) trabaje con iconos | Medio: sidebar de 219 px a 1024 px deja ~800 px de contenido; hay que probar tablas |
| **768–1023: riel compacto con etiquetas abreviadas** bajo el icono (≈ 72 px) en lugar de solo icono | Elimina la etiqueta recortada; targets ≥ 44 px | Bajo-medio; requiere acortar nombres de grupo |
| **< 768: barra inferior + hoja «Más»** (se conserva) | Funciona bien (72×54 y 56×56) | — |
| Umbral de tablet ajustado para cubrir 744 px (iPad mini) [Y: validar en dispositivo] | Hoy cae en diseño de teléfono | Medio |
| **Ocultar atajo `Ctrl K` en `pointer: coarse`** | Ruido en táctil | Bajo |
| **Integraciones** como entrada propia dentro de Sistema (centro con estado) | Hoy están dispersas (§2 #12) | Medio; solo con lo que existe: Wompi, factura electrónica, Google, WhatsApp, importar/exportar |
| Un solo componente de navegación contextual (pestañas/`Tabs` de módulo) | Evita que cada módulo invente la suya | Medio |

**Opción descartada:** conmutador de apps estilo Odoo — duplica el modelo de categorías y añade un nivel en móvil.
**Pendiente tuyo:** ¿«Integraciones» entra como ítem de primer nivel o dentro de «Configuración»? Recomiendo Sistema (anclado), sin ser categoría de negocio.

---

## 8. Responsive

| Viewport | Papel | Estado |
|---|---|---|
| 320 | Reflow (WCAG 1.4.10) | Cubierto en #141/#143 |
| 360 | Referencia móvil de diseño | Cubierto |
| 375 | Regresión | Medidas idénticas a 412 según #140; mantener como regresión barata |
| 412 | Móvil grande (Playwright Pixel 7) | Cubierto |
| 744 | iPad mini vertical | **No cubierto**: añadir como punto de control [R] |
| 768 / 820×1180 | Umbral y tablet vertical | Parcial |
| 1023 / 1024 | Umbral tablet↔escritorio | **Hoy el cambio ocurre a 1200**; ver §7 |
| 1180×820 | Tablet horizontal | Parcial |
| 1280 | Escritorio | Cubierto |

Reglas: sin scroll horizontal en tablas comunes (→ variante lista), targets 44 px en `pointer: coarse` para acciones primarias, 16 px en campos editables móviles (decisión 1b, **sin validar en iPhone real**), pruebas con nombres/importes largos (parcialmente en #143).

**Límite que debe constar en cada informe:** Chromium emulado ≠ dispositivo real. No cubre zoom de Safari/iOS, teclado virtual, safe-area, gestos ni rendimiento real. R2, R4 y R5 de la decisión P no se dan por cumplidos hasta probar en dispositivos.

---

## 9. Objetivos medibles y línea base

| Objetivo | Cómo medir | Línea base hoy (medida) |
|---|---|---|
| Menos variantes arbitrarias | `design:inventory` | 736 tamaños de texto fuera de token; 114 colores arbitrarios; 25 z-index numéricos |
| Reducir duplicación de tablas | `<table>` nativas vs. `DataTable` | 33 nativas / 31 archivos; 0 `DataTable` |
| API única de botón | llamadas `buttonVariants` vs. `<Button>` | 385 vs. 54 |
| Estados completos | `loading.tsx`, `error.tsx` por ruta | 37/72 · **0/72** |
| Historias de estado | nombres de historia | Cargando 4 · Error 9 · Sin permiso 5 · Sin conexión 0 · Guardando 0 |
| Catálogo sano | componentes sin uso / sin historia | 19 / 24 |
| Reflow 320 y sin recortes | `pnpm test:responsive` | 224/224 pasan en #143 (reporte; **no reejecutado**) |
| Targets 44 px | prueba de objetivos táctiles | 8 controles de cabecera/riel en 40–42 px (auditoría #140) |
| Navegación comprensible | **sin línea base**; propone tareas guiadas (p. ej. «encuentra dónde conectar WhatsApp») | No medido. [Y] Requiere prueba con personas reales |
| Textos coherentes | conteo de botones «Aceptar/OK/Enviar» | **No medido** (primer paso de Fase 3) |

No se publicará ningún porcentaje de mejora sin medir antes/después con estas mismas métricas.

---

## 10. Orden de implementación recomendado (de menor a mayor riesgo)

Cada paso = un PR pequeño, apilado o desde `main` tras decidir qué pasa con la pila #141→#143 (ver §11), con capturas antes/después y sin cambios de lógica de negocio.

| Orden | Fase del brief | Contenido | Riesgo | Por qué primero |
|---|---|---|---|---|
| 0 | — | Cerrar/ratificar la pila #141–#143 (decisión tuya; yo no fusiono) y publicar este blueprint como docs | Nulo | Evita construir sobre una base inestable |
| 1 | 3 | **Estados de ruta**: `ErrorState`, `error.tsx`/`global-error`/`not-found`, `loading.tsx` faltantes, historias Sin conexión/Guardando | Bajo | 0/72 es la brecha más alta y más barata |
| 2 | 3 | **Tokens** `text-2xs`/`text-ui` (sin migrar los 736) + regla que congela la deuda | Bajo | Habilita migración gradual |
| 3 | 3→4 | **`DataTable` con variante lista** (patrón Polaris adaptado) + 2 módulos piloto | Medio | Mayor brecha responsive medida |
| 4 | 2 | **Shell/tablet**: 1024 px expandido, riel con etiquetas, targets 44 px en táctil, buscador sin atajo en táctil | Medio | Toca todas las pantallas: va con la tabla ya resuelta |
| 5 | 3 | Decisiones 2/2b/2c y piloto `Button asChild` desde Server Component | Medio | Hoy es hipótesis no compilada |
| 6 | 4 | Dashboard (densidad, jerarquía) con los componentes ya estabilizados | Medio | |
| 7 | 6 | **Centro de Integraciones** con solo capacidades reales (estado, procedencia, permisos) | Medio | Requiere definir contrato de estados de conexión |
| 8 | 5 | Migración modular por módulos (Clientes, Ventas…) | Variable | Al final: reutiliza todo |
| 9 | 7 | Validación integral + pruebas en dispositivos reales | — | |

---

## 11. Decisiones que necesito de ti

1. **Pila de PR:** ¿el blueprint se publica como docs en una rama nueva desde `main` (independiente de #143), o esperamos a que #141–#143 se fusionen? No lo hago hasta que lo indiques.
2. **Breakpoint expandido** 1200 → **1024 px**: ¿aprobado? (afecta a toda la app).
3. **Tablet:** ¿riel con etiquetas abreviadas (mi recomendación) o riel de iconos con descripción al enfocar?
4. **44 px táctil:** ¿solo acciones primarias o también cabecera?
5. **Glosario:** ¿validas las propuestas de §6.1 (especialmente Cobro/Pago e Historial vs. bitácora)? No renombro nada sin tu aprobación y revisión de uso real.
6. **Integraciones:** ¿entrada en «Sistema» (recomendado) o dentro de «Configuración»?
7. **Densidad «cómoda»:** recomiendo no crearla. ¿De acuerdo?
8. **Referencia 375 vs. 360:** ¿375 queda como regresión y 360 como diseño?

## 12. Límites de este análisis

- Cifras de código: heurísticas de `scripts/design-inventory.mjs` (texto, no AST). Re-medidas hoy en la rama actual.
- No ejecuté `pnpm verify`, `test:responsive` ni e2e: los números de pruebas son del reporte.
- Benchmark: solo documentación pública vía buscador; sin acceso interno a los productos; Siigo y Holded sin fuente primaria; fuentes secundarias marcadas con confianza baja.
- No revisé `nexus-thrive-web` ni los módulos uno por uno a nivel de pantalla; el diagnóstico de módulos viene de registro, inventario y auditorías previas.
- La afirmación «nadie muestra procedencia del dato como patrón central» es hipótesis por cobertura limitada.
- Sin pruebas con usuarios: «navegación comprensible» no tiene medición todavía.
