# 04 · Arquitectura de información, navegación, búsqueda y actividad

[← Índice](README.md) · Decisiones citadas: DR-13 a DR-23, DR-32, DR-40, DR-41. Estado de cada una en `01`.

## 1. Principios de arquitectura de información

| # | Principio | Porqué | Se verifica con |
|---|---|---|---|
| IA-1 | **Una sola fuente de navegación**: el registro de capacidades. Ningún módulo define su menú | D2, P4 (el mismo gesto para lo mismo) | Búsqueda de rutas de menú fuera del registro |
| IA-2 | **Se agrupa por el trabajo que resuelve**, no por el orden en que se activó un módulo | D1: la persona busca «cobrar», no «módulo 14» | Etiquetas de grupo = verbos o áreas de trabajo |
| IA-3 | **El menú solo muestra lo que está activo** y lo apagado se explica donde se activa | P3: datos reales o nada | Un módulo apagado no tiene ítem ni acción (`modulesForRoute`) |
| IA-4 | **El vocabulario del rubro cambia el nombre, no la estructura** | P1, D3 | `VerticalTerms` solo renombra; no cambia campos ni estados |
| IA-5 | **Nada importante queda escondido sin alternativa de acceso** | D7, brief §6 | Todo ítem del menú es alcanzable desde la paleta de búsqueda |
| IA-6 | **El menú crece por categorías, no por longitud**: cuando un grupo supera lo razonable se subdivide o se pliega | D1, D6 | Máximo de ítems visibles por grupo (guía: 7) |

## 2. Estructura actual (hechos)

Fuente: `lib/core/capabilities/registry.ts` y `lib/experience/navigation/tenant-nav.ts`.

| Grupo del menú | Capacidades que aportan ítems (etiqueta en el menú) | Estado declarado |
|---|---|---|
| **General** | Inicio | `READY` |
| **Clientes y agenda** | Clientes (según rubro: Socios, Pacientes…), Reservas (según rubro: Clases, Citas…), Taquilla, Membresías, Control de acceso | `READY`; Membresías especializada |
| **Productos y pedidos** | Catálogo, Existencias, Pedidos | Pedidos `PLANNED` |
| **Obras y proyectos** | Proyectos/Obras, Cotizaciones, Catálogo APU | Cotizaciones `PLANNED`; Construcción especializada |
| **Ventas y cobros** (plegable) | Pagos, Facturación, Punto de venta, Cobros en línea, Factura electrónica | Cobros en línea y Factura electrónica `BETA` |
| **Compras y gastos** (plegable) | Gastos, Compras | Compras `BETA` |
| **Finanzas y contabilidad** | Finanzas, Cartera, Contabilidad, Impuestos y numeración | Contabilidad `BETA` |
| **Presencia en línea** | Mi sitio web, Pedidos de la tienda, Ficha de Google, Campañas y reseñas | Ficha de Google `BETA` |
| **Canales** | WhatsApp | `READY` |
| **Sistema** (anclado) | Funciones, Importar y exportar, Configuración | — |

*Las filas con rubro (Socios, Obras…) vienen de `VERTICAL_RECIPES`/`lexicon.ts`: 18 verticales definidas, 7 ofrecidas al registrarse.*

### 2.1 Qué funciona bien (hechos)
- Agrupación por trabajo («Ventas y cobros», «Compras y gastos»), no por módulo técnico.
- Grupos plegables para lo que más crece; grupo anclado para configuración.
- Un solo origen para menú, «Funciones» y encabezados (`routeCategory`): menú y página dicen lo mismo.
- Acciones rápidas ya filtradas por rol (`quick-create.ts`).

### 2.2 Qué confunde (hechos y hipótesis)

| # | Observación | Tipo | Efecto | Resolución |
|---|---|---|---|---|
| N1 | «Pagos» abre `/finance?tab=cobros` (y existe una ruta `/payments` que solo redirige) | Hecho | Se llama «Pago» a lo que el glosario aprobado llama «Cobro» (DR-25) | Glosario `06` (PD-03). **No se renombra aún** |
| N2 | «Facturación» y «Factura electrónica» conviven en el mismo grupo | Hecho | Dos nombres cercanos para cosas distintas (documentos de cobro frente a documento fiscal electrónico) | Glosario; no confundir |
| N3 | «Pedidos» (en plan) y «Pedidos de la tienda» | Hecho | Nombre repetido con sentido distinto | Glosario |
| N4 | «Catálogo» (inventario) y «Catálogo APU» (construcción) | Hecho | Mismo sustantivo para cosas distintas | Glosario |
| N5 | El Inicio figura en la categoría «Clientes y agenda» del registro, pero se muestra en «General» | Hecho / H-14 | Posible inconsistencia solo en «Funciones» | Verificar en pantalla |
| N6 | Una capacidad tiene hasta tres nombres (etiqueta corta, nombre en «Funciones», etiqueta de menú) | Hecho | Desorienta | DR-32 |
| N7 | Una página `PLANNED` (`orders`) se muestra con un marcador genérico | Hecho | Riesgo de P3 | DR-36 |

