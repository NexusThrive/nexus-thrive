# 11 · Componentes, patrones y plantillas (escala de siete niveles)

[← Índice](README.md) · Decisiones citadas: DR-07, DR-08, DR-09, DR-11, DR-12, DR-17, DR-37, DR-44, PD-01, PD-02, PD-07. Principios: **D2** consistencia, **P4** el mismo gesto para lo mismo, **D5** acciones con propósito.

**Regla de reutilización (la primera pregunta de cualquier cambio):** antes de crear un componente, ¿existe una primitiva, un componente, un patrón o una plantilla que resuelva el problema? Evitar tanto la duplicación como la abstracción prematura.

## 1. La escala de siete niveles frente a lo que existe

Inventario real (`components/`): átomos 34 · moléculas 52 · organismos 46 · plantillas 6 · laboratorio 1.

| Nivel | Qué es | Lo que existe hoy (hechos) | Brecha | Acción en esta etapa |
|---|---|---|---|---|
| **1 · Tokens** | Variables globales | `packages/brand/css/tokens.css` | `text-2xs`, `text-ui`, `--doc-*` | Ver `03` |
| **2 · Primitivas** | Elementos fundamentales | `Button`, `Input`, `Select`, `Textarea`, `Checkbox`, `Switch`, `Badge`, `Avatar`, `Label`, `Skeleton`, `Kbd`, `Tooltip`, `ProgressBar`, `Chip`, `Sparkline` | Radio y Separator no existen como átomos; `Checkbox`, `Avatar` y `Label` sin uso | No crear Radio/Separator sin dos usos (DR-11); adoptar los tres existentes (DR-12) |
| **3 · Compuestos** | Piezas reutilizables | `Field`, `Alert`, `EmptyState`, `LoadingState`, `Breadcrumbs`, `PageHeader`, `Pagination`, `SearchField`/`SearchInput`, `FilterSelect`, `SegmentedControl`, `TabNav`, `SectionNav`, `DropdownMenu`, `Popover`, `ContextHelp`, `KpiCard`, `StatTile`, `Toast`, `CommandPalette`, `ResponsiveSheet`, `ConfirmDialog`, `NotificationCenter` | Falta `ErrorState` (de ruta), `FilterBar`, `DateRange`; `NotificationItem` y `ConnectionCard` esperan dos usos | Crear `ErrorState` y `FilterBar`; el resto, solo con evidencia |
| **4 · Patrones** | Soluciones a problemas recurrentes | Formulario en diálogo/panel (`FormDialog`/`FormDrawer`), confirmación destructiva, estado vacío, creación rápida | **Tabla/lista adaptable, importación/exportación, conexión de integración, centro de actividad, configuración de módulos, gestión de permisos, selección de periodo** | Documentar cada uno con ficha (§10) |
| **5 · Templates** | Estructuras de página | `TenantShell`, `AuthLayout`, `OnboardingSplit`, `PublicLayout`, `ModulePlaceholder` (+ `OnboardingLayout` sin uso) | Listado, Detalle, Formulario, Configuración, Reportes, Integraciones, Centro de actividad | Ver §8 |
| **6 · Experiencias** | Flujos que cruzan páginas | 24 historias de «Páginas» | Sin recorrido de estados por flujo | Ver §9 |
| **7 · Módulos** | Aplicación al contexto | 22 capacidades | Cada módulo arma su tabla y su filtro | Oleadas (`12`) |

## 2. Cómo decidir (árbol de reutilización)

1. **¿Ya existe?** Se busca en Storybook y en `inventario-patrones.md`. Si existe, se usa.
2. **¿Una variante lo cubre?** Se añade una variante con historia; no un componente nuevo.
3. **¿Hay dos usos reales que lo piden?** Solo entonces nace un componente (DR-11), con (a) los dos usos, (b) historia con todos los estados, (c) prueba si tiene interacción, (d) fila en `DESIGN.md`.
4. **¿Es de un solo módulo?** Vive en ese módulo (`_components/`), no en el sistema.
5. **¿Lo piden varios módulos?** Se promueve al sistema, con historia y ficha.

