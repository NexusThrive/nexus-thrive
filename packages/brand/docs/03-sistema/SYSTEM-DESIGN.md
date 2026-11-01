# SYSTEM DESIGN de Nexus · borrador de trabajo

> **Borrador de trabajo** (vive en `packages/brand/docs/03-sistema/`). Sirve para estructurar el System Design antes de repartirlo. No sustituye a
> [`DESIGN.md`](DESIGN.md) (tokens y componentes vigentes) ni a [`PRODUCT.md`](../02-producto/PRODUCT.md) (principios de producto).
> Cuando madure, su contenido se reparte en las carpetas de `packages/brand/docs/` y en la wiki, y este borrador se retira.
>
> Reglas de partida: **la marca NEXUS no se cambia** (nombre, negro y oro, tipografías); todo lo marcado como *propuesta*
> se valida contra usuarios y funcionalidades reales antes de volverse regla.

Estado: borrador 1 · 2026-11-01 · **fase B hecha**: inventario medido en [`inventario-patrones.md`](inventario-patrones.md). Sin decisiones de diseño tomadas todavía.

---

## 0. Cómo usar este documento

| Parte | Para qué | Estado |
|---|---|---|
| §1 Experiencia | Qué representa Nexus y qué debe sentir la persona | Propuesta |
| §2 Cuatro propósitos | Qué resolver antes de diseñar | Propuesta, con respuestas iniciales |
| §3 Principios | Criterios para evaluar decisiones | Propuesta (7) frente a los 7 de `PRODUCT.md` |
| §4 System Design | Inventario, mapa de patrones, escala y estados | Por construir |
| §5 Línea base | Lo que ya existe en el repositorio | Medido |
| §6 Plan | Fases, entregables y criterios | Propuesta |
| §7 Decisiones abiertas | Lo que hay que resolver antes de avanzar | Abierto |
| §9 Inventario del diseño en el repositorio | Todo lo que hoy tiene que ver con diseño, dónde está y cuánto pesa | Medido |
| §10 Un solo lugar: `packages/brand` | Estructura destino propuesta y decisiones para moverlo | Propuesta |

---

## 1. Qué experiencia representa Nexus

> **NEXUS · Sistema operativo para negocios.** *Tu negocio. Un solo sistema.*
>
> Un sistema que conecta las áreas de un negocio, organiza su información y facilita que las personas sepan **qué hacer,
> cómo hacerlo y qué está pasando**.

### Pregunta fundamental

**¿Qué debe sentir una persona cuando utiliza Nexus?** No solo «que se vea bien»:

| Sensación | Qué significa en el producto | Señal de que falla |
|---|---|---|
| **Control** | Sabe qué ocurre en su negocio ahora | Tiene que preguntar a otra persona o abrir otra herramienta |
| **Claridad** | Entiende dónde está y qué puede hacer | Dos botones parecidos, un icono sin nombre, un término técnico |
| **Confianza** | Los datos y las acciones son comprensibles | No sabe si se guardó, si se cobró dos veces o quién lo anuló |
| **Progreso** | Percibe que organiza y mejora su negocio | Un tablero vacío o igual todos los días |
| **Continuidad** | No salta entre herramientas desconectadas | Copia datos de una pantalla a otra |

---

## 2. Los cuatro propósitos

| Propósito | Qué debemos resolver | Respuesta inicial (a validar) |
|---|---|---|
| **Encontrar el propósito** | ¿Qué debe conseguir una persona con Nexus? | Operar el día (vender, cobrar, agendar, controlar caja e inventario), ver cómo va el negocio y hacerse visible, sin saber de contabilidad. Fuente: `PRODUCT.md` |
| **Buscar puntos comunes** | ¿Qué patrones necesitan todos los negocios? | Clientes, productos/servicios, ventas y cobros, agenda, caja, equipo y permisos; cambia el **vocabulario y los módulos por rubro**, no el gesto. Fuente: capacidades y `vertical-terms` |
| **Entender a los usuarios** | ¿Qué necesitan, qué les cuesta, cómo trabajan? | Cuatro perfiles ya descritos: dueña/o de pyme (celular, no contable), cajero/staff (rapidez, teclado), administrador (configura una vez), equipo Nexus (prioridades). **Falta investigación propia** (§7) |
| **Definir principios** | ¿Qué decisiones se mantienen en todo el producto? | §3 |

---

