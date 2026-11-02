# 13 · Validación final, cambios documentales pendientes y limitaciones

[← Índice](README.md) · Cierra la etapa documental. Aquí consta **qué se verificó, cómo y con qué resultado**, y **qué no se pudo verificar**.

## 1. Qué se validó y cómo

| # | Comprobación | Método | Resultado |
|---|---|---|---|
| V-1 | Enlaces entre documentos | `herramientas/validar-docs.py`: cada enlace relativo `.md` existe | Sin enlaces rotos |
| V-2 | Identificadores | Todo `DR-`, `PD-` y `H-` citado está definido en `01` | Sin referencias huérfanas |
| V-3 | Secciones citadas | Toda cita «`NN` §X» apunta a una sección que existe en ese documento | Sin citas a secciones inexistentes |
| V-4 | Tablas | Cada fila tiene las mismas columnas que su cabecera | Sin tablas rotas |
| V-5 | Alcance | Búsqueda de términos operativos de restaurante (comanda, cocina, mesero, recetas, plano de mesas, QR de mesa, pedidos QR) en los documentos nuevos | 0 apariciones |
| V-6 | Cifras obsoletas | Búsqueda de las afirmaciones corregidas («24 capacidades», «cuatro pantallas…», «23 comprueban») | Solo aparece citada como corrección en `02` §5 |
| V-7 | Marcadores sin resolver | `{{`, `TODO`, `XXX`, `FIXME` | 0 |
| V-8 | Decisiones heredadas | Las 30 decisiones del blueprint v3 conservan número y estado (`[A]`→**A**, `[R]`→**D**) | Coinciden |
| V-9 | Históricos intactos | Hash SHA-256 de los tres blueprints archivados frente a los originales | Idénticos |
| V-10 | Repositorio principal | `git status` y rama de `nexus-thrive` antes y después | Rama `chore/HU-corregir-p1-responsive-01` en `ef7c749`, sin cambios (solo las skills de terceros sin rastrear que ya existían) |

**Reproducir:** desde esta carpeta, `python3 -I herramientas/validar-docs.py .` (solo lectura).

## 2. Cifras re-medidas el 2026-11-01

Fuente: `node scripts/design-inventory.mjs`, el script de puntuación por módulo (`02` §3) y recuentos con `find`/`grep` sobre la rama `chore/HU-corregir-p1-responsive-01`. Son **heurísticas** (texto, no árbol de sintaxis).

