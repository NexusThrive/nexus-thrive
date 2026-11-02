# 07 · Responsive y experiencia multidispositivo

[← Índice](README.md) · Decisiones citadas: DR-04, DR-06, DR-08, DR-13 a DR-15, DR-19, DR-20, DR-29, DR-30. Principio: **D8 · Mobile as a First-Class Experience** (ratificado): una sola plataforma adaptada a cada contexto; **el comportamiento cambia, no solo el tamaño**.

## 1. Punto de partida (hechos)

| Fuente | Qué aporta |
|---|---|
| Auditoría #140 | Dashboard correcto desde 375 px; fallos en 320/360; tablet es la zona menos resuelta; controles de 40–42 px |
| Infraestructura #141 | `e2e/viewports.ts` como fuente única de viewports; proyecto de Playwright `responsive`; pruebas de reflow, solapes, tamaño mínimo y objetivos táctiles |
| Historia fiel #142 | Dashboard completo en Storybook con casos `NombreLargo` y `CifrasGrandes` |
| Correcciones #143 | P1-1, P1-2, P1-3 resueltos: importes (mínimo 16 px) y barra superior sin superposición |
| Hallazgos aún marcados `test.fail` | P2-3 (objetivos de 40–42 px), P2-4 (riel sin etiquetas y texto de 10 px), P2-5 (controles de contenido < 44 px) |

*Estos documentos y pruebas están en la pila de PR #141–#143 (sin fusionar), no en `main`.*

## 2. Viewports de referencia (DR-20)

