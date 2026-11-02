# Nexus Thrive · Blueprint UI/UX integral (v3, alcance corregido)

Fecha: 2026-11-01 · Sin cambios en código, ramas ni PR.
**Sustituye a** `blueprint-producto-v2.md` en lo que toca a industrias y restaurante. **Conserva** `blueprint-experiencia-nexus.md` (benchmark y mediciones detalladas) como anexo técnico.

Etiquetas: **[H]** hecho observado · **[A]** decisión aprobada por ti · **[Y]** hipótesis · **[R]** recomendación · **[F]** capacidad futura (no existe).

---

## 0. Corrección de alcance [A]

| Sale del alcance actual | Dónde estaba | Qué hice |
|---|---|---|
| Restaurante: mesas, comandas, QR, cocina, recetas, meseros, inventario especializado | v2 §C-5 (caso de estudio) y fase P11 | **Eliminado.** Ninguna fase del sistema de diseño depende de él |
| Procesos operativos de gimnasio, turismo u otras industrias | v2 §C-5 | **Eliminados.** Solo queda la regla genérica de cómo un módulo se incorpora (§6) |
| Tablero de estados con tiempo y plano de mesas como «patrones nuevos» | v2 §D | **Retirados.** Si un día hacen falta, nacerán de dos usos reales (regla vigente de `CLAUDE.md`) |
| Etapa 10 del orden de ejecución | — | Industrias = proyecto independiente **posterior**, sin dependencias hacia atrás |

**Se mantiene el hecho [H]** (sin diseñarlo): existen verticales en el registro de sectores y vocabulario por rubro. Eso es *contexto* que el sistema de experiencia debe respetar (vocabulario, módulos activos), no un flujo que diseñar ahora.

**Lo único relativo a industrias que sigue en alcance:** que el sistema general **no se rompa** cuando se sumen módulos o rubros (§6, «contrato de módulo»).

---

## 1. Filosofía de Nexus (la vara con que se mide todo)

Todo lo siguiente ya está escrito en el repo; no lo invento. Lo reúno con siglas para poder citarlo.

**Promesa [H, `brand-book.md`]:** «Simplifica tu vida financiera y empresarial en un solo sitio.» Un sistema operativo del negocio para pymes colombianas.

| Sigla | Principio | Fuente | Pregunta de prueba |
|---|---|---|---|
| **D1** | Claridad antes que complejidad | `SYSTEM-DESIGN` §3 | ¿Qué decisión permite tomar cada elemento? |
| **D2** | Consistencia en todo el sistema | idem | ¿Se hace igual que en los demás módulos? |
| **D3** | El contexto determina la experiencia (rubro, tipo de negocio, rol) | idem | ¿Cada contexto ve lo suyo, sin menús que no usa? |
| **D4** | Progreso visible y honesto | idem | ¿La barra o cifra es real o decora? |
| **D5** | Acciones con propósito | idem | Si lo quitamos, ¿alguien lo echaría de menos? |
| **D6** | Complejidad progresiva | idem | ¿Una persona nueva completa la tarea sin ver opciones avanzadas? |
| **D7** | Accesibilidad y confianza | idem | ¿Se puede con teclado, una mano, sin color? ¿Se puede deshacer o ver el rastro? |
| **D8** | Mobile as a First-Class Experience (ratificado) | idem + `decisiones…` §4 | ¿La tarea esencial se completa en móvil? |
| **P1** | Se adapta al rubro | `PRODUCT.md` | |
| **P2** | La operación diaria primero | idem | |
| **P3** | **Datos reales o nada**: sin cifras inventadas, controles que no funcionan ni módulos que no existen | idem | |
| **P4** | **El mismo gesto para lo mismo** | idem | |
| **P5** | **El dinero no se equivoca** (sin duplicados, con recibo, anular deja rastro) | idem | |
| **P6** | Español de Colombia, claro y corto; verbos concretos | idem | |
| **P7** | Accesible y usable con una mano (WCAG 2.2 AA) | idem | |
| **B1–B5** | Marca: directa · operativa · local · serena · honesta | `brand-book.md` | |
| **S1–S5** | Lo que la persona debe sentir: control · claridad · confianza · progreso · continuidad | `SYSTEM-DESIGN` §1 | Señal de falla en cada una |

