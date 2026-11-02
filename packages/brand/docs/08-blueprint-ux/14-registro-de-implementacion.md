# 14 · Registro de implementación

[← Índice](README.md) · Qué se implementó tras aprobar el glosario (2026-11-01), con qué autorización, qué falta y qué se decidió en el camino.

**Autorización recibida:** «Aprobado el glosario, continúa con la Fase 2; aplica cada fase sin mi aprobación y déjala lista al final, corriendo Storybook y el sistema». **No** incluye push, PR, fusión ni despliegue, y no se tocaron `main` ni las ramas y PR existentes.
**Dónde está el código:** carpeta normal `nexus-thrive`, rama local `feature/HU-sistema-experiencia-01`, creada desde `ef7c749` (la punta de la pila #141–#143). Se trabajó primero en un worktree y se trasladó aquí; el worktree se retiró. **Sin commits** ni push. El repositorio principal (`chore/HU-corregir-p1-responsive-01`) y el servidor del puerto 3001 no se tocaron.

> **Estado de las decisiones implementadas:** quedan como **Implementada, pendiente de ratificar**. Se aplicaron bajo la autorización general anterior; no cambian su etiqueta A/D/N en `01` hasta que las ratifiques. Las decisiones de este registro (§4) las tomé yo para poder avanzar y están listadas para que las confirmes o revoques.

## 1. Fases implementadas

| Fase | Decisiones | Qué se hizo | Estado |
|---|---|---|---|
| **I1 · Estados de ruta** | DR-09 | `ErrorState` (con historias y axe); `error.tsx` en la raíz, `global-error.tsx`, `/(app)` (cubre las 38 páginas del negocio por herencia) y `/admin`; `not-found` dentro del shell del negocio; `loading.tsx` en `checkin`, `presence`, `tickets` | **Completa** salvo historias «Sin conexión» y «Guardando» |
| **I2 · Tokens y deuda tipográfica** | DR-02 | `text-2xs` (11 px) y `text-ui` (13 px) en `tokens.css` y `theme-v4.css`; prueba `type-scale-freeze` con línea base de 736 usos en 199 archivos (la deuda solo puede bajar) | **Completa**; **no se migraron** los 736 usos (decisión 1.5) |
| **I3 · Tabla/lista adaptable** | DR-08 | `AdaptiveTable` (tabla en contenedor ancho, lista en angosto; una sola representación en el DOM; roles de columna), con 5 historias y prueba en 11 viewports; **pilotos:** `stock` (existencias y reposición) y `contabilidad` (plan de cuentas) | **Parcial**: ver §3 |
| **I4 · Shell y tablet** | DR-13, 14, 15, 19, 20 | Barra lateral expandida desde 1024 px (sidebar, barra superior y layout); riel de tablet de 88 px con etiqueta abreviada visible; etiquetas de grupo a 11 px; 44 px en táctil (`--control-h` y controles de contenido); atajo `Ctrl K` oculto con puntero táctil; viewports 744 y 1024 añadidos; retiradas las marcas `test.fail` P2-3, P2-4 y P2-5 | **Completa** |
| **I5 · Lenguaje** | DR-24, 25, 28 | Se aplicó solo lo ya revisado: ver §2 | **Parcial** |
| **I6 · Roles y «sin permiso»** | DR-10, 34, 46 | `PermissionNotice` y mensaje derivado de la matriz (13 páginas); el Inicio y las notificaciones **no muestran dinero a roles sin permiso** (H-15 confirmada y corregida) | **Parcial** |
| **I7 · Actividad** | DR-40 | Severidad en notificaciones (`info`/`action`/`urgent`) con texto visible en la lista de la campana | **Parcial** |
| **I8 · Dashboard** | DR-38 | Solo el filtro por permiso de dinero (I6) | **Mínima** |
| **I9 · Integraciones** | DR-18, DR-47 | Pantalla «Integraciones» en «Sistema» y ficha `ConnectionCard` (con 5 historias) que usa el estado real de `ExternalConnection` | **Completa** para lo que existe |
| **I10 · Oleadas** | DR-45 | Pilotos de I3 y aplicación del aviso de permiso a 13 módulos | **Parcial** |

## 2. Cambios de lenguaje aplicados (glosario aprobado)

| Antes | Después | Dónde | Motivo |
|---|---|---|---|
| Menú **«Pagos»** (abría la pestaña de cobros) | **«Cobros»** | Registro de capacidades (solo la etiqueta del menú) | La pantalla ya se llama «Cobros» en su pestaña; DR-25 |
| «Suma de los **pagos aprobados**…» | «Suma de los **cobros confirmados**…» | Ayuda del indicador Ingresos y sus historias | DR-25 |
| «**Pago recibido** · $X» | «**Cobro registrado** · $X» | Notificaciones, actividad reciente, búsqueda, hoja de cobro, pruebas | DR-25 |
| «**Ajustes**» | «**Configuración**» | Título del módulo, etiqueta de secciones, onboarding, presencia, API | Un solo nombre (glosario §3.1) |
| Avisos de rol escritos a mano (13 páginas) | Texto derivado de la matriz: «No puedes {acción}. {Roles} pueden hacerlo. Pídeselo a quien administre tu negocio.» | `PermissionNotice` | DR-34 |

**No se cambió** (se conserva a propósito): los nombres comerciales de las capacidades (`label`/`name` de «Pagos» en planes), los identificadores y rutas (`/payments`), «bitácora» (aún no se aprobó «Historial» como reemplazo en la interfaz), los verbos de botón (no hay problema medido) ni los estados de `Badge`.

## 3. Lo que no se hizo (límites reales)

| Pendiente | Por qué |
|---|---|
| Migrar `count-sheet` (stock: cuadrícula editable dentro de una hoja) y las líneas de asiento (mini-tabla dentro de cada tarjeta) | Son cuadrículas editables o incrustadas, no listados; se documentan como excepción. **Sí se migraron** los 4 informes contables (con pie de totales) y el plan de cuentas: `contabilidad` 5 de 6 tablas, `stock` 2 de 3 |
| Migrar los 736 usos de `text-[Npx]` | Decisión 1.5: migración asistida y revisada por módulo |
| Migrar `buttonVariants` → `<Button>` (DR-07), PD-01 y PD-02 | Están pendientes de decisión |
| Filtrar el menú por rol (PD-11) | Exige un permiso por ítem del registro |
| Centro de actividad unificado y búsqueda de registros (DR-22, DR-41, DR-21 nivel 2) | Falta alcance aprobado (PD-06) y la búsqueda de registros exige trabajo de servidor |
| Pie de totales, estados de `Badge` con icono (DR-27), historias «Sin conexión» y «Guardando» | No se alcanzó |
| Prueba con dispositivos reales, lectores de pantalla, contraste renderizado | Limitación estructural (DR-30) |
| Recorrer la aplicación autenticada | La sesión requiere Clerk; solo se verificó en Storybook, pruebas y compilación |

## 4. Decisiones que tomé para avanzar (confírmalas o revócalas)

| # | Decisión | Alternativa | Dónde |
|---|---|---|---|
| X-1 | Riel de tablet de **88 px** (no 76) para que quepa «Contabilidad» en 11 px | 76 px con elipsis | `tenant-shell.module.css` |
| X-2 | Abreviaturas del riel: Punto venta, Fact. elec., Impuestos, Cobros web, Campañas, Acceso, Tienda, Datos, Google, Sitio web, Cat. APU, Integrac. | Otras del glosario §4 | `short-label.ts` |
| X-3 | Umbral de la tabla adaptable: **800 px de contenedor** por omisión (configurable) | 672 px | `adaptive-table.tsx` |
| X-4 | El menú dice **«Cobros»** (no «Pagos» ni «Cobros y pagos») porque la pantalla solo muestra cobros | Mantener «Pagos» | registro de capacidades |
| X-5 | El Inicio oculta indicadores de dinero **y sus datos** a roles sin `money.handle` (solo si el rol es conocido) | Dejarlo visible | `app/[tenant]/(app)/page.tsx` |
| X-6 | Las notificaciones de cobros y gastos no se cargan para roles sin `money.handle` | Mostrarlas | `notifications-db.ts` |
| X-7 | La ficha «Conexión» muestra «Uso manual» para WhatsApp y Datos | Ocultarlos | `integrations/page.tsx` |
| X-8 | La prueba de Playwright acepta `E2E_PORT` para no chocar con otra copia en el 6007 | Puerto fijo | `playwright.config.ts` |
| X-9 | Servidor de la app en el **3002 con `--webpack`** (Turbopack rechaza el `node_modules` enlazado del worktree) | Usar la carpeta principal | ver `13` |

## 5. Hipótesis y pendientes actualizados

| ID | Estado |
|---|---|
| H-15 | **Confirmada en el código** y corregida (X-5, X-6). Falta comprobarlo en pantalla con una cuenta Asesor real |
| H-02 | Parcial: existen `TabNav`, `SectionNav` y `UrlSegmentedControl`; no se inventarió su adopción |
| H-03, H-04, H-05, H-16, H-17 | Siguen abiertas (requieren recorrer la aplicación autenticada) |
| PD-03 | **Aprobado** (2026-11-01); sus decisiones abiertas dentro del glosario se resolvieron en §4 |
| PD-04, PD-05, PD-12 | Resueltas de facto para lo implementado (X-2, `PermissionNotice`, descripción de WhatsApp en «Integraciones»); falta ratificar |

## 6. Verificación

Medida el 2026-11-01 en el worktree, tras el último cambio (ver `13` para método y limitaciones):

| Comprobación | Resultado |
|---|---|
| `tsc --noEmit` | Sin errores |
| `eslint .` | 0 errores (31 avisos preexistentes) |
| `vitest run` (unitarias y de arquitectura) | 131 archivos pasan y 65 se omiten por diseño (integración sin base de datos); **1953 pruebas pasan** |
| `check:layers` | Sin dependencias nuevas ni ciclos nuevos |
| `next build` (Turbopack) | Compila; incluye `/[tenant]/integrations` |
| `next build --webpack` | **Falla por una importación preexistente** (`site-extras` → `growth.ts` → `node:crypto`); no es de estos cambios y el proyecto compila con Turbopack |
| Storybook `build` | Compila |
| Playwright completo (`escritorio`, `movil`, `responsive`) | **677 pasan, 38 se omiten por diseño y 1 falla de forma intermitente** (ver abajo) |
| Validador de la documentación | Sin problemas |

**Fallo intermitente:** `stock.spec.ts › reposición: marca lo que hay que pedir y valida los niveles` en `movil` agotó los 30 s en `page.evaluate(getAnimations)` dentro de la ayuda de axe, con dos trabajadores en paralelo. Aislado pasó **4 de 4** (3 en `movil`, 1 en `escritorio`). Es del mismo tipo que los 2 intermitentes de `overlays.spec.ts` ya conocidos; **no está resuelto**, solo no se reproduce en aislado.

**Cambios en pruebas existentes** (todos por el comportamiento aprobado, no para esconder fallos): se retiraron las marcas `test.fail` P2-3/P2-4/P2-5 (ya corregidos); `stock.spec` y `accounting.spec` aceptan lista o tabla según el ancho; `notifications.spec` y la prueba unitaria cambian «Pago recibido» por «Cobro registrado»; `tenant-nav.test` incluye «Integraciones»; `v10-experience.test` incluye `short-label.ts`.

### 6.1 Continuación tras el traslado a la carpeta normal

- `AdaptiveTable` ganó `footer` (fila de totales: pie en la tabla y último elemento en la lista) y los informes de contabilidad (balance de prueba, libro diario, libro mayor, auxiliar) lo usan; la prueba de informes acepta tabla o lista.
- **Intermitente resuelto:** la espera de animaciones de `expectNoAxeViolations` colgaba cuando un aviso tenía su barra de cuenta atrás pausada. Ahora ignora las animaciones pausadas y limita la espera a 3 s. `stock`/`contabilidad` en móvil pasaron **5 de 5** repeticiones (antes fallaban ~1 de 2).
- Verificación en la carpeta normal: `tsc` sin errores, `eslint` 0 errores, 1953 pruebas unitarias, `check:layers` sin cambios, **292 pruebas responsive** y las de stock y contabilidad en escritorio y móvil.
- Siguen pendientes: historias de «Sin conexión» y «Guardando» (`NetworkBanner` depende del navegador y `StaffAccessNotice` de Clerk), estados de `Badge` con icono (DR-27), PD-01, PD-02, PD-11 y los puntos de §3.

## 8. Rediseño integral (segunda tanda, en la misma rama)

Se aplicó el sistema desde los componentes compartidos hacia los módulos. **Todo está sin commit** en la carpeta normal.

| Área | Qué se hizo | Alcance |
|---|---|---|
| **Tipografía (DR-02)** | 613 usos de `text-[Npx]` (13, 13,5, 12, 12,5, 11, 10, 10,5 y 14 px) pasaron a `text-ui`, `text-xs`, `text-2xs` y `text-sm` en 189 archivos; `cn()` reconoce `2xs` y `ui` como tamaños. `text-ui` tiene interlineado de 20 px (con 18 px una lista de casillas incumplía el tamaño mínimo de objetivo en axe). La línea base de la prueba de congelación bajó de 736 a **119 usos en 73 archivos** | Todos los módulos |
| **Documentos (DR-05)** | 10 tokens `--doc-*` y 63 reemplazos de hex en el recibo, el visor de documentos, la factura y la caja | `receipt-printer`, `document-viewer`, `billing/[id]`, `cash-panel`, `balance-card` |
| **Estados (DR-27)** | `StatusDot` pasó de un cuadrado de color a un glifo (✓ éxito, × peligro, ! aviso, ● neutro, – inactivo): el estado se distingue sin color | Todos los `Badge` con estado |
| **Encabezado de página** | Título de 22 a 28 px (antes 24 a 34), descripción en 14 px, menos margen | Todas las páginas |
| **Dashboard (DR-38)** | Primeros pasos → indicadores de dinero → gráfica con clientes activos al lado → actividad y accesos rápidos → presencia → membresías. Antes la presencia ocupaba el primer lugar y el quinto indicador quedaba huérfano. Se corrigió el «p. m..» y la hora ya no se parte en dos líneas. Los tableros ya personalizados conservan su orden guardado | Página y su historia |
| **`AdaptiveTable` (DR-08)** | Cartera, impuestos, factura electrónica, crecimiento, Ficha de Google, conciliación de cobros, cobros y membresías de la ficha del cliente, listado de membresías, proyectos de obra y los 4 informes y el plan de cuentas de contabilidad; además existencias y reposición | 17 listados |
| **Glosario** | «Pagos» pasa a «Cobros» en la pestaña de la ficha del cliente y en su texto de apoyo | Ficha del cliente |
| **Marcador de plan** | `ModulePlaceholder` (Pedidos) muestra «En plan: aún no está disponible» | Pedidos |

### 8.1 Verificación de esta tanda

| Comprobación | Resultado |
|---|---|
| `tsc --noEmit` | Sin errores |
| `eslint .` | 0 errores (31 avisos preexistentes) |
| `vitest run` | 1955 pruebas pasan, 407 omitidas por diseño |
| `check:layers` | Sin cambios |
| Storybook `build` | Compila |
| Playwright completo | **678 pasan, 38 omitidas por diseño, 0 fallos** |

Las pruebas que buscaban una `<table>` (cartera, cobros, factura electrónica, Google, crecimiento, impuestos, contabilidad, stock) usan ahora los ayudantes `datos()` y `fila()` de `e2e/helpers.ts`, que aceptan tabla o lista según el ancho; es el comportamiento aprobado en DR-08.

### 8.2 Lo que **no** está hecho (no se declara completo)

| Pendiente | Motivo |
|---|---|
| Tablas sin migrar: listado de clientes (tiene selección múltiple), `count-sheet`, bancos de catálogo (`items-bank`, `activity-catalog`), vista previa de importación, intercambio de datos, detalle de orden de compra, líneas de asiento, y las del Operations Center (`/admin`) | `AdaptiveTable` aún no soporta selección ni edición; son cuadrículas editables o ajenas al espacio del negocio |
| Tablas de documentos (factura, cotización impresa, recibo) | Son documentos impresos, no listados: se mantienen |
| 15 px (72 usos), 17 px, 26 px y otros tamaños | Dependen de la condición aprobada de validar con captura (decisión 1.8) |
| API única de botón (`<Button>` frente a `buttonVariants`) y de `Input` | Siguen pendientes de PD-01 y PD-02; se conservan ambas formas sin cambios |
| Revisión visual módulo por módulo | Solo se revisaron con captura el dashboard (1280 y 820 px) y cartera (390 px). El resto se cubrió por los componentes compartidos, las 678 pruebas y axe; **no** hay una revisión manual de las 30 pantallas |
| `next build` tras esta tanda | No se ejecutó para no pisar la caché del servidor del 3001; sí `tsc`, `eslint` y las pruebas. El último `next build` correcto es el de la tanda anterior |
| Accesibilidad con lectores de pantalla, contraste renderizado y dispositivos reales | Limitación estructural (DR-30) |

## 9. Cómo ver el resultado

| Qué | Dirección | Notas |
|---|---|---|
| Storybook (desarrollo) | `http://localhost:6006` (se levanta desde la carpeta normal) | Historias nuevas: `Moléculas/ErrorState`, `ConnectionCard`, `PermissionNotice`, `Organismos/AdaptiveTable` |
| Aplicación | `http://localhost:3001` | Es el servidor de siempre de la carpeta normal: como ahora la carpeta está en esta rama, ya sirve estos cambios (recarga en caliente). Requiere iniciar sesión |

Para parar los servidores de esta rama, termina los procesos que escuchan en 3002 y 6006 (por su PID, no con `pkill -f`).
