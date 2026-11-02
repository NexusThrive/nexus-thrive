# 12 · Contrato de módulo, coherencia entre módulos y hoja de ruta

[← Índice](README.md) · Decisiones citadas: DR-11, DR-16, DR-31, DR-45, PD-09, PD-10. Principio rector (aprobado): **Nexus no es una colección de módulos bonitos; es un sistema conectado que entiende cómo funciona un negocio.**

## 1. Para qué sirve este documento
1. Fija las **reglas generales que cumple cualquier módulo**, presente o futuro, de cualquier rubro (la respuesta a «cómo se incorporan módulos sin romper el sistema»).
2. Ordena **cómo se aplica el sistema** a los 22 módulos existentes.
3. Define la **hoja de ruta** con dependencias, prioridad, riesgo y criterios de aceptación.

**Fuera de alcance (aprobado):** procesos operativos de restaurante, gimnasio, turismo u otras industrias. Este contrato no define ningún flujo de industria.

## 2. Contrato de módulo (once requisitos)

Aprobado como dirección (blueprint v3 §6). Cada requisito lleva su porqué, su evidencia en el repositorio y cómo se verifica.

| # | Requisito | Porqué (principio) | Evidencia / mecanismo existente | Verificación |
|---|---|---|---|---|
| 1 | **Se declara en el registro de capacidades** (categoría, ítems, módulo, vocabulario por rubro, estado `READY`/`BETA`/`PLANNED`) y **no define navegación propia** | D2, P4, P3 | `registry.ts`, `route-modules.ts`, `modulesForRoute` | Ninguna ruta de menú fuera del registro |
| 2 | **Parte de una plantilla** y usa componentes del sistema; ningún modal manual, `z-index` numérico ni color suelto | D2 | `CLAUDE.md`, `quality-checklist.md`, lint | Checklist de PR |
| 3 | **Estados completos:** cargando, vacío, error, sin permiso, sin conexión, guardando, guardado | S1, S3, D7 | `loading.tsx`, `EmptyState`, `Alert`, `useToast`, `NetworkBanner` | Historias de estado + `error.tsx` |
| 4 | **Permisos en el servidor** con `can()`; la interfaz solo refleja | D3, P5 | `lib/core/auth/permissions.ts`, `requirePageContext` | Pruebas de permisos |
| 5 | **Móvil primero**; probado en 320/360/412/744/820/1180/1280; 44 px en táctil | D8, P7 | `pnpm test:responsive` | Suite responsive |
| 6 | **Lenguaje del glosario:** verbos, estados y términos oficiales; «sin permiso» derivado de la matriz | P6, B1 | `06` | Revisión de textos |
| 7 | **El dinero pasa por el servicio de dinero** y deja rastro | P5 | `money-service`, `logTenantAction` | Arquitectura existente |
| 8 | **Se conecta con el resto por eventos y operaciones**, no por copias de datos | S5 | `lib/core/events`, `lib/core/operations` | Revisión de diseño |
| 9 | **Nada se anuncia que no funcione** (etiqueta de madurez coherente con el estado) | P3, B5 | Estado de la capacidad | Revisión |
| 10 | **Un patrón nuevo se documenta con dos usos reales** y su ficha | D5 | Política vigente de `CLAUDE.md` | Historia + `DESIGN.md` |
| 11 | **Declara qué dispositivo prioriza** su tarea principal y qué rol la usa | D3, D8 | Plantilla (propuesta `07` §3) | Sección en la plantilla |

### 2.1 Lo que el contrato NO exige (para no cerrar puertas)
- No impone un menú ni un flujo; impone **cómo se declara y cómo se comunica**.
- No fuerza a un módulo a ser igual a otro; fuerza a que **lo igual se haga igual** (P4).
- No crea capas nuevas: la arquitectura por capas vigente (`docs/architecture/layers.json`) se respeta.