**Marca inmutable [H]:** nombre NEXUS, negro y oro, Public Stunt. `packages/brand/` es la fuente de verdad; no hay segundo sistema de tokens.

### 1.1 La regla del porqué [R]
Ninguna decisión entra al sistema si no responde, por escrito:

1. **Problema** observado (con medición o evidencia).
2. **Principio** de la tabla que la sostiene (D#, P#, B#, S#).
3. **Alternativa descartada** y por qué.
4. **Cómo se mide** que funcionó.
5. **Qué se rompe si se retira** (test D5).

Esto es lo que el registro de §3 aplica a cada decisión. Una decisión sin principio es preferencia personal y no pasa.

### 1.2 Cinco rasgos de «sentirse Nexus» traducidos a diseño [R]
- **Serena (B4) y honesta (B5):** sin sombras decorativas, sin urgencia falsa, estados reales; si algo no está disponible, no aparece (P3).
- **Operativa (B2):** cada pantalla empieza por «qué pasa hoy y qué hago» (S1, S2).
- **Local (B3):** pesos con separador de miles, fechas en español, WhatsApp y NIT como ciudadanos de primera.
- **Directa (B1):** una acción principal por pantalla; verbos concretos.

---

## 2. Estado real: qué tenemos (resumen verificado)

Detalle y mediciones en el anexo. **[H]**

- Sistema de diseño **existente y documentado** (`packages/brand`): tokens, 138 componentes compartidos, ~146 archivos de historias, 9 páginas de documentación en Storybook, checklist de PR, pruebas responsive (#141–#143 sin fusionar).
- Patrones de interacción **muy consolidados** (0 `window.confirm`, 0 modales manuales; `Field` 251 usos, `ResponsiveSheet` 31…).
- **Brechas medidas:** 0/72 rutas con `error.tsx`; 51 % con `loading.tsx`; sin patrón de tabla (33 `<table>` manuales, `DataTable` con 0 usos); 736 tamaños de texto fuera de token; API doble de botón (385 vs 54); sidebar expandido solo desde 1200 px; tablet sin etiquetas; controles de 40–42 px en táctil; sin glosario; integraciones sin lugar común.
- Notificaciones y búsqueda **existen en forma básica** (campana calculada con datos del día; paleta cmdk de navegación y acciones); no hay bandeja persistente ni búsqueda de registros [H, `notifications.ts`, `command-palette.tsx`].

---

## 3. Registro de decisiones (qué, por qué y cómo se mide)

Formato: **Decisión** · **Porqué** (problema + principio) · **Descartado** · **Medida**.
Cada fila es la unidad de aprobación. Estado: [A] ya decidida por ti, [R] por aprobar.

### 3.1 Fundamentos

| ID | Decisión | Porqué | Descartado | Medida |
|---|---|---|---|---|
| **DR-01** [A] | `packages/brand` sigue como **única** fuente de tokens | P4/D2: dos fuentes generan módulos que divergen; el repo ya lo exige | Tokens paralelos para el rediseño | 0 colores/tamaños nuevos fuera del paquete |
| **DR-02** [A] | Añadir `text-2xs` (11) y `text-ui` (13); escala de seis pasos; **no migrar automáticamente** los 736 | D1/D2: 13 px domina (308 usos) pero no existe como paso; 12 tamaños con medios píxeles rompen la jerarquía. Migración automática puede alterar importes (P5) | Escala de 4 pasos; migración masiva | Conteo de usos fuera de token baja módulo a módulo; capturas sin diferencias en importes |
| **DR-03** [A] | **Dos densidades:** estándar (40 px) y compacta (34 px). Sin «cómoda» | D5/D6: no hay evidencia de que alguien la eche de menos; cada modo extra se paga en pruebas y en 3 plantillas | Tres densidades | Si aparece un caso real documentado, se reabre |
| **DR-04** [R] | Cifras de dinero **≥ 16 px** y nunca recortadas; metadatos ≥ 11 px | P5/D7: dinero cortado fue el P1 más grave medido (#140); no se corrige encogiendo tipografía | Reducir fuente en pantallas pequeñas | `test:responsive`: 0 recortes a 320 |
| **DR-05** [R] | Tokens documentales (`--doc-*`) para recibos/facturas | P5/B5: 114 colores arbitrarios concentrados en documentos imprimibles; el documento debe verse igual en cualquier tema | Seguir con hex locales | Colores arbitrarios en documentos → 0 |
| **DR-06** [R] | Campos editables a **16 px en móvil**, sin tocar tokens globales | D8/D7: evita zoom en Safari iOS; **sin validar en dispositivo real** | Aplicar 16 px a todo | Prueba en iPhone/iPad reales antes de cerrar |

### 3.2 Componentes y patrones

| ID | Decisión | Porqué | Descartado | Medida |
|---|---|---|---|---|
| **DR-07** [A] | `<Button>` como API preferida; `buttonVariants` interno; mismas variantes (tamaño por defecto pendiente, 2b) | D2/P4: hoy dos formas de hacer lo mismo; ya está alineado con el modelo shadcn | Reescribir todos los botones de golpe | Llamadas a `buttonVariants` sobre `<button>` ↓ por área |
| **DR-08** [R] | **Un solo patrón de tabla/lista adaptable:** tabla en ancho, **lista** en estrecho; columnas con rol (principal, secundaria, estado, acción) | D8/D1: 33 tablas manuales; sin scroll horizontal es criterio R1–R5; Polaris resuelve así el mismo problema (fuente pública). Nexus lo adapta con sus roles de estado y permisos | Scroll horizontal; ocultar columnas sin alternativa | Tablas manuales en pilotos → 0; sin scroll horizontal a 320–1280 |
| **DR-09** [R] | **Estados completos como contrato:** cargando, vacío, error, sin permiso, sin conexión, guardando, guardado | S1/S3/D7: 0/72 `error.tsx`; hoy se documenta el estado ideal. La persona no debe preguntarse «¿se guardó?» | Dejar el error a Next por defecto | Cobertura de estados por ruta e historias |
| **DR-10** [R] | **Un solo tratamiento de «sin permiso»:** ruta inexistente para el rol → 404; función existente sin permiso → aviso con quién puede concederlo | D3/P3: hoy hay dos criterios; mostrar un control que falla viola «no mostrar lo que no funciona» | Esconder siempre / mostrar siempre | Revisión rol×pantalla |
| **DR-11** [R] | Nuevo componente solo con **dos usos reales** y su historia (política vigente) | D5/D2: evita abstracción prematura; 19 componentes hoy sin uso | Crear de antemano `ConnectionCard`, `NotificationItem`, etc. | Componentes sin uso → baja |
| **DR-12** [A] | 19 componentes sin uso: conservar 5 / consolidar 10 / retirar 4 **a Laboratorio**; nada se borra | Reversibilidad (S3) | Borrar | Catálogo sin huérfanos tras revisión |

### 3.3 Navegación y shell

| ID | Decisión | Porqué | Descartado | Medida |
|---|---|---|---|---|
| **DR-13** [A] | Sidebar **expandido desde 1024 px** | D8: la tablet horizontal (1024–1199) trabaja hoy con iconos sin nombre: viola S2 (claridad) | Mantener 1200 | Capturas 1023/1024/1180; contenido útil ≥ 800 px a 1024 |
| **DR-14** [A] | **768–1023:** riel compacto con **etiquetas abreviadas visibles** | S2: icono sin nombre es la señal de falla de claridad; la etiqueta recortada a 10 px (#140) pide abreviar, no esconder | Solo iconos con descripción al enfocar (no existe en táctil) | Etiqueta legible ≥ 11 px sin recorte |
| **DR-15** [A] | **<768:** barra inferior + hoja «Más» (se mantiene); **44 px** en **todos** los controles táctiles, también cabecera | D8/P7: se usa con una mano; la cabecera mide 40 px hoy | 44 px solo en primarias | Prueba de objetivos táctiles: 0 por debajo de 44 en `pointer: coarse` |
| **DR-16** [R] | Navegación **generada desde el registro de capacidades** (ya es así) y única para todos los módulos | D2: evita que cada módulo invente su menú; ya existe `tenant-nav` + registro | Menús por módulo | Ningún módulo define navegación propia |
| **DR-17** [R] | Navegación contextual con un solo componente `Tabs`/subnavegación de módulo | D2/D1: hoy cada módulo resuelve sus pestañas (`?tab=`) a su modo [Y: confirmar con inventario] | Pestañas ad hoc | Una sola implementación |
| **DR-18** [A] | **Integraciones dentro de «Sistema»** al inicio, diseñadas para crecer a centro propio | S5 continuidad: hoy Google, WhatsApp, factura y Wompi están dispersas; P3 obliga a no listar lo inexistente | Primer nivel desde ya | Ruta única con estados reales de cada módulo |
| **DR-19** [R] | Atajo `Ctrl K` oculto en `pointer: coarse`; búsqueda en móvil como hoja | D8/D5: un atajo de teclado en pantalla táctil no lo usa nadie | Mostrar siempre | Sin atajo visible en táctil |
| **DR-20** [A] | Referencias: **360 diseño · 375 regresión · 320 reflow · 412** y tablet 820×1180/1180×820 | D8: la discrepancia medida (#140) está por debajo de 375; se añade 744 como punto de control (iPad mini) [R] | Solo 375 y 1280 | Pruebas en todos los viewports |

### 3.4 Búsqueda, notificaciones y actividad (solo experiencia, con lo que existe)

| ID | Decisión | Porqué | Descartado | Medida |
|---|---|---|---|---|
| **DR-21** [R] | **Búsqueda global en dos niveles:** (1) hoy: ir a, funciones, acciones; (2) después: registros (clientes, ventas, productos) con límite en servidor y permisos | S1 control + P4: una sola puerta evita que la gente recorra menús; ya existe el primer nivel | Buscadores por módulo | Tarea guiada «encuentra a un cliente» en ≤ 2 pasos [sin línea base] |
| **DR-22** [R] | **Centro de actividad** (un solo lugar): notificaciones + historial de lo ocurrido, con tres niveles (informa · requiere acción · urgente) y estructura «qué pasó / qué significa / qué hacer» | S1/S3 y guía de tono §4: hoy la campana es una lista calculada al abrirse; no hay lugar para revisar lo anterior. P3: solo con eventos reales | Notificaciones por correo sin bandeja; contador sin detalle | Cada elemento enlaza al registro; filtros funcionan 320–1280 |
| **DR-23** [R] | **No diseñar** editor de automatizaciones ni asistente de IA ahora | P3/D5: no existen los disparadores ni la mensajería real; diseñar la interfaz antes crea promesas | Maquetas de automatización | Se reabre cuando existan tareas programadas |

### 3.5 Lenguaje

| ID | Decisión | Porqué | Descartado | Medida |
|---|---|---|---|---|
| **DR-24** [A] | **No renombrar** hasta aprobar el glosario completo | P6/S5: renombrar sin revisar rompe la memoria del usuario | Renombrar por oleadas sin glosario | 0 renombrados antes de aprobación |
| **DR-25** [A] | **Cobro ≠ Pago:** cobro = dinero que un cliente debe pagar; pago = salida o liquidación de una obligación | P5/S2: confundirlos en finanzas produce errores de caja | Un único concepto | Glosario + revisión de «Pagos» que hoy abre cobros [H] |
| **DR-26** [R] | Verbos de botón de lista cerrada; nunca «Aceptar/OK/Enviar» salvo informativos | P6 (ya escrito): la acción dice qué pasa | Texto libre por desarrollador | Conteo base (a medir) y bajada en pilotos |
| **DR-27** [R] | **Estados con texto + icono + color**; vocabulario único (Activo, Pendiente, En proceso, Completado, Cancelado, Vencido, Conectado, Desconectado, Requiere atención) | D7: color no puede ser el único medio | Un color por módulo | Prueba axe + revisión de `Badge` |
| **DR-28** [R] | Cada herramienta/capacidad lleva etiqueta **disponible / prototipo / plan futuro** | B5/P3 (guía de tono §6) | Listar marcas sin conexión real | 0 integraciones listadas que no existan |

### 3.6 Responsive, accesibilidad y pruebas

| ID | Decisión | Porqué | Descartado | Medida |
|---|---|---|---|---|
| **DR-29** [R] | Pruebas con **nombres largos, importes grandes y estados** en cada patrón | D8/P5: el recorte solo se ve con contenido real | Probar solo con datos cortos | Casos incluidos en las historias |
| **DR-30** [A] | Declarar siempre que **Chromium emulado ≠ dispositivo real** | B5: afirmar lo no probado viola la filosofía | Dar R2/R4/R5 por cumplidos | Sección «Limitaciones» en cada informe |

---

## 4. Arquitectura de experiencia

### 4.1 Tres piezas de experiencia (no son capas de código nuevas)
| Pieza | Qué es | Qué ya existe [H] | Regla |
|---|---|---|---|
| **Shell** | Sidebar, topbar, búsqueda, notificaciones, acciones globales | `TenantShell`, `AppSidebar`, `AppTopbar`, `CommandPalette` | Un solo shell para todos los módulos |
| **Plantillas de página** | Estructuras reutilizables | 6 templates + `PageHeader`, `PageSkeleton` | Una página nueva parte de una plantilla |
| **Patrones** | Soluciones a problemas recurrentes | `Field`, `ResponsiveSheet`, `ConfirmDialog`, `EmptyState`… | Reusar antes de crear |

**Porqué:** D2/P4 («el mismo gesto para lo mismo») y la restricción de no crear capas sin necesidad demostrada [A]. Se organiza lo que ya existe y se documenta; no se mueve `lib/`.

### 4.2 Plantillas necesarias (7 niveles, nivel 5) [R]
Dashboard · Listado · Detalle · Formulario · Configuración · Reportes · Integraciones · Centro de actividad.
**Orden:** primero **Listado** y **Configuración** (mayor repetición), luego Detalle y Formulario. Dashboard (ya existe) se refina después. «Gestión operativa» **queda fuera** (es el concepto ligado a industrias; no se define ahora).

### 4.3 Escala de siete niveles: qué se hace en esta etapa
| Nivel | Se hace | No se hace |
|---|---|---|
| 1 Tokens | `text-2xs`, `text-ui`, `--doc-*`, breakpoints documentados | Nuevo sistema |
| 2 Primitivas | API de Button/Input; mapa de estados con icono | Radio/Tooltip como átomos sin uso real |
| 3 Compuestos | `ErrorState`, `FilterBar` | `NotificationItem`, `ConnectionCard` hasta tener dos usos |
| 4 Patrones | Tabla/lista, importar/exportar con vista previa, centro de actividad, estados de conexión | Patrones propios de una industria |
| 5 Templates | Ver §4.2 | «Gestión operativa» |
| 6 Experiencias | Registrar cliente, crear venta, cobrar, importar datos, conectar herramienta existente, configurar negocio | Flujos propios de un rubro |
| 7 Módulos | Aplicar a los 24 existentes en oleadas | Módulos nuevos |

---

## 5. Experiencia según rol (solo interfaz)

**Hecho [H]:** roles `OWNER`, `ADMIN`, `RECEPTION`, `ADVISOR`, `STAFF`, `SUPERADMIN`; permisos en `lib/core/auth/permissions.ts`; el servidor decide, la pantalla oculta. El Operations Center de Nexus tiene **otro** modelo de permisos.

**Reglas [R]:**
1. **Misma plantilla, contenido por permiso** (no pantallas por rol). *Porqué:* P4/D3.
2. El **Inicio** se compone por permiso (widgets); el dashboard ya es personalizable. *Porqué:* D3 y D5 (un widget que el rol no usa estorba).
3. Lo que el rol no puede hacer: oculto o deshabilitado **con motivo** (DR-10). *Porqué:* S3.
4. Auditoría visible para quien gobierna: quién hizo qué. *Porqué:* S3, P5. **[Y: la superficie para el dueño no la verifiqué]**.
5. Permisos por sección y sede: **[F]**, no se diseña.

---

## 6. Contrato de un módulo futuro (genérico, sin industria)

Cualquier módulo nuevo, de cualquier rubro, debe cumplir esto antes de fusionarse. Es la respuesta a «cómo se incorporan módulos futuros sin romper el sistema». Todo tiene fuente en el repo salvo lo marcado [R].

| # | Requisito | Porqué (filosofía) | Cómo se verifica |
|---|---|---|---|
| 1 | **Se declara en el registro de capacidades** (categoría, ítems de navegación, módulo, vocabulario por rubro) y no define navegación propia | D2/P4; P3 (módulo apagado no muestra pantallas) | `route-modules`, `modulesForRoute` |
| 2 | Parte de una **plantilla** y usa componentes del sistema; ningún modal manual, `z-index` numérico ni color suelto | D2; `CLAUDE.md` | lint + checklist de PR |
| 3 | **Cuatro estados** + sin permiso + sin conexión | S1/S3; D7 | historias de estado |
| 4 | **Permisos en el servidor** con `can()`; la interfaz refleja, no decide | D3/P5; seguridad | pruebas de permisos |
| 5 | **Móvil primero**; probado en 320/360/412/820/1180/1280; 44 px táctil | D8/P7 | `test:responsive` |
| 6 | **Lenguaje del glosario**: verbos de la lista, estados del vocabulario, términos oficiales | P6/B1 | revisión de textos |
| 7 | **Dinero solo por el servicio de dinero** y con rastro | P5 | arquitectura existente |
| 8 | Se conecta con el resto mediante **eventos/operaciones** ya existentes, no copias de datos | S5 continuidad | `lib/core/events`, `operations` |
| 9 | **Nada se anuncia que no funcione** (etiqueta disponible/prototipo/futuro) | P3/B5 | revisión |
| 10 | Un patrón nuevo se documenta con **dos usos reales** y su ficha | D5; política vigente | historia + DESIGN.md |
| 11 | **Declara qué dispositivo prioriza** su tarea principal | D8 | sección en la plantilla [R] |

Esto no define ningún flujo operativo de industria.

---

## 7. Experiencia de integraciones (solo lo que existe)

**Existente [H]:** puertos y adaptadores (pagos: sandbox y Wompi; factura electrónica; Google; WhatsApp), `ExternalConnection`/`ProviderEvent`, API v1, webhooks firmados, MCP, importar/exportar clientes y catálogo (Excel/CSV).
**No existe [F]:** conectores a Alegra/Siigo, sincronización, marketplace, procedencia de datos, conflictos.

**Diseño de la experiencia (en «Sistema → Integraciones», DR-18):**
- Una tarjeta por herramienta **que exista**, con: estado (Conectado · Desconectado · Requiere atención), última actividad, qué datos usa, quién puede gestionarla, acciones (conectar, reconectar, desconectar, ver historial).
- Etiquetas de honestidad (DR-28).
- **Porqué:** S5 (hoy hay que saber en qué módulo mirar), P3 (no listar lo inexistente), D6 (complejidad progresiva: avanzado como API/webhooks queda en un nivel secundario).
- Procedencia de datos y conflictos: **modelo conceptual para cuando exista sincronización**, sin pantalla ahora.
- Importar/exportar: patrón con vista previa, errores por fila y confirmación. *Porqué:* P5/S3, aunque **[Y]** no abrí el flujo actual para saber qué le falta.

Interoperabilidad como principio se mantiene: Nexus no obliga a abandonar herramientas. Los niveles de la ruta (exportación contable → un conector → catálogo → marketplace) se mantienen como **hoja de ruta de producto futura**, no como parte del sistema de experiencia.

---

## 8. Benchmark y diferenciación

Matriz completa en el anexo (Polaris, Odoo, Zoho, Alegra, Square; Siigo y Holded **no evaluados**; sin acceso a pantallas internas).

| Aprendido (patrón común) | Cómo lo adapta Nexus | Porqué es propio |
|---|---|---|
| Tabla que se vuelve lista en pantallas pequeñas | Columnas con rol + estados y acciones según permiso | D8 + D3 |
| Centro de integraciones en Configuración | Solo lo existente y etiquetado con honestidad | P3, B5 |
| Navegación por categorías | Generada por **capacidades activas y vocabulario del rubro** | P1, D3 |

**Diferenciación para Nexus [Y]:**
1. **«Datos reales o nada»** llevado a la interfaz (sin 0 % inventado; apagado ≠ error).
2. **Vocabulario del rubro dentro de un sistema único** (`Socios`/`Obras` sobre el mismo patrón).
3. **Operación primero:** el Inicio responde ¿cuánto? ¿cómo va? ¿qué hago?
Son hipótesis: mi cobertura de competidores fue limitada.

---

## 9. Lenguaje y glosario

Ya existe `guia-de-tono.md` (tú, Colombia, verbos concretos, estructura de mensaje) [H].
**Entregable siguiente (con tu aprobación):** glosario completo — términos oficiales, estados, verbos, mensajes por situación, ejemplos correcto/incorrecto — elaborado **leyendo la interfaz real** (etiquetas de navegación, botones, estados), con la tabla «hoy → propuesto → porqué → impacto» y sin renombrar nada.
**Conflictos ya detectados [H]:** «Pagos» (abre cobros), «Cobros en línea», «Cartera», «Catálogo» (inventario) frente a «Catálogo APU» (construcción), «Existencias», «Taquilla»; «bitácora» (guía) frente a «Historial».

---

## 10. Hoja de ruta (sin industrias)

Carriles: **DS** (sistema), **EXP** (experiencia general). Sin carril de arquitectura nueva.

| Orden | ID | Fase | Depende de | Porqué ahora | Riesgo | Criterio de aceptación |
|---|---|---|---|---|---|---|
| 1 | B0 | **Aprobar este blueprint** (§3 registro de decisiones) | — | Evita construir sobre supuestos | Nulo | Aprobación por bloques |
| 2 | B1 | **Aprobar arquitectura de experiencia** (§4–§6) | B0 | Define el contrato de módulo antes de tocar pantallas | Nulo | Contrato §6 aprobado |
| 3 | B2 | **Glosario completo** → aprobar | B1 | Antes de cualquier texto o renombrado | Nulo | Glosario aprobado; 0 renombrados aplicados |
| 4 | B3 | **Escala de patrones** (fichas por patrón) → aprobar | B1 | Define qué se construye y qué no | Nulo | Fichas con porqué, estados, responsive, accesibilidad |
| 5 | B4 | **Navegación y responsive** → aprobar | B3 | Cierra shell, topbar, breakpoints | Nulo | Capturas objetivo y matriz de viewports |
| 6 | I1 | Estados de ruta + historias de estado | B4 | Mayor brecha, menor riesgo | Bajo | 72/72 rutas con error resuelto o heredado documentado |
| 7 | I2 | Tokens de texto + regla que congela la deuda | B3 | Habilita migración gradual | Bajo | Sin cambio visual; conteo no crece |
| 8 | I3 | Tabla/lista adaptable + 2 módulos piloto | I2 | Mayor brecha responsive | Medio | 320–1280 sin scroll ni recorte |
| 9 | I4 | Shell y tablet (1024, riel, 44 px, búsqueda sin atajo en táctil) | I3 | Toca todo; va con tabla estable | Medio | Capturas 744/768/820/1023/1024/1180; suite verde |
| 10 | I5 | Lenguaje aplicado en pilotos (botones, estados con icono, mensajes) | B2, I3 | Texto coherente | Medio | Conteo de botones genéricos ↓ |
| 11 | I6 | Roles y contexto: «sin permiso» único, Inicio por permiso | I1 | Coherencia por rol | Medio | Matriz rol×pantalla probada |
| 12 | I7 | Centro de actividad (con eventos existentes) + búsqueda de registros | I3, I6 | Control y continuidad | Medio | Funciona 320–1280; respeta permisos |
| 13 | I8 | Dashboard (densidad, jerarquía) | I3, I4, I6 | Con piezas ya estables | Medio | Línea base vs después |
| 14 | I9 | Integraciones en «Sistema» (solo existentes) | I1, I5 | Continuidad sin promesas | Medio | Estados reales por herramienta |
| 15 | I10 | Aplicar el sistema a los 24 módulos existentes (oleadas) | I3–I9 | Una sola experiencia | Variable | Checklist por módulo |
| 16 | V1 | **Validación integral** (dispositivos reales, accesibilidad, regresión, rendimiento) | I10 | Cierra el ciclo | — | Reporte por dispositivo; R1–R5 evaluados |
| 17 | V2 | **Documentación del sistema consolidado** | V1 | Para que sobreviva al equipo | — | `DESIGN.md`, wiki y Storybook al día |
| 18 | **Después** | **Sistemas por industria** (restaurante, gimnasio, turismo…) como proyecto independiente | V2 | No depende de nada anterior ni lo bloquea | — | Fuera de alcance |

Puntos de sincronización: **I3** acuerda el contrato de fila (roles de columna); **I9** acuerda estados de conexión; **cualquier renombrado** exige B2.

**Equivalencia con tu orden:** 1→B0, 2→B1, 3→B2, 4→B3, 5→B4, 6→I1–I9, 7→I10, 8→V1, 9→V2, 10→fila final.

---

## 11. Riesgos

| Riesgo | Mitigación | Principio |
|---|---|---|
| Rediseño sin aprobación por bloques | B0–B4 son documentales y se aprueban antes de código | D5 |
| Prometer lo que no existe | Etiquetas y revisión de textos | P3, B5 |
| Renombrar y desorientar | Glosario aprobado primero | P6, S5 |
| Mezclar migraciones y regresiones | Una PR por objetivo con capturas antes/después | S3 |
| Crear componentes sin uso real | Regla de dos usos | D5 |
| Probar solo en emulación | V1 en dispositivos | D8, B5 |
| Que el sistema se pliegue al primer rubro | El contrato §6 es genérico y no hay flujos de industria | D2, P1 |

## 12. Límites
- Hechos de código = lectura de archivos y esquemas; no ejecuté la aplicación.
- Competidores: documentación pública vía buscador; Siigo y Holded sin fuente primaria.
- Medidas de pruebas (224/224, 376 verdes) son del reporte, no reejecutadas.
- «[Y]» marca lo que supongo y debe confirmarse antes de decidir.
