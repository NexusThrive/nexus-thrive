# 02 · Auditoría de la experiencia actual

[← Índice](README.md) · Fase de auditoría. Solo lectura: no se cambió ningún archivo de la aplicación.

**Base medida:** rama `chore/HU-corregir-p1-responsive-01` (`ef7c749`), el 2026-11-01. Incluye los cambios de #141, #142 y #143 (sin fusionar).
**Método:** conteo de texto con expresiones regulares sobre `app/`, `components/` y `lib/` (excluye historias y pruebas), más lectura directa de los archivos citados. Es **heurístico**: sirve para ver tendencias y brechas, no para sancionar un archivo concreto.

## 1. Resumen

**Lo que está bien construido (hechos)**

| Área | Evidencia |
|---|---|
| Patrones de interacción consolidados | 0 `window.confirm/alert`; 0 modales hechos a mano; `ResponsiveSheet` 31 usos; `Field` 251; `ConfirmDialog` 13; `EmptyState` 44; `Alert` 47; `useToast` 64 |
| Navegación con una sola fuente | `lib/core/capabilities/registry.ts` genera menú, «Funciones» y encabezados (`routeCategory`) con vocabulario por rubro |
| Honestidad de estado ya modelada | Cada capacidad declara `READY`, `BETA` o `PLANNED` (16 / 4 / 2: **22 capacidades**) |
| Permisos en el servidor | `can()` con matriz única; 251 llamadas o contextos de permiso en las pantallas del negocio |
| Documentación y calidad | `DESIGN.md`, `SYSTEM-DESIGN.md`, inventario, decisiones, checklist, Playwright + axe, infraestructura responsive |
| Notificaciones con descarte persistente | `DismissedNotification` se guarda por persona (`notifications-db.ts`) |

**Lo que está duplicado o inconsistente (hechos medidos)**

| # | Hallazgo | Medición |
|---|---|---|
| 1 | Sin pantalla de error de ruta | 0 `error.tsx` en 72 páginas (0 en las 38 del negocio); solo 1 `not-found` |
| 2 | Estados de carga incompletos | 37 de 72 páginas con `loading.tsx`; sin él en el negocio: `checkin`, `presence`, `tickets` |
| 3 | Sin patrón de tabla | 30 `<table>` manuales en el negocio (33 en toda la app); `DataTable` 0 usos |
| 4 | API doble de botón | 286 `<button>` nativos y 21 `<Button>` en el negocio; `projects` concentra 19 de esos 21 |
| 5 | Escala tipográfica | 301 usos `text-[Npx]` solo en el negocio (736 en toda la app) |
| 6 | Colores sueltos | 35 hex en el negocio: `billing` 16, `finance` 11, `settings` 6 |
| 7 | «Sin permiso» con dos criterios | `notFound()` en 28 páginas (incluye contextos inexistentes) y aviso en página (`Alert tone="info"` o `StaffAccessNotice`) en **13**; textos leídos en `google`, `cobros`, `factura-electronica` y `data`, escritos a mano |
| 8 | Tres nombres por capacidad | Ver `06` §3 |
| 9 | Módulo en plan visible como página | `orders` renderiza `ModulePlaceholder` (capacidad `PLANNED`) |
| 10 | Redirección como «módulo» | `payments` solo redirige a `/finance?tab=cobros`; el menú dice «Pagos» |
| 11 | Descripción de WhatsApp | La página abre la conversación (`wa.me`); su propio comentario dice que la API de WhatsApp Business «sigue en el roadmap» |

## 2. Hallazgos por área del alcance

### 2.1 Design System y fundamentos
- **Hecho:** tokens en `packages/brand/css/tokens.css` (254 líneas): tipografías Montserrat/Inter/JetBrains Mono; escala `xs`–`5xl`; radios 0–8 px; espaciado de 4 a 80; z-index con nombres; movimiento `--d1`–`--d4` y cuatro curvas; densidad por `--control-h` (40/34) y `--row-h` 56.
- **Hecho:** falta `text-2xs` (11) y `text-ui` (13) aunque 13 px es el tamaño dominante (308 usos).
- **Hecho:** 25 `z-index` numéricos en 14 archivos (la regla los prohíbe); hay 4 en el negocio.
- Ver `03`.