## 3. Arquitectura recomendada

### 3.1 Niveles de navegación

| Nivel | Qué es | Dónde vive | Quién lo define |
|---|---|---|---|
| **Global** | Dónde estoy en Nexus: negocio, inicio, buscar, crear, notificaciones, cuenta | Barra superior | Shell (único) |
| **Categoría** | Grupos de trabajo del menú | Barra lateral / riel / hoja «Más» | Registro de capacidades |
| **Módulo** | Ítems de una capacidad | Barra lateral | Registro de capacidades |
| **Contextual** | Subvistas de una página (p. ej. Cobros/Gastos dentro de Finanzas) | Pestañas bajo el encabezado | Plantilla de página (DR-17) |
| **De registro** | Ruta de migas, volver, acciones del registro | Encabezado de página | `PageHeader` / `Breadcrumbs` |

**Regla de crecimiento (porqué IA-6).** Un módulo nuevo:
1. Entra como **ítem** de un grupo existente si resuelve ese trabajo.
2. Crea una **categoría** solo si resuelve un trabajo distinto *y* hay al menos dos ítems.
3. Nunca crea una barra de navegación propia.
4. Si un grupo pasa de 7 ítems visibles, se plegan los menos frecuentes (`collapsible`) antes de crear otro nivel.

### 3.2 Comportamiento por viewport (DR-13, DR-14, DR-15)

| Viewport | Navegación | Búsqueda | Crear | Notificaciones | Objetivos táctiles |
|---|---|---|---|---|---|
| **< 768** | Barra inferior (Inicio, módulos principales, «Más») | Hoja de búsqueda (botón en la barra superior) | Botón central de la barra inferior | Campana en la barra superior | **44 px** |
| **768–1023** | **Riel compacto con etiquetas abreviadas visibles** | Campo en la barra superior sin atajo visible en táctil (DR-19) | Botón «Crear» en la barra superior | Campana | **44 px** |
| **≥ 1024** | **Barra lateral expandida** (248 px) con etiquetas | Campo en línea con `Ctrl K` | «Crear» con menú | Campana | Puntero fino: 34–40 px |
| **≥ 1024 táctil** (tablet horizontal) | Igual que arriba | Sin atajo de teclado visible | Igual | Igual | **44 px** (`pointer: coarse`) |

**Porqué:** D8 (la tarea esencial se completa en el contexto de uso), S2 (no hay icono sin nombre) y P7 (una mano).

### 3.3 Barra lateral y riel
- **Ítem activo:** indicador visual + `aria-current="page"` (texto, no solo color).
- **Grupos plegables:** el estado se recuerda por persona (**H**: confirmar dónde se guarda).
- **Etiqueta abreviada del riel:** una palabra (≤ 10 caracteres) derivada del glosario; la etiqueta completa está en el nombre accesible y en un tooltip no esencial. El glosario fija la forma abreviada de cada ítem (`06`).
- **Etiqueta de grupo** ≥ 11 px sin recorte; en el riel se sustituye por un separador con nombre accesible.
- **Indicadores de notificación** en el ítem solo cuando exista un conteo real y accionable (P3).
- **Ítems apagados** nunca aparecen en el menú; se ven en «Funciones» con su motivo.
- **Acceso a configuración** anclado al pie (grupo «Sistema»), siempre visible sin desplazarse.