### 2.2 Cómo entra un módulo nuevo (pasos)
1. **Justificar** en un párrafo: problema, principio, quién lo usa (D3), qué existente no lo resuelve.
2. **Declarar** la capacidad en el registro (categoría, ítems, estado inicial).
3. **Elegir plantilla** (Listado, Detalle, Configuración, …) y patrones.
4. **Construir los estados** antes que la pantalla ideal.
5. **Documentar permisos**: qué rol ve qué.
6. **Probar** en los viewports y con contenido real.
7. **Redactar** con el glosario.
8. **Etiquetar su madurez** y mostrarla.
9. **Pasar el checklist** (`quality-checklist.md` + este contrato) en el PR.

## 3. Coherencia entre los módulos existentes

Medida con la puntuación de `02` §3 (DR-31). **Objetivos medibles** (todos con línea base real, ninguno inventado):

| Objetivo | Línea base (hoy) | Cómo se mide |
|---|---|---|
| `error.tsx` en las rutas | 0 de 38 páginas del negocio (0 de 72 en la app) | Conteo de archivos |
| `loading.tsx` en las rutas | 32 de 38 del negocio (37 de 72) | Conteo de archivos |
| Tablas manuales | 30 en el negocio (33 en la app); `DataTable` 0 | `pnpm design:inventory` y `02` §3 |
| `<Button>` frente a `<button>` nativo | 21 frente a 286 en el negocio | `02` §3 |
| Tamaños de texto fuera de token | 301 en el negocio (736 en la app) | idem |
| Hex y colores arbitrarios | 35 hex en el negocio; 114 usos de color arbitrario en la app | idem |
| `z-index` numérico | 4 en el negocio; 25 en la app | idem |
| «Sin permiso» unificado | 13 páginas con aviso propio; 28 con `notFound()` | `09` §1.4 |
| Componentes sin uso / sin historia | 19 / 24 | `pnpm design:inventory` |
| Reflow a 320 y sin recortes | 224 pruebas en #143 (reporte, no re-ejecutado) | `pnpm test:responsive` |
| Objetivos táctiles de 44 px | 8 controles en 40–42 px (#140) | Prueba de objetivos |
| Tiempo hasta el primer valor | **Sin línea base** | Tareas guiadas con personas |
| Navegación comprensible | **Sin línea base** | Tareas guiadas («encuentra dónde…») |
| Textos coherentes | 4 literales genéricos («OK» 2, «Enviar» 2) | Conteo `06` §5 |

*Los dos objetivos sin línea base **no se afirman como mejorados** hasta medirlos.*

## 4. Hoja de ruta integral

### 4.1 Fases documentales (completadas en esta etapa)

| Fase | Entregable | Estado |
|---|---|---|
| Auditoría de la experiencia actual | `02` | **Completada** |
| Filosofía y registro de decisiones | `01` | **Completada** |
| Fundamentos visuales | `03` | **Completada** |
| Navegación, búsqueda y actividad | `04` | **Completada** |
| Dashboard y visualización | `05` | **Completada** |
| UX Writing y glosario | `06` | **Completada como borrador a aprobar** (PD-03) |
| Responsive y multidispositivo | `07` | **Completada** |
| Accesibilidad | `08` | **Completada** |
| Roles, permisos y estados de acceso | `09` | **Completada** |
| Integraciones | `10` | **Completada** |
| Componentes, patrones, plantillas | `11` | **Completada** |
| Contrato de módulo y hoja de ruta | `12` | **Completada** |
| Validación de consistencia | `13` | **Completada** |

### 4.2 Aprobaciones que se esperan (puertas)

| Puerta | Qué se aprueba | Depende de | Bloquea |
|---|---|---|---|
| **G0** | Esta documentación (publicarla en `main` solo tras tu revisión, PD-08) | — | Todo lo demás |
| **G1** | Arquitectura de experiencia (`01`, `04`, `09`, `10`, `12` §2) | G0 | G2–G4 |
| **G2** | Glosario (PD-03, PD-04, PD-05, PD-12) | G1 | Cualquier texto o renombrado |
| **G3** | Escala de patrones y plantillas (`11`) | G1 | Cualquier componente nuevo |
| **G4** | Navegación y responsive (`04`, `07`) | G1, G3 | Cambios del shell |

### 4.3 Fases de implementación (requieren tu autorización específica, una por una)

Cada fase es **una o pocas PR pequeñas**, con capturas antes/después en los viewports de referencia, sin cambiar lógica de negocio (principio del brief).

| ID | Fase | Depende de | Prioridad | Riesgo | Por qué en este orden | Criterio de aceptación |
|---|---|---|---|---|---|---|
| **I1** | **Estados de ruta**: `ErrorState`, `error.tsx`, `not-found`, `loading.tsx` faltantes (`checkin`, `presence`, `tickets`); historias Sin conexión y Guardando | G1, G3 | Alta | Bajo | Mayor brecha (0 %) con menor riesgo; no cambia pantallas existentes | Todas las rutas con `error.tsx` propio o heredado documentado; historias con axe |
| **I2** | **Tokens** `text-2xs` y `text-ui` + regla que congela el conteo fuera de token | G1 | Alta | Bajo | Habilita la migración gradual sin cambio visual | Tokens creados; conteo no crece; capturas sin diferencias |
| **I3** | **Tabla/lista adaptable** y 2 módulos piloto (propuesta: `stock` y `contabilidad`, por tener 3 tablas y tamaño pequeño) | I2, G3 | Alta | Medio | Mayor brecha responsive; se valida en módulos acotados antes de los grandes | 0 `<table>` manuales en los pilotos; sin scroll horizontal 320–1280; 44 px |
| **I4** | **Shell y tablet**: 1024 px expandido, riel con etiquetas abreviadas, 44 px, buscador sin atajo en táctil | I3, G4 | Alta | Medio | Toca todas las pantallas; se hace con la tabla ya estable | Capturas a 744, 768, 820, 1023, 1024, 1180; suite responsive verde |
| **I5** | **Lenguaje aplicado** en los pilotos: verbos, estados con icono, mensajes, «sin permiso» derivado | G2, I3 | Alta | Medio | Texto coherente antes de ampliar | Conteos de `06` bajan en pilotos; 0 renombrados fuera del glosario |
| **I6** | **Roles y contexto**: criterio único de «sin permiso»; Inicio por permiso (si se confirma H-15) | I1, G2 | Media | Medio | Coherencia por rol | Revisión rol × pantalla; Asesor sin indicadores de dinero si aplica |
| **I7** | **Centro de actividad** (campana + actividad) y búsqueda de registros | I3, I6, PD-06 | Media | Medio | Depende de tabla/lista, roles y permisos | Funciona 320–1280; respeta permisos; cada elemento enlaza al registro |
| **I8** | **Dashboard**: densidad y jerarquía | I3, I4, I6 | Media | Medio | Se refina con piezas ya estables | Cifras sin recorte; jerarquía de `05` §2 |
| **I9** | **Integraciones** en «Sistema»: ficha «Conexión» con lo existente | I1, I5, PD-12 | Media | Medio | Continuidad sin promesas | Estados reales; ninguna herramienta que no se pueda conectar |
| **I10** | **Aplicación modular por oleadas** (§5) | I3–I9, PD-09 | Media | Variable | Una sola experiencia | Puntuación de `02` §3 sube por oleada |
| **V1** | **Validación integral** (dispositivos reales, accesibilidad, regresión, rendimiento, estados) | I10 | Continua | — | Cierra el ciclo; respeta DR-30 | Reporte por dispositivo; R1–R5 evaluados |
| **V2** | **Documentación del sistema consolidado** | V1 | Final | — | Para que sobreviva al equipo | `DESIGN.md`, wiki y Storybook al día |
| **Posterior** | **Sistemas por industria** como proyecto independiente | V2 | Fuera de alcance | — | Se construyen sobre una base común | — |

### 4.4 Dependencias (resumen)

```
G0 ─ G1 ─┬─ G2 (glosario) ───────────────┬─ I5 ── I6 ── I7
         ├─ G3 (patrones) ─ I2 ─ I3 ─ I4 ┤         └─ I9
         └─ G4 (shell y responsive) ──────┘                 
I1 (estados) ──────────────────────────── I6, I9
I3, I4, I6 ─ I8 (dashboard)
I3–I9 ─ I10 (oleadas) ─ V1 ─ V2 ─ [industrias: proyecto posterior]
```

### 4.5 Qué NO puede empezar antes (reglas duras)
- Ningún **renombrado** antes de G2.
- Ningún **componente nuevo** antes de G3 y de los dos usos reales.
- Ningún cambio de **shell** antes de G4.
- Ninguna **integración nueva** ni **automatización**; no hay fase para ellas en esta hoja de ruta (DR-23).
- Ninguna **fusión, despliegue o eliminación de ramas** sin tu orden expresa (PD-10 sobre #141–#143).

## 5. Oleadas de aplicación modular (I10, DR-45)

Orden propuesto por **riesgo** (el dinero va después de validar los patrones) y por **valor** (frecuencia de uso). Es propuesta (PD-09).

| Oleada | Módulos (carpetas) | Por qué aquí | Foco |
|---|---|---|---|
| **0 · Pilotos** | `stock`, `contabilidad` (tabla) · `projects` (botón) | Acotados, con tablas; `projects` ya usa `<Button>` | Validar patrones |
| **1 · Clientes y agenda** | `crm`, `bookings`, `memberships`, `tickets`, `checkin` | Alta frecuencia de uso; `crm` tiene 28 archivos y 3 tablas | Tabla/lista, formularios, estados |
| **2 · Productos** | `inventory`, `catalog`, `orders` | Tablas y formularios; `orders` es marcador de plan (DR-36) | Tabla/lista, honestidad de plan |
| **3 · Ventas y dinero** | `pos`, `billing`, `cobros`, `cartera`, `finance`, `purchases`, `payments` (redirección) | **Riesgo alto (P5):** se hace con los patrones ya probados; `billing` y `finance` concentran hex y texto `px` | Cifras, documentos (`--doc-*`), «sin permiso» |
| **4 · Obras** | `projects` (resto), `quotes` | Módulo grande de oficio, aislado | Tabla/lista, `Button` |
| **5 · Presencia y canales** | `sitio`, `google`, `crecimiento`, `pedidos-tienda`, `whatsapp`, `presence` | Menor frecuencia; WhatsApp requiere DR-35 | Honestidad de madurez |
| **6 · Sistema** | `settings`, `functions`, `data`, `taxes`, `factura-electronica` | Configuración; integraciones (I9) | Plantilla de configuración, ficha de conexión |

Cada oleada cierra con: puntuación de `02` §3 actualizada, capturas antes/después, pruebas en viewports de referencia y revisión de lenguaje.

## 6. Riesgos

| Riesgo | Mitigación | Principio |
|---|---|---|
| Migrar todo a la vez y perder control | Oleadas pequeñas y verificables | S3 |
| Cambiar cifras o importes al migrar tipografía | Migración asistida y revisada por módulo (DR-02); capturas | P5 |
| Renombrar y desorientar | G2 antes de textos | P6, S5 |
| Prometer lo que no existe | Etiquetas de madurez; revisión | P3, B5 |
| Componentes nuevos sin uso | Regla de dos usos | D5 |
| Probar solo en emulación | V1 con dispositivos | DR-30 |
| Sobrecargar la pila de PR actual | PD-10: no se toca #141–#143 hasta tu orden | — |
| Que el sistema se pliegue al primer rubro que se construya | Contrato genérico (§2) | D2, P1 |

## 7. Qué exige tu autorización
Todo lo que **toque código** (I1 en adelante). Lo documental de esta etapa no cambia ningún archivo de la aplicación.

## 8. Límites
- No se estimaron duraciones ni esfuerzos en horas: las líneas base y las dependencias son verificables, los plazos no.
- La elección de pilotos y el orden de oleadas es propuesta basada en la puntuación de `02`; no se ha hablado con los equipos que usan cada módulo.
- Las líneas base «sin medir» (tiempo hasta primer valor, comprensión de navegación) requieren pruebas con personas.