### 2.2 Navegación y estructura
- **Hecho:** 10 grupos en el menú (General, 8 categorías, Sistema); «Ventas y cobros» y «Compras y gastos» son plegables; «Sistema» (Funciones, Importar y exportar, Configuración) va anclado.
- **Hecho:** la barra lateral y la barra superior cambian de modo en **768** y **1200 px**.
- **Hecho (auditoría #140):** riel de iconos en tablet, etiqueta de grupo recortada a 10 px, buscador truncado con `Ctrl K`.
- Ver `04` §2.

### 2.3 Dashboard
- **Hecho:** el Inicio compone cinco `KpiCard` (Ingresos, Gastos, Balance neto, Por cobrar, Clientes activos), un gráfico de ingresos, cuatro `StatTile` de membresías (solo si el módulo está activo), actividad reciente y la lista «Primeros pasos». Es personalizable (`CustomizableDashboard`, catálogo de 6 gráficos, anchos de 96 columnas).
- Ver `05`.

### 2.4 Componentes, patrones y plantillas
- **Hecho:** 138 componentes compartidos; 24 sin historia; 19 sin uso; 6 plantillas.
- **Hecho:** formularios y diálogos consolidados; tablas no.
- Ver `11`.

### 2.5 Lenguaje
- **Hecho:** guía de tono vigente. Literales de botón en `app/` y `components/`: «Aceptar» 0, «OK» 2, «Enviar» 2, «Guardar» 8, «Cancelar» 8, «Crear» 11. La disciplina de verbos es **buena**; el problema no es el volumen sino la ausencia de glosario y de nombres oficiales.
- **Hecho:** estados con vocabulario disperso: «Activo/Activa», «Pendiente», «Vencido/Vencida», «Pagado/Pagada», «Anulado/Anulada», «Suspendido» conviven con género distinto; «En proceso», «Completado», «Conectado» (1) y «Requiere atención» (0) casi no aparecen como literal.
- Ver `06`.

### 2.6 Responsive
- **Hecho (#140–#143):** P1 corregidos; falta táctil, tablet y 744 px.
- Ver `07`.

### 2.7 Accesibilidad
- **Hecho:** 348 `aria-label`, 93 `role="alert|status"`, 47 `sr-only`, 38 referencias a movimiento reducido, 0 `<img>` sin `alt` (heurística).
- **Hecho:** 14 usos de `outline-none` sin `focus-visible` en la misma línea; 205 atributos `title`.
- Ver `08`.

### 2.8 Roles y permisos
- **Hecho:** dos modelos distintos: negocio (`OWNER`, `ADMIN`, `RECEPTION`, `ADVISOR`, `STAFF`, `SUPERADMIN`) y equipo Nexus (roles de sistema del Operations Center). Las «acciones rápidas» ya se filtran por rol (`quick-create.ts`).
- **Hecho:** el menú se arma por módulos activos, **no** por rol; el acceso por rol se decide página a página.
- Ver `09`.

### 2.9 Búsqueda, notificaciones y actividad
- **Hecho:** paleta (`cmdk`) con resultados, «Ir a», «Funciones apagadas» y «Acciones»; campana calculada con datos del día y descarte persistente; «Actividad reciente» en el Inicio.
- Ver `04` §5–§6.

### 2.10 Integraciones
- **Hecho:** pantallas propias para Google, WhatsApp, Cobros en línea, Factura electrónica e Importar y exportar; adaptadores `sandbox` y `wompi` de pagos; puerto de factura electrónica; API v1, webhooks y MCP.
- Ver `10`.

## 3. Puntuación de coherencia por módulo (DR-31)

Lectura: **presencia de patrones**, no calidad. Un «0» puede ser legítimo (un módulo sin tablas). Sirve para decidir el orden de las oleadas y medir el avance. Módulos = carpetas de `app/[tenant]/(app)/`.

| Módulo (carpeta) | Páginas | `loading` | `error` | `PageHeader` | `EmptyState` | `Alert` | Toast | Hojas/diálogos | Confirmar | `<table>` manual | `DataTable` | `<button>` nativo | `<Button>` | Texto `px` suelto | Hex | `can()`/contexto |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| (raíz) | 1 | 1/1 | 0/1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 |
| billing | 2 | 1/2 | 0/2 | 1 | 1 | 0 | 3 | 3 | 1 | 1 | 0 | 14 | 0 | 16 | 16 | 25 |
| bookings | 1 | 1/1 | 0/1 | 1 | 0 | 0 | 2 | 2 | 0 | 0 | 0 | 17 | 0 | 19 | 1 | 0 |
| cartera | 1 | 1/1 | 0/1 | 1 | 1 | 1 | 1 | 1 | 0 | 1 | 0 | 1 | 0 | 3 | 0 | 4 |
| catalog | 2 | 2/2 | 0/2 | 2 | 0 | 0 | 0 | 0 | 1 | 3 | 0 | 24 | 0 | 20 | 0 | 16 |
| checkin | 1 | 0/1 | 0/1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 3 | 0 | 1 | 0 | 5 |
| cobros | 1 | 1/1 | 0/1 | 1 | 1 | 3 | 1 | 4 | 0 | 1 | 0 | 8 | 0 | 9 | 0 | 3 |
| contabilidad | 1 | 1/1 | 0/1 | 1 | 7 | 3 | 1 | 3 | 0 | 3 | 0 | 10 | 0 | 14 | 0 | 5 |
| crecimiento | 1 | 1/1 | 0/1 | 1 | 3 | 3 | 1 | 1 | 0 | 1 | 0 | 6 | 0 | 11 | 0 | 2 |
| crm | 3 | 2/3 | 0/3 | 1 | 1 | 0 | 2 | 1 | 2 | 3 | 0 | 22 | 0 | 24 | 0 | 14 |
| data | 1 | 1/1 | 0/1 | 1 | 0 | 3 | 1 | 0 | 0 | 1 | 0 | 4 | 0 | 6 | 0 | 3 |
| factura-electronica | 1 | 1/1 | 0/1 | 1 | 1 | 2 | 1 | 1 | 0 | 1 | 0 | 5 | 0 | 6 | 0 | 2 |
| finance | 1 | 1/1 | 0/1 | 1 | 1 | 1 | 3 | 4 | 0 | 0 | 0 | 24 | 0 | 29 | 11 | 20 |
| functions | 1 | 1/1 | 0/1 | 1 | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 7 | 0 | 5 |
| google | 1 | 1/1 | 0/1 | 1 | 0 | 2 | 1 | 1 | 0 | 1 | 0 | 4 | 0 | 8 | 0 | 2 |
| inventory | 1 | 1/1 | 0/1 | 1 | 1 | 0 | 2 | 2 | 0 | 0 | 0 | 11 | 0 | 11 | 0 | 17 |
| memberships | 1 | 1/1 | 0/1 | 1 | 0 | 0 | 1 | 4 | 1 | 1 | 0 | 13 | 0 | 7 | 0 | 6 |
| orders | 1 | 1/1 | 0/1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| payments | 1 | 1/1 | 0/1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| pedidos-tienda | 1 | 1/1 | 0/1 | 1 | 1 | 2 | 1 | 0 | 0 | 0 | 0 | 2 | 0 | 5 | 0 | 2 |
| pos | 2 | 1/2 | 0/2 | 1 | 0 | 4 | 3 | 3 | 0 | 0 | 0 | 11 | 0 | 13 | 0 | 17 |
| presence | 1 | 0/1 | 0/1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| projects | 2 | 2/2 | 0/2 | 1 | 8 | 0 | 4 | 0 | 2 | 6 | 0 | 53 | 19 | 8 | 0 | 4 |
| purchases | 1 | 1/1 | 0/1 | 3 | 2 | 5 | 3 | 3 | 1 | 1 | 0 | 17 | 0 | 14 | 0 | 4 |
| quotes | 2 | 2/2 | 0/2 | 3 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 0 | 0 | 0 | 4 |
| settings | 1 | 1/1 | 0/1 | 1 | 0 | 2 | 6 | 5 | 0 | 0 | 0 | 8 | 2 | 25 | 6 | 46 |
| sitio | 1 | 1/1 | 0/1 | 1 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 14 | 1 | 2 |
| stock | 1 | 1/1 | 0/1 | 2 | 4 | 2 | 5 | 4 | 1 | 3 | 0 | 12 | 0 | 15 | 0 | 4 |
| taxes | 1 | 1/1 | 0/1 | 1 | 2 | 3 | 1 | 2 | 0 | 1 | 0 | 6 | 0 | 6 | 0 | 2 |
| tickets | 1 | 0/1 | 0/1 | 1 | 0 | 0 | 2 | 2 | 1 | 1 | 0 | 9 | 0 | 9 | 0 | 29 |
| whatsapp | 1 | 1/1 | 0/1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |

**Cómo leerla**
- `loading` / `error`: archivos presentes frente a páginas del módulo.
- `<table>` manual y `DataTable`: la migración de DR-08 busca llevar la primera columna a 0 en los pilotos.
- `Texto px suelto` y `Hex`: deuda de DR-02 y DR-05.
- `can()`/contexto: llamadas que comprueban permiso o contexto de página; los módulos con 0 (`payments`, `orders`) son redirección o marcador de posición.

**Lecturas principales (hechos)**
1. `projects` es el módulo más grande (33 archivos) y el único que usa `<Button>` de forma amplia (19): es el candidato natural a piloto de DR-07.
2. `finance`, `settings`, `crm`, `catalog`, `bookings` y `billing` tienen los mayores recuentos de texto `px` suelto (133 de los 301 del negocio).
3. `billing` y `finance` concentran los hex (27 de los 35 del negocio; con `settings`, 33): objetivo de DR-05.
4. `checkin`, `presence` y `tickets` no tienen `loading.tsx`.
5. Ningún módulo usa `DataTable`; `projects`, `crm`, `catalog`, `contabilidad` y `stock` son los que más tablas manuales tienen.
6. `bookings`, `memberships`, `tickets`, `google`, `whatsapp`, `pos`, `quotes` y `settings` no usan `EmptyState` (**H**: pueden resolver el vacío de otra forma; no se verificó pantalla por pantalla).

## 4. Qué se concluye

1. **El sistema ya existe**; el trabajo es **adoptar y cerrar brechas**, no inventar.
2. Las brechas se agrupan en cuatro: **estados de ruta**, **tabla/lista**, **escala tipográfica y color** y **lenguaje/nombres**.
3. La experiencia es coherente en *interacción* (formularios, diálogos, confirmaciones) y menos en *presentación de datos* (tablas, números, estados).
4. Hay material honesto ya modelado (estado de capacidad, comentarios que declaran el roadmap) que el sistema debe **mostrar**, no reinventar (DR-33).

## 5. Correcciones a documentos anteriores de esta serie

| Afirmación previa | Corrección |
|---|---|
| «24 capacidades» | Son **22** en el registro (16 `READY`, 4 `BETA`, 2 `PLANNED`) |
| «No hay bandeja persistente de notificaciones» | Las notificaciones **se calculan** al abrirse, pero **el descarte sí se guarda** (`DismissedNotification`); lo que falta es historial |
| «Existe una capa Automation/Insights» | No: son dominios de experiencia sobre piezas existentes (decisión aprobada de no crear capas) |

## 6. Lo que no se pudo verificar

| Limitación | Efecto |
|---|---|
| No se recorrió la aplicación en ejecución pantalla por pantalla | Los ceros de `EmptyState` o `Alert` pueden ser falsos negativos |
| Conteos por expresión regular | Texto fuera de JSX (constantes, i18n) no se contó |
| No se midió contraste renderizado | R4 sigue parcial |
| No se midió el uso real por dispositivo ni por rol | H-01 sin evidencia |
| No se re-ejecutaron `pnpm verify` ni las pruebas | Los resultados de pruebas son los del reporte de #143 |