### 3.4 Barra superior (topbar)
Contenido hoy: marca, búsqueda, «Crear», notificaciones, selector de negocio, tema y cuenta. **Se mantiene.** Reglas:
1. La marca cede ancho antes de que los controles se superpongan (corregido en #143).
2. Ningún control se esconde sin alternativa: en móvil, «Crear» pasa a la barra inferior, el selector de negocio y la cuenta quedan en la hoja «Más».
3. Todos los controles ≥ 44 px con puntero grueso (DR-15).
4. Una sola acción principal visible a la vez («Crear»).

### 3.5 Acciones globales
- **Crear:** lista de acciones filtrada por rol y por módulos activos (ya existe). Porqué: D3, P3.
- **Buscar:** paleta única (§5).
- **Notificaciones:** centro único (§6).
- **Ayuda:** `ContextHelp` en el contexto; el centro de ayuda público vive en `nexus-thrive-web`.

## 4. Navegación contextual

- **Subvistas dentro de una página** (hoy `?tab=` en Finanzas): un solo componente de pestañas con el mismo comportamiento táctil y de teclado (DR-17). Ya existen `TabNav`, `SectionNav` y `UrlSegmentedControl`; **H-02** debe confirmar cuántos módulos los usan frente a resolverlo a mano (Finanzas usa `?tab=`).
- **Ruta de migas** en detalle de registros; en móvil se reduce a «volver».
- **Volver** conserva el estado de filtros y paginación del listado de origen (propuesta; **H**: comprobar si ya ocurre).

## 5. Búsqueda global (DR-21)

### 5.1 Estado actual (hechos)
Paleta `cmdk` con cuatro grupos: **Resultados**, **Ir a** (navegación), **Funciones apagadas** y **Acciones** (crear). En PC es un campo en la barra superior que se ensancha (`Ctrl K`); en móvil, una hoja.

### 5.2 Diseño objetivo

| Nivel | Qué busca | Estado | Reglas |
|---|---|---|---|
| 1 | Navegación, funciones, acciones | **Existe** | Se mantiene |
| 2 | **Registros** (clientes, ventas, productos, documentos) | Parcial: existe el grupo «Resultados» (**H**: confirmar qué entidades cubre) | Límite en el servidor; resultados respetan `can()`; cada resultado dice **qué es** y **de qué módulo** |

**Reglas de experiencia (porqué):**
1. Una sola puerta; sin buscadores por módulo salvo filtros de listado (P4).
2. Teclado completo: flechas, Enter, Escape; foco devuelto al disparador (D7).
3. Estado «sin resultados» con salida: sugerencia + crear (guía de tono §5).
4. Resultados con nombre accesible completo; sin depender del color.
5. En táctil: sin atajo visible; el campo abre una hoja a pantalla completa.
6. «Funciones apagadas» sirve de descubrimiento (D6, S4) sin prometer lo inexistente (P3).

**Criterio de aceptación:** encontrar un cliente por nombre en ≤ 2 pasos en 360 y 1280 px. **Sin línea base todavía**: se mide con tareas guiadas.

## 6. Notificaciones y actividad (DR-22, DR-40, DR-41)

### 6.1 Estado actual (hechos)
- **Campana** (`NotificationCenter`): lista armada con datos reales del día (cobros y gastos de hoy, citas de hoy, membresías por vencer o vencidas), solo de los módulos activos; el usuario puede **descartar** y el descarte persiste.
- **Actividad reciente** (`RecentActivity`) en el Inicio, con filtros.
- Las dos son superficies **separadas**, con modelos distintos (H-12).
- No hay historial de notificaciones pasadas ni niveles de severidad.

### 6.2 Diseño objetivo (solo con lo que existe)
Un **Centro de actividad** con dos pestañas del mismo componente de elemento:
- **Necesita tu atención** (lo de la campana: pendiente de acción).
- **Historial** (lo ocurrido, con filtros por módulo y periodo).

**Estructura de un elemento (porqué: guía de tono §4, S3):**
1. **Qué pasó** (hecho en una línea).
2. **Qué significa** (consecuencia para el negocio) — solo si no es obvia.
3. **Qué hacer** (una acción con verbo concreto) o enlace al registro.

**Niveles (DR-40):**

| Nivel | Cuándo | Señal (texto + icono + color) | Ejemplo (con datos que ya existen) |
|---|---|---|---|
| Informa | Hecho sin acción pendiente | «Informa» + icono neutro | «Cobro registrado hoy» |
| Requiere acción | Algo que el negocio debe resolver | «Requiere atención» + icono de aviso | «Membresía por vencer» |
| Urgente | Dinero o continuidad en riesgo | «Urgente» + icono de alerta | «Membresía vencida» *(o equivalente según módulo)* |

*Los ejemplos usan solo los eventos que hoy produce el sistema; los niveles son una clasificación sobre lo existente, no nuevos disparadores.*

**Reglas:**
1. **Datos reales o nada:** no se muestran notificaciones inventadas ni contadores sin detalle (P3).
2. Respeta permisos: un rol no ve notificaciones de dinero si no maneja dinero (D3).
3. Estados completos: cargando, vacío («Todo al día» con explicación de qué aparecerá aquí), error («No pudimos cargar. Reintenta») y sin conexión.
4. Móvil: hoja a pantalla completa; escritorio: panel anclado a la campana. Ambos con foco y Escape.
5. La campana muestra un contador **solo** de lo que requiere acción.

### 6.3 Qué NO se diseña ahora (DR-23)
Editor de automatizaciones, reglas «cuando pase X hacer Y» y asistente inteligente. **Razón:** no existen disparadores programados ni mensajería real; diseñar la interfaz crearía promesas (P3). Se reabre cuando existan.

## 7. Criterios de aceptación de esta área

| Criterio | Cómo se mide |
|---|---|
| Sidebar expandido desde 1024 px | Capturas a 1023 y 1024; contenido útil ≥ 800 px a 1024 |
| Riel sin etiquetas recortadas | Etiquetas ≥ 11 px visibles a 768, 820 y 1023 |
| Cero controles táctiles < 44 px | Prueba de objetivos con `pointer: coarse` en 360, 412, 820 y 1180 |
| Todo ítem del menú alcanzable desde la paleta | Prueba que compara menú y paleta |
| Ningún módulo define navegación propia | Búsqueda de rutas de menú fuera del registro |
| Campana y actividad con un solo componente de elemento | Revisión de componentes |
| Navegación por teclado completa del shell | Prueba Playwright de teclado |

## 8. Límites
- No se recorrió el menú en ejecución con cada rubro; el inventario sale del registro y de `tenant-nav.ts`.
- Qué entidades cubre hoy el grupo «Resultados» no se verificó (H).
- El guardado del plegado de grupos por persona no se verificó.
- Las pruebas de tablet y táctil siguen siendo en Chromium emulado (DR-30).