| Cifra | Valor | Dónde se usa |
|---|---|---|
| Páginas / `loading.tsx` / `error.tsx` / `not-found` (app) | 72 / 37 / 0 / 1 | `02`, `12` |
| Páginas / `loading.tsx` / `error.tsx` (negocio) | 38 / 32 / 0 | `02`, `12` |
| `<table>` manuales (app / negocio) | 33 / 30 | `02`, `11` |
| `DataTable` usos | 0 | `11` |
| `<button>` nativo / `<Button>` (negocio) | 286 / 21 | `02` |
| `buttonVariants` llamadas reales (documentadas en #138) / `<Button>` | 385 / 54 | `11` §3 |
| Tamaños de texto fuera de token (app / negocio) | 736 / 301 | `03`, `02` |
| Hex (app / negocio) | 55 / 35 | `03`, `02` |
| Colores arbitrarios de Tailwind (app) | 114 | `03` |
| `z-index` numérico (app / negocio) | 25 / 4 | `03` |
| Componentes (átomos / moléculas / organismos / plantillas) | 34 / 52 / 46 / 6 | `11` |
| Componentes sin uso / sin historia | 19 / 24 | `11` |
| Capacidades (`READY` / `BETA` / `PLANNED`) | 16 / 4 / 2 = 22 | `02`, `04` |
| Páginas del negocio con comprobación de permiso | 25 de 38 | `09` |
| Páginas con aviso de permiso en página | 13 | `09` |
| `aria-label` / `role="alert|status"` / `sr-only` | 348 / 93 / 47 | `08` |
| `outline-none` sin `focus-visible` en la misma línea | 14 | `08` |
| Atributo `title` | 205 | `08` |
| `placeholder` / etiquetas | 174 / 173 | `06`, `08` |
| Historias de Storybook (archivos) | 146 | `02` |

## 3. Correcciones que este trabajo hizo a afirmaciones previas

| Afirmación anterior | Corrección | Dónde |
|---|---|---|
| 24 capacidades | 22 | `02` §5 |
| «No hay bandeja persistente de notificaciones» | El descarte sí persiste; falta historial | `02` §5 |
| «Cuatro pantallas escriben el aviso de permiso a mano» | 13 páginas muestran un aviso propio (se leyó el texto de 4) | `09`, `06` |
| «Cada módulo resuelve sus pestañas a su manera» | Existen `TabNav`, `SectionNav` y `UrlSegmentedControl`; se pregunta cuántos módulos los usan (H-02) | `01`, `04` |
| «No existe un estado honesto por capacidad» | Existe (`READY`/`BETA`/`PLANNED`) y se propone usarlo (DR-33) | `01`, `02` |

## 4. Resumen final de decisiones (estado)

| Estado | Cantidad | IDs |
|---|---|---|
| **A** · Aprobadas | 13 | DR-01, 02, 03, 07, 12, 13, 14, 15, 18, 20, 24, 25, 30 |
| **D** · Dirección aprobada | 17 | DR-04, 05, 06, 08, 09, 10, 11, 16, 17, 19, 21, 22, 23, 26, 27, 28, 29 |
| **N** · Propuestas nuevas | 17 | DR-31 a DR-47 |
| **PD** · Pendientes | 12 | PD-01 a PD-12 |
| **H** · Hipótesis | 17 | H-01 a H-17 |

## 5. Cambios pendientes en documentos vigentes (no aplicados)

Se **documentan** aquí y **no se aplican** hasta la fase que los implemente o la puerta que los apruebe. No se modificó ningún documento vigente.

| Documento | Cambio requerido | Motivo | Se aplica en |
|---|---|---|---|
| `04-patrones/accessibility.md` | Objetivos táctiles: de «24 px mínimo y 40 px en botones de icono» a **44 px en `pointer: coarse`** | DR-15 | I4 |
| `CLAUDE.md` (sección de pruebas) | La guía menciona «375 y 1280»; la referencia pasa a 360 diseño / 375 regresión / 320 / 412 / tablets | DR-20 | G4 |
| `05-calidad/pruebas-responsive.md` y `e2e/viewports.ts` (pila #141–#143) | Añadir 744 y 1024 | DR-13, DR-20 | I4 |
| `03-sistema/DESIGN.md` | Tokens `text-2xs`/`text-ui`, `--doc-*`, ficha de patrones | DR-02, DR-05 | I2 |
| `01-marca/guia-de-tono.md` | «Bitácora» frente a «Historial»; verbos de lista cerrada; estados con icono | DR-24 | G2 |
| `03-sistema/inventario-patrones.md` | Re-medición tras cada oleada | DR-31 | I10 |
| `packages/brand/README.md` | Enlazar la carpeta `08-blueprint-ux` | Índice | G0 |
| Storybook (páginas MDX) | Páginas «Lenguaje» y «Patrones» | `06`, `11` | I5 |

## 6. Limitaciones reales

Todo lo que **no se pudo verificar**, sin darlo por cumplido:

| # | Limitación | Efecto |
|---|---|---|
| L-1 | **No se ejecutó la aplicación** para recorrer pantallas. Lo «existente» se apoya en código, esquema y documentos | Los ceros de `EmptyState`/`Alert` pueden ser falsos negativos; H-03, H-04, H-15 siguen abiertas |
| L-2 | **No se re-ejecutaron** `pnpm verify`, `pnpm test:responsive` ni las suites e2e | Las cifras de pruebas (224/224, 376 verdes, 38 saltadas, 2 intermitentes) son las del reporte de #143 |
| L-3 | **Chromium emulado ≠ dispositivo real** | Zoom de Safari/iOS, gestos, teclado virtual, zonas seguras, rendimiento: sin verificar (DR-30) |
| L-4 | **Benchmark con fuentes públicas** vía buscador; sin acceso a pantallas internas de ningún competidor | Siigo y Holded sin fuente primaria; Alegra/Odoo/Zoho con confianza media o baja |
| L-5 | **Conteos por expresión regular** | Texto fuera de JSX, textos de base de datos o CMS y calidad de nombres accesibles no auditados |
| L-6 | **Sin analítica de uso ni pruebas con personas** | H-01 (uso móvil) y los objetivos «tiempo hasta primer valor» y «navegación comprensible» sin línea base |
| L-7 | **Contraste no medido sobre capturas renderizadas** | H-07 es cálculo, no medición |
| L-8 | **No se probó ninguna integración** (Wompi, factura electrónica, Google, WhatsApp) | Solo se describe lo que dicen esquema, puertos y páginas |
| L-9 | **No se ejecutó ninguna prueba con lector de pantalla** | R4 sigue parcial |
| L-10 | La pila de PR #141–#143 **no está en `main`**: los documentos y pruebas que citan (`pruebas-responsive.md`, `viewports.ts`, informes) viven allí | Las referencias son a esas PR hasta que se fusionen |
| L-11 | El worktree se creó desde `origin/main` (`ef1bdeb`); el repositorio principal está en `ef7c749` | La carpeta `08-blueprint-ux` no depende de los cambios de #141–#143 |

## 7. Implementación posterior

Tras aprobar el glosario se implementaron las fases I1 a I10 (parcialmente algunas). El detalle, lo que falta y las decisiones tomadas están en [`14`](14-registro-de-implementacion.md). Las limitaciones L-1 a L-11 siguen vigentes; se añade **L-12**: la aplicación autenticada no se recorrió (requiere sesión de Clerk), así que lo implementado se verificó en Storybook, pruebas y compilación.

## 8. Estado de cierre

| Fase documental | Estado |
|---|---|
| Auditoría | Completada |
| Design System y fundamentos | Completada |
| Navegación, búsqueda, actividad | Completada |
| Dashboard | Completada |
| Componentes, patrones, plantillas | Completada |
| UX Writing y glosario | **Completada como borrador; la aprobación (PD-03) está pendiente** |
| Responsive | Completada |
| Accesibilidad | Completada |
| Roles y permisos | Completada |
| Integraciones | Completada |
| Coherencia entre módulos y hoja de ruta | Completada |
| Validación de consistencia | Completada |

**Siguiente paso posible (requiere autorización):** revisar y aprobar por bloques (puertas G0–G4 en `12` §4.2). Nada de código se toca hasta entonces.