## 3. Principios de diseño (propuesta)

Son criterios para **evaluar decisiones**, no adornos. Cada uno lleva su pregunta de prueba.

| # | Principio | Qué significa | Pregunta de prueba |
|---|---|---|---|
| 01 | **Claridad antes que complejidad** | Mostrar lo necesario para decidir, sin saturar | ¿Qué decisión permite tomar cada elemento de esta pantalla? |
| 02 | **Consistencia en todo el sistema** | Una acción, un patrón y un lenguaje entre módulos | ¿Esto se hace igual que en los demás módulos? |
| 03 | **El contexto determina la experiencia** | La interfaz se adapta al rubro, al tipo de negocio y al rol | ¿Un gimnasio y una constructora ven lo suyo, sin menús que no usan? |
| 04 | **Progreso visible y honesto** | Qué está completo, qué falta y qué resultado hay | ¿La barra o la cifra es real, o decora? |
| 05 | **Acciones con propósito** | Cada botón, formulario o indicador resuelve una necesidad | Si lo quitamos, ¿alguien lo echaría de menos? |
| 06 | **Complejidad progresiva** | Lo esencial primero; lo avanzado cuando se necesita | ¿Una persona nueva puede completar la tarea sin ver opciones avanzadas? |
| 07 | **Accesibilidad y confianza** | Estados claros, navegación accesible, control del usuario | ¿Se puede hacer con teclado, con una mano y sin color? ¿Se puede deshacer o ver el rastro? |
| 08 | **Mobile as a First-Class Experience** | Una sola plataforma adaptada a cada contexto: escritorio para productividad y densidad, tablet para operación flexible, móvil para rapidez y ejecución. El comportamiento cambia, no solo el tamaño | ¿La tarea esencial se completa en móvil, con objetivos táctiles cómodos, sin scroll horizontal de página y con estados claros? (criterios R1–R5 de [`decisiones-nexus-design-system.md` §4](decisiones-nexus-design-system.md#4-principio-transversal-mobile-as-a-first-class-experience)) |

**Ejemplo de uso:** un dashboard con 15 tarjetas que no ayudan a tomar ninguna decisión **no** es mejor por tener más
información (principios 01 y 05).

### Relación con los principios que ya rigen (`PRODUCT.md`)

| Principio propuesto | Ya cubierto por | Brecha |
|---|---|---|
| 01 Claridad | «Datos reales o nada» (3), «Español claro y corto» (6) | Falta una regla de **densidad** (cuántos elementos por pantalla) |
| 02 Consistencia | «El mismo gesto para lo mismo» (4), `interaction-patterns.md` | Cubierto; falta medirlo |
| 03 Contexto | «Se adapta al rubro» (1) | Falta incluir **rol** y tipo de negocio, no solo rubro |
| 04 Progreso | `WelcomeChecklist` («Primeros pasos») | No hay principio escrito ni patrón para progreso en otros flujos |
| 05 Acciones con propósito | «Lo que no está listo no aparece» (3) | Falta criterio para **retirar** elementos existentes |
| 06 Complejidad progresiva | — | **Sin cubrir**: no existe regla escrita |
| 07 Accesibilidad y confianza | «Accesible y usable con una mano» (7), «El dinero no se equivoca» (5) | Cubierto; «confianza» se limita hoy al dinero |
| 08 Mobile as a First-Class Experience | «Accesible y usable con una mano» (7), `CLAUDE.md`: «nacer responsive» y probar en 375 y 1280 px | Parcial: falta tablet, tamaños de referencia coherentes (375 frente a 412), patrón móvil de tablas y criterios verificables |

---

## 4. El System Design

El sistema se estudia como **un lenguaje completo**, no como colores, bordes e iconos sueltos.

### 4.1 Inventario de patrones

**A. Patrones funcionales** (resuelven tareas e interacciones). Columna «hoy» = lo que ya existe en el repositorio.

| Patrón | Hoy | Estado del inventario |
|---|---|---|
| Formularios y validaciones | `Field`, `FormDialog`/`FormDrawer`, `focusFirstInvalid` | Por documentar casos |
| Creación y edición de registros | `ResponsiveSheet`, mini-modal de creación (`QuickCreateProvider`) | Por documentar |
| Tablas, filtros y búsquedas | `DataTable`, `FilterSelect`, `SearchField`, `CommandPalette` | Por documentar |
| Navegación y selección de módulos | `TenantShell`, `AppSidebar`, `MobileTabBar`, `SectionNav`, `TabNav`, `BusinessSwitcher` | Por documentar |
| Modales y paneles laterales | `ResponsiveSheet` (única vía) | Regla vigente |
| Confirmaciones y acciones destructivas | `ConfirmDialog`, `useConfirm()` | Regla vigente |
| Flujos de aprobación | No hay patrón común (p. ej. presupuesto de obra, anular venta) | **Brecha** |
| Estados de carga y guardado | `LoadingState`, `SkeletonRows`, `PageSkeleton`, `busy` | Regla vigente |
| Importación y exportación | Módulo `data-exchange`; sin patrón de UI compartido | **Brecha** |
| Notificaciones y alertas | `useToast()`, `Alert`, `NotificationCenter` | Por documentar |
| Permisos y restricciones | `can()`, `StaffAccessNotice`, `notFound()` | Por documentar la **presentación** |

**B. Patrones perceptivos** (cómo se interpreta visualmente).

| Patrón | Hoy | Estado |
|---|---|---|
| Jerarquía visual | `PageHeader`, tipografías de marca | Por documentar |
| Tipografía | `DESIGN.md` §1 (fuentes de marca) | Vigente |
| Espaciado y densidad | Tokens de espacio (`DESIGN.md` §2) | Falta **densidad** como decisión |
| Colores y contrastes | Tokens semánticos; WCAG 2.2 AA | Vigente |
| Iconografía | `IconTile`, iconos por rubro (`vertical-icons`) | Sin guía de uso |
| Bordes, superficies y elevaciones | Tokens de elevación y capas (sin `z-index` numérico) | Vigente |
| Indicadores de estado | `Badge`, `Chip`, `Delta`, `ProgressBar` | Sin catálogo de significados |
| Gráficos y visualizaciones | `components/molecules/charts`, `Sparkline`, `KpiCard` | Sin guía de cuándo usar cuál |
| Movimiento y transiciones | `docs/design/movimiento.md` (un dueño por transición) | Vigente |
| Composición de páginas | `TenantShell`, `PageSkeleton`, `CustomizableDashboard` | Por documentar |

> Ambos grupos trabajan juntos: un formulario visualmente excelente que no comunica bien un error es un mal componente.

### 4.2 Mapa de patrones (ficha por patrón)

Cada patrón se documenta con la misma ficha:

| Campo | Pregunta |
|---|---|
| **Necesidad** | ¿Qué problema tiene la persona? |
| **Meta** | ¿Qué quiere conseguir? |
| **Motivación** | ¿Por qué necesita hacerlo? |
| **Contexto** | ¿En qué módulo y situación aparece? |
| **Solución** | ¿Qué patrón y qué componentes usamos? |
| **Valor funcional** | ¿Qué le permite hacer? |
| **Estados** | ¿Cómo responde en cada situación (§4.4)? |
| **Accesibilidad** | ¿Puede usarlo cualquier persona? |

**Ejemplo: estado vacío de clientes**

| Campo | Contenido |
|---|---|
| Necesidad | El negocio todavía no tiene clientes registrados |
| Meta | Empezar a construir su base de clientes |
| Motivación | Organizar contactos y gestionar relaciones |
| Contexto | Módulo Clientes, primera visita; cualquier rubro (el término cambia: socio, visitante, cliente) |
| Solución | `EmptyState`: explica el valor de registrar clientes y ofrece **una** acción principal («Crear cliente») y una secundaria («Importar lista») |
| Valor funcional | Crear el primer cliente o importar una lista |
| Estados | Vacío → creando (`FormDialog` con `busy`) → guardado (toast + el registro aparece) → con datos; actualiza el progreso de «Primeros pasos» |
| Accesibilidad | Acción principal alcanzable con teclado, nombre accesible, mensaje sin depender del icono |

### 4.3 Escala de patrones y componentes

Un cambio en un nivel bajo debe propagarse a todo lo que lo usa.

| Nivel | Elementos | Dónde vive hoy | Brecha |
|---|---|---|---|
| 1. Fundamentos | Colores, tipografía, espaciado, iconos, radios | `packages/brand/css` (`tokens.css`, `theme-v4.css`, `base.css`) | Iconografía sin tokens propios |
| 2. Primitivos | Botones, inputs, etiquetas, tooltips | `components/atoms` (32) | Cubierto |
| 3. Componentes | Selectores, tarjetas, tablas, diálogos | `components/molecules` (52) y `components/organisms` (46) | Hay mezcla de niveles 3 y 4 en `organisms` |
| 4. Patrones | Formularios completos, filtros, estados vacíos | Repartido: `FormDialog`, `EmptyState`, `FilterSelect`… | **No existe como nivel propio**: los patrones viven como componentes sueltos y como convenciones en `interaction-patterns.md` |
| 5. Templates | Dashboard, listado de clientes, finanzas | `components/templates` (6) y `app/**/_components` | Los templates de listado y de ficha no están formalizados |
| 6. Experiencias | Onboarding, gestión de ventas, operación de restaurantes | `components/organisms/onboarding`, `WelcomeChecklist`; el resto en `app/` | No hay definición de «experiencia» ni criterio de calidad por flujo |

Estructura actual del repositorio frente a esta escala: *tokens → atoms → molecules → organisms → templates → app/_components*.
La propuesta **añade** los niveles 4 (patrones) y 6 (experiencias) como documentación y criterios, sin renombrar carpetas.

### 4.4 Estados de interfaz

Un sistema empresarial no puede mostrar solo su estado ideal. Cada componente y cada pantalla considera, según corresponda:

| Estado | Cómo se resuelve hoy | Brecha |
|---|---|---|
| Inicial | Valores por defecto del formulario | Sin criterio escrito |
| Cargando | `LoadingState`, `SkeletonRows`, `PageSkeleton`, `loading.tsx` | Cubierto |
| Vacío | `EmptyState` | Cubierto; falta guía de redacción por módulo |
| Con datos | La pantalla | — |
| Error | `Alert` con salida; `FormDialog` conserva lo escrito | Cubierto |
| Sin conexión | `NetworkBanner`, política de caché en `pwa.md` | Parcial: no hay comportamiento definido por acción |
| Guardando | `busy` en `ResponsiveSheet` bloquea el cierre | Falta estado en acciones fuera de formularios |
| Guardado | `useToast()` | Cubierto; falta definir **qué puede hacer después** |
| Deshabilitado | Atributo `disabled` | Sin guía de **explicar por qué** está deshabilitado |
| Sin permisos | `notFound()` o aviso (`StaffAccessNotice`) | Dos tratamientos distintos sin criterio de cuándo cada uno |
| Parcialmente completado | `WelcomeChecklist`, `ProgressBar`, `StepIndicator` | Sin patrón para registros incompletos |

**Ejemplo: registrar un gasto.** Nexus debe comunicar qué está pasando (guardando), si se guardó (confirmación con el importe y
la fecha), y qué puede hacer después (ver el movimiento, registrar otro, deshacer/anular). Hoy el toast confirma, pero «qué
sigue» no está definido como regla.

Regla vigente que ya cubre parte de esto (`CLAUDE.md`): toda pantalla nueva define **carga, error, éxito y vacío**, y sin permiso
muestra `notFound()` o un aviso, nunca datos.

---

## 5. Línea base: lo que ya existe

| Elemento | Cantidad / dónde |
|---|---|
| Componentes compartidos | 136: átomos 32, moléculas 52, organismos 46, plantillas 6 |
| Historias de Storybook | 145 (átomos 31, moléculas 43, organismos 36, plantillas 4, más historias de `app/`) |
| Documentos de diseño | `DESIGN.md`, `PRODUCT.md`, `docs/design/` (accesibilidad, patrones de interacción, movimiento, PWA, lista de calidad, dos auditorías) |
| Reglas que se prueban | `tests/architecture/ui-rules.test.ts` (p. ej. `<select>` nativo prohibido) |
| Accesibilidad automatizada | Playwright + axe (`pnpm test:e2e`), 35 especificaciones en `e2e/` |
| Lista de calidad de PR | `docs/design/quality-checklist.md` |

**Lectura:** el sistema ya tiene **fundamentos, primitivos y componentes** sólidos y una capa de interacción obligatoria. Lo que
falta es lo que propone este documento: **patrones como nivel propio, estados completos, principios evaluables, definición de
experiencias y datos de usuarios**.

---

## 6. Plan de trabajo (propuesta)

| Fase | Objetivo | Entregable | Criterio de salida |
|---|---|---|---|
| **A. Principios** | Validar los 7 principios y reconciliarlos con `PRODUCT.md` | §3 cerrado y una lista corta de «cómo se evalúa» | Aprobados por producto |
| **B. Inventario** (hecha) | Listar patrones reales usados hoy en `app/` (no solo componentes) | [`inventario-patrones.md`](inventario-patrones.md) y `pnpm design:inventory` | Cumplido: cifras medidas, hallazgos priorizados y propuesta de estructura de Storybook |
| **C. Fichas** | Documentar los patrones prioritarios con la ficha de §4.2 | 8–12 fichas (formulario, estado vacío, tabla con filtros, confirmación destructiva, creación rápida, progreso…) | Una persona nueva puede implementar el patrón solo con la ficha |
| **D. Estados** | Matriz de estados por componente y por pantalla | §4.4 con brechas cerradas o decididas | Los 11 estados tienen tratamiento o excepción explícita |
| **E. Escala** | Formalizar el nivel 4 (patrones) y el 6 (experiencias) | Sección en `DESIGN.md` y `docs/design/` | Definidos sin renombrar carpetas |
| **F. Experiencias** | Elegir 2–3 flujos y evaluarlos con los principios | Informe por flujo (onboarding, vender/cobrar, restaurante) | Brechas priorizadas |
| **H. Auditoría responsive y patrones adaptativos** | Auditar dashboard, navegación, tablas, formularios, modales y módulos empresariales en móvil pequeño, móvil estándar, tablet y escritorio; definir el patrón adaptativo de cada elemento | Informe con capturas y fichas de patrón con variante móvil | Brechas priorizadas por criterio R1–R5; pilotos: dashboard y restaurantes |
| **G. Integración** | Repartir el contenido final y retirar este archivo | Páginas en `docs/design/` y en la wiki; pruebas de regla donde se pueda | Este archivo eliminado |

Cada fase termina con **evidencia** (documento + ejemplo real + prueba o historia cuando aplique), en línea con la regla de
no dar nada por terminado sin ella.

---

## 7. Decisiones abiertas

| # | Pregunta | Por qué importa |
|---|---|---|
| 1 | ¿Los 7 principios son definitivos o se contrastan primero con usuarios reales? | Evitar reglas que nadie puede defender |
| 2 | ¿Hay datos de uso o entrevistas con dueñas/os, cajeros y administradores? ¿Quién los consigue? | Hoy los perfiles salen de `PRODUCT.md`, no de investigación |
| 3 | ¿«Rol» entra como eje de contexto junto al rubro (principio 03)? | Cambia cómo se diseñan menús y dashboards |
| 4 | ¿Dónde vive la **densidad** (compacta/cómoda) y quién la decide: producto, rubro o persona? | Hoy no hay decisión escrita |
| 5 | ¿Se formaliza el nivel «Patrones» como carpeta de código o solo como documentación? | Propuesta: solo documentación por ahora |
| 6 | ¿Qué flujos son las 2–3 «experiencias» piloto? | Propuesta: onboarding, vender/cobrar y la primera historia de restaurantes |
| 7 | ¿Dónde se documenta el catálogo de significados de color/estado (`Badge`, `Chip`, `Delta`)? | Evita que dos módulos usen el mismo color con significados distintos |
| 8 | ¿Se define un estándar para **explicar un control deshabilitado**? | Es un hueco real de claridad y accesibilidad |

---

## 8. Cómo evaluar una pantalla (borrador de lista rápida)

Antes de aprobar una pantalla nueva o cambiada, responder sí/no:

- [ ] ¿Cada elemento ayuda a tomar una decisión o completar una tarea? *(01, 05)*
- [ ] ¿Usa los patrones y componentes compartidos, sin recrearlos? *(02)*
- [ ] ¿Habla el idioma del rubro y respeta el rol de quien la ve? *(03)*
- [ ] ¿Muestra el progreso real y lo que falta, sin cifras inventadas? *(04)*
- [ ] ¿Una persona nueva completa la tarea sin tocar lo avanzado? *(06)*
- [ ] ¿Están resueltos los estados que apliquen: cargando, vacío, error, guardando, guardado, sin conexión, sin permiso? *(07, §4.4)*
- [ ] ¿Se opera con teclado, con una mano y sin depender del color? *(07)*

Complementa a [`docs/design/quality-checklist.md`](../05-calidad/quality-checklist.md), que sigue siendo la lista obligatoria del PR.

---

## 9. Inventario: todo lo de diseño que hay hoy en el repositorio

Medido el 2026-11-01. «Brand» es el paquete `packages/brand` (`@nexus/brand`): hoy ya guarda tokens, CSS base, fuentes, preset de
Tailwind y el logo, pero **la documentación y los componentes viven repartidos fuera de él**.

### A. Documentación de diseño

| Qué | Dónde está hoy | Tamaño | Citado por |
|---|---|---|---|
| Sistema de diseño vigente (marca, tokens, componentes, movimiento, layout) | `DESIGN.md` (raíz) | 18 KB | 33 documentos, `CLAUDE.md`, `ui-rules.test.ts` |
| Principios de producto y perfiles | `PRODUCT.md` (raíz) | 3,6 KB | 13 documentos |
| Rediseño de NEXUS | `REDISENO-NEXUS.md` (raíz) | 38 KB | 2 documentos |
| Este borrador | `SYSTEM-DESIGN.md` (raíz, temporal) | 18 KB | — |
| Patrones de interacción, accesibilidad, movimiento, PWA, lista de calidad | `docs/design/*.md` (5) | — | 26 documentos |
| Auditorías de diseño y UX (oct 2026) | `docs/design/auditoria-*.md` (2) | — | — |
| Capturas de las auditorías | `docs/design/capturas/` (176 imágenes) | 7,3 MB | las auditorías |
| Libro de marca y guía de tono | `docs/brand/*.md` (2) | — | 5 documentos |
| Marketing (contenidos, SEO, ventas, medición, experimentos) | `docs/marketing/*.md` (5) | — | 1 documento |
| Documentación de Storybook (introducción, colores, tipografía, espacio, movimiento, patrones, capas, accesibilidad, inventario) | `components/docs/*.mdx` (9) | — | `.storybook/main.ts` |
| Léame del paquete y prompt de marca | `packages/brand/README.md`, `PROMPT.md` | 26 KB el prompt | — |
| Diseño de PrettyModal (histórico) | `docs/internal/historico/superpowers/` | — | `responsive-sheet.tsx` (comentario) |

### B. Tokens, estilos y activos

| Qué | Dónde está hoy |
|---|---|
| Tokens, tema, base, 404 | `packages/brand/css/` (4), `packages/brand/tokens/tokens.json`, `packages/brand/tailwind/preset.ts` |
| Fuentes | `packages/brand/fonts/` **y** `app/fonts/` (copia de las dos Public Stunt, 300 KB: duplicado) |
| Logo y marca de la N | `packages/brand/src/` (`BrandLogo.tsx`, `NEXUS_THRIVE.svg`) |
| Maquetas y referencias HTML | `packages/brand/designs/` (4), `packages/brand/reference/` (2) |
| Estilos globales de la app | `app/globals.css`, `app/styles/forms.css`, `app/styles/motion.css` |
| CSS de componentes | 8 `*.module.css` en `components/` |
| Iconos de la app | `app/icon.svg`, `public/icons/` (4 PNG; 3 sin referencias) |

### C. Componentes y comportamiento (código)

| Qué | Dónde está hoy | Tamaño |
|---|---|---|
| Átomos, moléculas, organismos, plantillas | `components/{atoms,molecules,organisms,templates}` | 32 + 52 + 46 + 6 |
| Laboratorio y proveedores | `components/labs`, `components/providers` | — |
| Historias de Storybook | junto a cada componente y en `app/**` | 145 |
| Movimiento, navegación y dashboard como lógica de experiencia | `lib/experience/{motion,navigation,dashboard,...}` | — |
| **Quién los usa** | **372 archivos** importan `@/components/…` (1 169 líneas) | — |

### D. Verificación y equipo

| Qué | Dónde está hoy |
|---|---|
| Reglas de diseño que se prueban | `tests/architecture/ui-rules.test.ts` |
| Accesibilidad automatizada | `e2e/a11y.spec.ts` (+ 34 especificaciones más), `playwright.config.ts` |
| Storybook | `.storybook/` (configuración y 26 mocks) |
| Equipo de diseño (agentes) | `plugins/product-team/agents/`: `brand-designer`, `brand-strategist`, `brand-consistency-reviewer`, `design-systems-lead`, `frontend-design-engineer`, `head-of-product-design`, `senior-product-designer`, `ux-researcher` |

**Lectura:** el diseño operativo está en **cuatro sitios sin criterio** (raíz, `docs/design`, `docs/brand`, `components/docs`) más el
paquete de marca, y hay un duplicado (fuentes). Los componentes son **código con 372 consumidores**.

---

## 10. Un solo lugar: `packages/brand` (aplicado el 2026-11-01)

### Estructura destino (aplicada)

```
packages/brand/                  ← único lugar del diseño operativo de Nexus
├── README.md                    ← índice maestro: qué hay, dónde, y mapa hacia components/
├── docs/
│   ├── 01-marca/                brand-book, guía de tono, logo, fuentes, prompt de marca
│   ├── 02-producto/             PRODUCT.md (principios y perfiles)
│   ├── 03-sistema/              DESIGN.md, SYSTEM-DESIGN.md (este borrador madurado), tokens, escala
│   ├── 04-patrones/             interaction-patterns, accesibilidad, movimiento, PWA, estados
│   ├── 05-calidad/              quality-checklist, cómo evaluar una pantalla
│   ├── 06-auditorias/           auditorías, REDISENO-NEXUS, capturas/
│   ├── 07-marketing/            estrategia, SEO, ventas, medición, experimentos
│   └── storybook/               los 9 .mdx de Storybook (configuración apuntada aquí)
├── css/  tokens/  tailwind/  fonts/  src/     ← ya existen, sin cambios
├── designs/  reference/                        ← ya existen, sin cambios
└── assets/                                     ← iconos de la app (candidato)
```

El código de los componentes **no se muda** (ver decisión 1); `packages/brand/README.md` lo mapea.

### Decisiones para poder mover

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| 1 | **Componentes (`components/`)** | (a) quedan donde están y el brand los *indexa*; (b) se mudan a `packages/brand` | **(a)**. (b) obliga a reescribir 1 169 imports en 372 archivos y a tocar Storybook, tsconfig y `ui-rules.test.ts` para un beneficio de organización; se puede reconsiderar si más adelante se publica el paquete |
| 2 | **`DESIGN.md` y `PRODUCT.md` en la raíz** | (a) se mudan y se actualizan las 46 citas, `CLAUDE.md` y la plantilla de PR; (b) la raíz conserva un archivo corto que apunta al brand | **(a)** para tener una sola fuente; `CLAUDE.md` pasa a apuntar a `packages/brand/docs/03-sistema/DESIGN.md` |
| 3 | **`PRODUCT.md`** | Dentro del brand (`02-producto`) o se queda en la raíz como documento de producto | Dentro del brand: de él salen los principios y los perfiles que alimentan el diseño |
| 4 | **Documentación de Storybook (`components/docs/*.mdx`)** | Quedan, o se mudan y se cambia una línea de `.storybook/main.ts` | Se mudan: es documentación, no código de componente |
| 5 | **`docs/marketing`** | Dentro del brand (07) o fuera | Dentro (se decidió mantenerlo junto a marca y diseño) |
| 6 | **Duplicado de fuentes (`app/fonts` vs `packages/brand/fonts`)** | Dejarlo / unificarlo | Tarea aparte: se revisa cómo las carga la app antes de tocarlo |
| 7 | **Iconos de la app (`app/icon.svg`, `public/icons`)** | Quedan (los exige Next/PWA en esas rutas) o se copian a `assets/` | Quedan: Next y el service worker leen esas rutas; el brand solo los documenta |
| 8 | **Wiki** | Añadir una entrada «Diseño» a `docs/wiki/Home` que apunte al brand | Sí, un enlace; no se duplica el contenido |

### Cómo se haría (cuando se decida)

1. Rama nueva desde `main` (no desde esta rama) y un PR único de **solo documentación**, con `git mv` para conservar el historial.
2. Reescritura de los enlaces con el mismo método de la wiki (resuelve cada destino y falla si algo no existe).
3. Actualizar `CLAUDE.md`, `.github/pull_request_template.md`, `ui-rules.test.ts`, `.storybook/main.ts` y las citas en `docs/wiki`.
4. Prueba de arquitectura: ningún `.md` de diseño fuera de `packages/brand/docs/` (salvo los enlazados), y todos los enlaces resuelven.
5. Verificación completa (`pnpm verify`, `pnpm build-storybook`) y CI de GitHub antes de fusionar.
6. **Sin tocar** los tokens, componentes ni estilos: solo se reubican documentos y se indexan.