Fuente: `e2e/viewports.ts` (pila #141) + una adición propuesta.

| Viewport | Ancho × alto | Rol | Propósito | Estado |
|---|---|---|---|---|
| Móvil mínimo | 320 × 640 | Referencia | Reflow (WCAG 1.4.10) | En pruebas |
| **Móvil** | **360 × 740** | **Referencia de diseño** | Android más común y primer ancho que falló | En pruebas |
| Móvil 375 | 375 × 812 | **Regresión** | Detecta regresiones | En pruebas |
| Móvil grande | 412 × 915 | Referencia automática | Pixel 7 en Playwright | En pruebas |
| **iPad mini vertical** | **744 × 1133** | Referencia (DR-20) | Antes caía en el diseño de teléfono (medido en emulación) | **Añadido a `viewports.ts`** |
| Tablet 768 | 768 × 1024 | Límite | Umbral móvil/tablet | En pruebas |
| Tablet vertical | 820 × 1180 | Referencia | iPad 10,9" | En pruebas |
| Tablet 1023 | 1023 × 768 | Límite | Último ancho antes de la navegación expandida | En pruebas |
| **Umbral 1024** | 1024 × 768 | Límite (DR-13) | Primer ancho con barra lateral expandida | **Añadido a `viewports.ts`** |
| Tablet horizontal | 1180 × 820 | Referencia | Tablet apaisada | En pruebas |
| Escritorio | 1280 × 800 | Referencia | Productividad | En pruebas |

## 3. Tareas, no tamaños (D8)

Hipótesis de trabajo (**H-01**: sin analítica de uso). Se valida con tareas guiadas antes de fijar prioridades definitivas.

| Tarea general del negocio | Móvil | Tablet | Escritorio | Qué exige a la interfaz |
|---|---|---|---|---|
| Consultar cómo va el día | **Excelente** | Excelente | Excelente | Cifras sin recorte; primera vista responde ¿cuánto hay? ¿cómo va? ¿qué hago? |
| Registrar un cobro o una venta | **Excelente** (una mano) | **Excelente** | Excelente | Pocas decisiones, teclado numérico, 44 px |
| Buscar un cliente y contactarlo | **Excelente** | Buena | Excelente | Búsqueda global; acciones de contacto visibles |
| Crear o editar un registro | Buena (formulario corto) | Buena | **Excelente** | Una columna en móvil; hoja inferior; 16 px en campos (DR-06) |
| Revisar notificaciones y actividad | **Excelente** | Buena | Buena | Centro de actividad como hoja o panel |
| Revisar listados y tablas | Aceptable (lista) | Buena | **Excelente** | Lista adaptable; filtros en hoja |
| Importar, exportar, conciliar | Solo consulta | Aceptable | **Excelente** | Vista previa y errores por fila; no se promete en móvil |
| Configurar el negocio y el equipo | Aceptable | Buena | **Excelente** | Plantilla de configuración con secciones |
| Conectar una herramienta | Aceptable | Buena | Buena | Estado y acciones claras |

**Qué significa para el diseño:** cada plantilla declara qué dispositivo prioriza (contrato de módulo, `12` §2, requisito 11). El móvil es el contexto primario de consultar y cobrar; el escritorio, de administrar. Porqué: D8 y P7.

## 4. Patrones adaptativos

| Patrón | < 768 | 768–1023 | ≥ 1024 | Porqué |
|---|---|---|---|---|
| **Navegación** | Barra inferior + hoja «Más» | Riel con etiquetas abreviadas (DR-14) | Barra lateral expandida (DR-13) | D8, S2 |
| **Tabla** (DR-08) | **Lista** con columnas por rol (principal, secundaria, estado, acción) | Lista o tabla según ancho de contenido | Tabla | Sin scroll horizontal en tablas comunes |
| **Filtros** | Botón «Filtrar» que abre hoja | Barra compacta + hoja para el resto | Barra completa | D1, D6 |
| **Diálogo** | **Hoja inferior** a ancho completo | Modal centrado | Modal o panel lateral | `ResponsiveSheet` ya lo hace (cambio en 768) |
| **Panel de detalle** | Pantalla completa | Panel lateral | Panel lateral | D8 |
| **Formulario** | Una columna; etiquetas arriba; 16 px en campos | Una o dos columnas | Dos columnas máx. | DR-06 |
| **Paginación** | «Cargar más» o páginas compactas | Páginas | Páginas | D1 |
| **Acciones de fila** | Menú «⋯» con ≥ 44 px | Menú o botones | Botones o menú | No esconder acciones esenciales |
| **Gráfico** | Ancho completo, altura mínima 200 px | Ancho completo | En rejilla | D7 |
| **Tooltip / ayuda** | Ayuda contextual (`ContextHelp`) que se abre al tocar | Igual | Hover + clic | `title` no sirve en táctil |
| **Atajos de teclado** | Ocultos | Ocultos en táctil (DR-19) | Visibles con puntero fino | D5 |

## 5. Objetivos táctiles y contexto de puntero (DR-15)

- **44 px en todo control táctil**, incluidos cabecera y cierre de hojas (decisión aprobada).
- Se aplica con `pointer: coarse`: el escritorio con ratón conserva la densidad (34/40 px). Una tablet horizontal con táctil **sí** recibe 44 px.
- Separación mínima entre objetivos ≥ 8 px.
- Gestos (arrastrar, deslizar) siempre con alternativa por botón.
- Zonas seguras (`env(safe-area-inset-*)`) ya usadas en la barra superior; se exigen también en la inferior (**H**: comprobar en dispositivo).

## 6. Contenido real

Toda historia de patrón incluye (DR-29): nombre largo, cifra grande, lista vacía, lista larga, estado de error y estado de carga, **en 320, 360 y 1280 como mínimo**. Porqué: el recorte solo aparece con datos reales (P5).

## 7. Estados por viewport

| Estado | Móvil | Tablet | Escritorio |
|---|---|---|---|
| Cargando | Forma del contenido (esqueleto), no «Cargando…» | Igual | Igual |
| Vacío | Una acción principal visible sin desplazar | Igual | Igual |
| Error | Mensaje + reintento en la misma pantalla | Igual | Igual |
| Sin conexión | Banner persistente; acciones que requieren red, deshabilitadas con motivo | Igual | Igual |
| Guardando / guardado | Botón con estado; aviso breve | Igual | Igual |

## 8. Hallazgos y a qué decisión pertenecen

| Hallazgo (#140) | Gravedad | Estado | Decisión que lo resuelve |
|---|---|---|---|
| P1-1 Importes recortados a 320 px | P1 | **Corregido (#143)** | DR-04 |
| P1-2 / P1-3 Barra superior superpuesta | P1 | **Corregido (#143)** | — |
| P2-3 Acciones de 40 px en cabecera y hojas | P2 | **Corregido** | DR-15 |
| P2-4 Riel sin etiquetas, texto de 10 px | P2 | **Corregido** | DR-13, DR-14 |
| P2-5 Controles de contenido < 44 px | P2 | **Corregido** | DR-15 |
| Un umbral (768) para todo | P2 | **Corregido** (riel 768–1023, expandida desde 1024) | DR-13, DR-20 |
| Buscador truncado con `Ctrl K` en táctil | P2 | **Corregido** (atajo oculto con puntero táctil) | DR-19 |
| Campo de búsqueda a 14 px en tablet | P3 | Abierto | DR-06 |
| Tres referencias de móvil en conflicto | P3 | **Resuelto en `viewports.ts`** (360/375/412 con roles) | DR-20 |

## 9. Criterios de aceptación (verificables)

| Criterio | Prueba | Umbral |
|---|---|---|
| Reflow | Sin scroll horizontal de página | 320–1280, todas las plantillas |
| Datos sin recorte | Prueba de texto y solapes con `NombreLargo`/`CifrasGrandes` | 0 recortes |
| Navegación según ancho | Barra inferior < 768; riel 768–1023; lateral ≥ 1024 | Capturas a 744, 768, 820, 1023, 1024, 1180 |
| Etiquetas | Todo ítem de navegación con texto ≥ 11 px | 0 etiquetas sin texto |
| Objetivos táctiles | Medida con `pointer: coarse` | 0 controles < 44 px |
| Tablas | Listas sin scroll horizontal | 0 `<table>` con scroll horizontal en patrones comunes |
| Estados | Historia por estado y viewport | Completo en plantillas piloto |

## 10. Limitaciones (DR-30)

- **Chromium emulado ≠ dispositivo real.** No verifica el zoom de Safari/iOS, gestos, teclado virtual, zonas seguras reales ni rendimiento.
- Las pruebas corren sobre **historias**, no sobre la aplicación con datos reales.
- No miden red lenta, contraste renderizado ni estados de carga y error (R5).
- 744 y 1024 no están hoy en `viewports.ts`.
- El reporte de #143 menciona 2 fallos intermitentes en `overlays.spec.ts` bajo paralelismo alto, no reproducibles en ejecución aislada; no se re-ejecutó aquí.
- **R2, R4 y R5 no se dan por cumplidos** hasta probar en dispositivos (`V1` en `12`).