**Porqué:** D5 (si se quita, ¿alguien lo echaría de menos?) y la experiencia de 19 componentes construidos y nunca conectados.

## 3. Botón e Input (DR-07; PD-01, PD-02)

### 3.1 Botón
- **Hecho:** `Button` ya tiene la forma del modelo shadcn (variantes con `cva`, `asChild`). La aplicación usa de forma dominante `buttonVariants` sobre `<button>`/`<Link>`: 385 llamadas reales frente a 54 usos de `<Button>`.
- **Aprobado (A):** `<Button>` como API preferida; `buttonVariants` interno; sin cambiar variantes durante la transición.
- **Porqué:** D2/P4. Dos formas de hacer lo mismo generan divergencias de foco, estados y accesibilidad.
- **Pendiente (PD-01):** tamaño por defecto (`sm` frente a `default`). Existe una comparación visual (decisiones §2.5); **no se decide sin evidencia táctil adicional**. Impacto cruzado: con DR-15, los controles táctiles miden 44 px de todos modos.
- **Hipótesis a probar con un piloto:** `Button asChild` funciona desde Server Components (no se compiló).
- **Estados obligatorios del botón:** normal, hover, foco visible, activo, deshabilitado (con motivo cuando importa), cargando/guardando (sin doble envío), y destructivo.
- **Uso por verbo** del glosario (`06` §5): una acción principal por pantalla.

### 3.2 Input
- **Estructura aprobada (A):** *primitivos* (Input, Select, Textarea, Checkbox, Switch) · *Field* (etiqueta, ayuda, error, obligatorio) · *especializados* (Phone, Money, Usd, Search…).
- **Pendiente (PD-02):** consolidar `MoneyInput`/`UsdInput` y `SearchField`/`SearchInput`. Sus contratos fueron investigados y **no son fusiones directas**.
- **Regla (DR-06):** campos editables a 16 px en móvil (sin validar en dispositivo real, H-06).
- **Regla:** todo control tiene etiqueta visible; `Field` es el único cableado de etiqueta/ayuda/error (251 usos hoy).

## 4. Tabla y lista adaptable (DR-08)

### 4.1 Por qué
**Hecho:** 30 `<table>` manuales en el negocio (33 en toda la app), `DataTable` con 0 usos y solo 46 líneas, sin variante móvil, con `min-w-full` (riesgo de scroll horizontal). **Es la mayor brecha responsive medida.**
**Referencia verificada (pública):** Shopify Polaris renderiza lista en pantallas pequeñas y tabla en grandes (variante `Auto`) y asigna a cada columna un rol en la vista de lista. Nexus **adapta el principio** con sus propios roles de estado y sus permisos; no copia el componente.

### 4.2 Anatomía

| Elemento | Regla | Principio |
|---|---|---|
| Encabezado de página | `PageHeader`: título, descripción corta, acción principal | D1 |
| Barra de herramientas | Búsqueda, filtros, selector de periodo (si aplica), acciones masivas | P4 |
| **Columnas con rol** | `principal` (identifica el registro), `secundaria` (apoyo), `estado` (badge con texto+icono), `cifra` (alineada, tabular), `acción` (menú) | D8: en lista, cada rol decide dónde va |
| Fila | Clic/Enter abre el detalle; el área clicable no se pisa con acciones internas | D7 |
| Estados | Cargando (esqueleto con forma), vacío (cómo llegar al primer dato), sin resultados (con salida), error (reintento), sin permiso | DR-09 |
| Paginación | Páginas o «Cargar más»; límite en el servidor | Regla del repo |
| Selección múltiple | Barra de acciones visible mientras haya selección; **no se oculta en móvil** (se reubica) | No esconder acciones esenciales |
| Acciones de fila | Menú «⋯»; las destructivas piden confirmación con el verbo exacto | P5 |

### 4.3 Comportamiento responsive

| Ancho | Presentación |
|---|---|
| < 768 | **Lista**: cada fila es una tarjeta compacta: `principal` arriba, `secundaria` y `estado` debajo, `cifra` alineada a la derecha, `acción` como menú de 44 px |
| 768–1023 | Tabla si caben las columnas esenciales; si no, lista |
| ≥ 1024 | Tabla completa; densidad compacta opcional |

