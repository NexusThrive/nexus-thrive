# 05 · Dashboard (Inicio) y visualización de información

[← Índice](README.md) · Decisiones citadas: DR-04, DR-37, DR-38, DR-39. Principio rector: **un tablero con 15 tarjetas que no ayudan a decidir no es mejor por tener más información** (D1 + D5, `SYSTEM-DESIGN.md` §3).

## 1. Lo que existe (hechos)

Fuente: `app/[tenant]/(app)/page.tsx` (442 líneas), `components/organisms/customizable-dashboard.tsx`, `lib/experience/dashboard/*`.

| Bloque | Qué muestra | Condición de aparición | Componente |
|---|---|---|---|
| Saludo y controles de periodo | Saludo con nombre; periodo `hoy / 7d / 30d`; granularidad `día / semana / mes` | Siempre | `RevealText`, `UrlSegmentedControl` |
| Primeros pasos | Lista de pasos de puesta en marcha | Solo si hay ≥ 2 pasos y alguno pendiente | `WelcomeChecklist` |
| Presencia en línea | Resumen de madurez de presencia digital | Módulos de presencia activos | `PresenceSummary` |
| Indicadores financieros | Ingresos, Gastos, Balance neto, Por cobrar (con tendencia y variación contra el periodo anterior, «vs. ayer» o «vs. periodo anterior») | Módulo de finanzas activo | `KpiCard` ×4 |
| Clientes activos | Recuento de clientes (con vocabulario del rubro) y nuevos del periodo | Módulo CRM | `KpiCard` |
| Gráfico de ingresos | Ingresos y gastos del periodo | Finanzas | `IncomeChartPanel` |
| Membresías | Activas, por vencer, vencidas, renovaciones del mes | Módulo de membresías | `StatTile` ×4 |
| Actividad reciente | Últimos movimientos con filtros | Siempre que haya actividad | `RecentActivity` |
| Acciones rápidas | Hasta 4 acciones de creación filtradas por rol y módulos | Según rol | `quickCreateActions` |

**Personalización (hecho):** el tablero se reorganiza (`CustomizableDashboard`): ancho en 96 columnas, alto entre 200 y 640 px, y un catálogo de **6 gráficos** que se pueden agregar (barras, líneas, área, dona, medidor, tendencia de clientes), cada uno condicionado a su módulo. Lo que aún no existe aparece desactivado con «Pronto».

**Honestidad de datos (hecho):** cada indicador explica en un texto de ayuda qué suma y qué no (p. ej. «Balance neto… no incluye lo que aún te deben»); sin base de comparación muestra «Sin variación disponible» en lugar de un 0 % inventado (`insights.ts`). Esto cumple P3 y se **conserva**.

## 2. Jerarquía de información (DR-38)

Pregunta que debe responder el Inicio en la primera vista (S1 control, `01` §1): **¿cuánto hay? ¿cómo va? ¿qué puedo hacer?** (formulación ya presente en `insights.ts`).

| Nivel | Contenido | Porqué |
|---|---|---|
| **1 · Qué debo atender** | Primeros pasos (si aplica) y avisos que requieren acción | D4 progreso honesto; D6 complejidad progresiva: una persona nueva ve primero qué hacer |
| **2 · Cómo va el dinero** | Ingresos, Gastos, Balance neto, Por cobrar | P2 operación diaria primero; P5 el dinero es lo que más importa |
| **3 · Por qué** | Gráfico del periodo y comparación | D1: la tendencia explica el número |
| **4 · Qué está pasando** | Actividad reciente y acciones rápidas | S1 control; S4 continuidad |
| **5 · Contexto del rubro** | Membresías, presencia en línea, etc. | P1, D3: lo propio del contexto, después de lo común |

**Reglas**
1. Cada bloque justifica **la decisión que permite tomar** (D5). Si un bloque no responde ninguna, no entra por defecto: queda en el catálogo de «Agregar».
2. Los indicadores de dinero van **primero y completos**: la cifra se lee sin recorte a 320 px (DR-04).
3. La acción principal de la pantalla es **una** («Crear»); las acciones rápidas son secundarias.
4. El Inicio **nunca muestra un bloque cuyo módulo está apagado** (P3).
5. Un bloque sin datos explica cómo llegar al primer dato, no solo «No hay datos» (guía de tono §5).

## 3. Componentes de cifra (DR-37)

| Componente | Rol | Uso |
|---|---|---|
| `KpiCard` | **Indicador con contexto**: cifra, comparación, tendencia, ayuda y enlace al detalle | Indicadores financieros y de cartera |
| `StatTile` | **Recuento breve**: número y etiqueta | Conteos por estado (membresías) |