### 4.4 Accesibilidad
Tabla real con `caption`, `th scope`; la vista de lista conserva el orden y los nombres; encabezados ordenables con `aria-sort`; el cambio de modo no pierde el foco ni el estado.

### 4.5 Migración
1. Especificar el contrato de columnas (`principal`, `secundaria`, `estado`, `cifra`, `acción`) — punto de sincronización antes de implementar.
2. Dos módulos piloto de bajo riesgo y alta repetición (propuesta en `12`).
3. Medir antes y después (`<table>` manuales, scroll horizontal, 44 px).
4. Solo entonces migrar el resto por oleadas.

## 5. Formularios (DR-44)

### 5.1 Anatomía
| Elemento | Regla |
|---|---|
| Sección | Agrupa campos relacionados con título; no más de lo necesario (D6) |
| Campo | `Field`: etiqueta visible, ayuda (`hint`), obligatorio con «*» y texto para lectores, error accionable |
| Acciones | Principal a la derecha (escritorio) / al pie (móvil): «Guardar cambios» o «Crear {objeto}»; «Cancelar» cierra sin guardar |
| Cambios sin guardar | Los paneles preguntan antes de cerrar con datos cambiados (`ResponsiveSheet`, `data-save`); no se reimplementa |
| Validación | Al salir del campo y al enviar; resumen con foco al primer inválido; lo escrito no se borra |
| Carga y guardado | Botón en estado «Guardando…»; sin doble envío; resultado con `useToast` |

### 5.2 Superficie según la tarea (existe `interaction-patterns.md`)
| Tarea | Superficie |
|---|---|
| Confirmar | Diálogo pequeño (440 px) |
| Formulario corto | Diálogo (520 px) / hoja inferior en móvil |
| Registro con contexto | Panel lateral (440–560 px) |
| Edición compleja | Página |
| Cambio puntual | En línea |

Todas se componen con `ResponsiveSheet`; **no** se usa Radix Dialog directo ni modales a mano.

### 5.3 Brechas
- 174 `placeholder` frente a 173 etiquetas: revisar caso por caso (DR-44).
- 14 `outline-none` sin foco visible en la misma línea (DR-42).
- Patrón de «campo editable en línea» sin ficha.

## 6. Catálogo: componentes sin uso (DR-12; PD-07)

Clasificación **aprobada (A)** — nada se elimina:

| Acción | Piezas |
|---|---|
| **Conservar y adoptar (5)** | `avatar`, `checkbox`, `label`, `api-keys-panel`, `data-table` |
| **Consolidar (10)** | Pasos: `boot-steps`, `step-indicator` · «estado con N»: `loading-toast`, `dynamic-status`, `focus-panel` · carga de archivos: `upload-progress` · agenda: `month-calendar`, `week-strip`, `agenda-timeline` · plantilla: `onboarding-layout` |
| **Retirar a Laboratorio (4)** | `indeterminate-bar`, `pulsing-slashes`, `reveal-row`, `module-intro` |

**Condiciones aprobadas:** los cuatro pasan primero a *Laboratorio* de Storybook; no se elimina nada; «consolidar» = contenido a un único componente por familia, sin pérdida.
**Pendiente (PD-07):** confirmar los cuatro de Laboratorio con una última comprobación de usos.
**Conservar (A):** `network-banner` y `staff-access-notice`; faltan sus historias de estado.

## 7. Superficies y estados

### 7.1 Estados (DR-09): contrato por componente y por página

| Estado | Componente | Regla |
|---|---|---|
| Cargando | `SkeletonRows`, `PageSkeleton`, `LoadingState` | Con la forma del contenido; nunca «Cargando…» suelto |
| Vacío | `EmptyState` | Cómo llegar al primer dato; una acción |
| Error de carga | **`ErrorState` (nuevo, dos usos reales: ruta y bloque)** | Qué pasó + reintento + salida |
| Error de acción | `Alert` + foco | Texto + icono |
| Sin permiso | Ver `09` §4 | Criterio único |
| Sin conexión | `NetworkBanner` | Banner persistente |
| Guardando / guardado | Botón con estado + `useToast` | Sin doble envío |
| Deshabilitado | `disabled` + motivo cuando importa | Nunca silencioso |
| Parcialmente completado | `WelcomeChecklist`, `ProgressBar` | Progreso real, no decorativo (D4) |