No se fusionan hasta que el uso real lo pida (DR-11). Ambos mantienen el mínimo de 16 px en importes (#143).
**Pendiente (H):** comprobar que `StatTile` se usa en al menos dos contextos distintos; hoy el uso visible es el de membresías.

## 4. Densidad y composición (DR-03, DR-04)

| Aspecto | Regla | Porqué |
|---|---|---|
| Tarjetas | Proporcionadas: una tarjeta por unidad de información; sin tarjeta dentro de tarjeta | Brief §7; B4 |
| Padding | Del espaciado de 4 px; el aire crece con la importancia, no con el tamaño de pantalla | D1 |
| Cifras | ≥ 16 px; la tarjeta cambia de estructura antes de encoger la fuente | DR-04, P5 |
| Encabezado | Compacto: saludo + periodo en una línea cuando cabe | Brief §7 |
| Gráfico | Alto mínimo 200 px; el valor exacto accesible sin pasar el ratón | D7 |

## 5. Comportamiento por viewport (D8)

Referencia medida: #140 y #142. Las cifras de columnas son las del tablero; el reparto exacto por viewport lo fija la plantilla.

| Viewport | Distribución propuesta | Prioridad de tarea |
|---|---|---|
| **320–412** | Una columna; KPIs en lista de 1–2 columnas según ancho de la cifra; gráfico a ancho completo; actividad al final; acciones rápidas arriba o en la barra inferior | Consultar el día y actuar con una mano |
| **744–1023** | Dos columnas para KPIs; gráfico a ancho completo; membresías en fila | Consulta y operación de mostrador |
| **≥ 1024** | KPIs en 4 columnas; gráfico y actividad lado a lado | Administración y análisis |

**Regla:** si una cifra no cabe en su tarjeta, la rejilla baja de columnas (DR-04); no se recorta.

## 6. Visualización de información (DR-39)

Skill de visualización consultada como referencia técnica, no como autoridad de diseño.

| Regla | Porqué |
|---|---|
| El color nunca es el único medio: cada serie lleva etiqueta o valor | D7 |
| Cada gráfico tiene una **alternativa en tabla** accesible (resumen textual o datos) | D7; **H-10**: hoy no verificado |
| Series con paleta de marca (negro, dorado, verde/rojo funcional); no se inventa otra paleta | DR-01, B4 |
| Ejes y etiquetas ≥ 11 px | DR-02 |
| Un solo tipo de gráfico por pregunta; el catálogo de 6 no crece sin uso real | D5 |
| Estados completos: cargando (forma del gráfico), vacío (cómo obtener el primer dato), error | DR-09 |
| Comparación contra el periodo anterior siempre con su base explícita | P3 |

## 7. Estados del Inicio

| Estado | Comportamiento | Fuente |
|---|---|---|
| Cargando | `loading.tsx` con la forma del tablero | Existe |
| Cuenta nueva | Primeros pasos + indicadores en cero con explicación | `historia-fiel-dashboard-2026-11` (#142) |
| Sin datos del periodo | «Sin variación disponible» y siguiente paso | Existe |
| Error parcial | Un bloque falla sin tumbar el resto, con reintento | **No verificado** (parte de DR-09) |
| Sin permiso | Un bloque de dinero no aparece o explica por qué | Ver `09` y la hipótesis H-15 |

## 8. Por rol (ver `09`)

**Hecho:** `page.tsx` no llama a `can()` para decidir qué indicadores se muestran; filtra las acciones rápidas por rol. **Hipótesis (H-15):** un rol sin permiso de dinero (p. ej. Asesor) vería los indicadores financieros. Debe verificarse en pantalla con ese rol y, si se confirma, corregirse como defecto de P5/D3 (se documenta en `09`). No se asume el resultado.

## 9. Criterios de aceptación

| Criterio | Medida |
|---|---|
| Primera vista responde ¿cuánto hay? ¿cómo va? ¿qué hago? | Tarea guiada con 5 personas (sin línea base) |
| Cifras sin recorte | `test:responsive` a 320, 360, 412, 744, 820, 1180, 1280 |
| Cada bloque justifica su decisión | Tabla de `§1` completada por bloque |
| Estados cargando, vacío, error, sin permiso | Historias de Storybook por estado |
| Alternativa textual de gráficos | axe + lectura de tabla |

## 10. Límites
- La distribución por viewport del §5 es propuesta; el reparto actual se midió solo en Storybook (#140, #142), no con datos reales.
- No se auditó el contraste de las series de los gráficos.
- No se midió el tiempo de carga ni el rendimiento del Inicio.