### 7.2 Capas
Solo los 12 tokens `--z-*`. Popover siempre sobre el modal que lo contiene; toast por encima de banners.

## 8. Plantillas (nivel 5)

| Plantilla | Para qué | Estructura | Prioridad | Estado |
|---|---|---|---|---|
| **Listado** | Colecciones con filtros | `PageHeader` · barra · tabla/lista · paginación · estados | **1** | No existe como plantilla |
| **Configuración** | Ajustes con secciones | `PageHeader` · navegación de secciones (`SectionNav`) · `SettingsSection/Row` | **2** | Existen piezas (`settings-section`, `settings-row`) |
| **Detalle** | Ficha de un registro | Cabecera con acciones · secciones · actividad | 3 | No existe como plantilla |
| **Formulario** | Crear/editar en página | Secciones · acciones · cambios sin guardar | 4 | Existen `FormDialog/Drawer`; falta plantilla de página |
| **Dashboard** | Inicio por widgets | Ver `05` | 5 | Existe (`CustomizableDashboard`) |
| **Reportes** | Series y exportación | Periodo · gráficos · tabla · exportar | 6 | No existe |
| **Integraciones** | Estado de herramientas | Fichas «Conexión» | 7 | No existe |
| **Centro de actividad** | Notificaciones e historial | Pestañas · elementos · filtros | 8 | No existe |

Cada plantilla declara: **qué dispositivo prioriza**, sus **estados** y sus **permisos**. «Gestión operativa» se excluye de esta etapa (era del alcance retirado).

## 9. Experiencias completas (nivel 6) — solo generales

| Experiencia | Páginas que cruza | Existe hoy |
|---|---|---|
| Registrar un cliente | Listado · formulario/panel · ficha | Sí, con estados parciales |
| Crear una venta / registrar un cobro | POS o Ventas · cobro · recibo | Sí |
| Emitir un documento | Facturación · documento · envío | Sí (factura electrónica en prueba) |
| Importar datos | Importar · mapeo · revisión · resultado | Parcial (H-04) |
| Conectar una herramienta existente | Integraciones · ficha · pantalla de trabajo | Disperso (`10`) |
| Configurar un negocio | Onboarding · funciones · configuración | Sí |

*Quedan fuera las experiencias propias de un rubro* (por ejemplo, flujos operativos de restaurante, gimnasio o turismo).

## 10. Ficha de un patrón (formato obligatorio)

Todo patrón de nivel 4 se documenta en Storybook (grupo «Patrones») y en `DESIGN.md` con:

1. **Necesidad** y a qué principio responde (D#, P#).
2. **Meta** de la persona.
3. **Solución** (anatomía, componentes que reutiliza).
4. **Estados** completos.
5. **Responsive** por viewport.
6. **Accesibilidad** (teclado, foco, lector).
7. **Permisos**.
8. **Lenguaje** (términos del glosario y mensajes).
9. **Qué no hace** (límites).
10. **Cómo se prueba** (historia y prueba).

## 11. Criterios de aceptación

| Criterio | Medida |
|---|---|
| Un patrón de tabla/lista aprobado y usado | `DataTable` con ≥ 2 módulos piloto; 0 `<table>` manuales en ellos |
| `ErrorState` y `FilterBar` con historias y dos usos reales | Historias + enlaces a usos |
| Catálogo sin huérfanos tras revisión | Conservar/consolidar/retirar ejecutado según clasificación aprobada |
| Cada patrón con ficha | 10 elementos presentes |
| Cada plantilla con dispositivo prioritario y estados | Tabla de §8 completa |

## 12. Límites
- No se auditó pantalla por pantalla qué componentes usa cada módulo; los conteos son textuales.
- Las especificaciones de §4 y §8 son diseño: ninguna se implementó ni se probó.
- La referencia de Polaris se tomó de documentación pública; no se examinó su interfaz.
