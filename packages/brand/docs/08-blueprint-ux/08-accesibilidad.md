# 08 · Accesibilidad

[← Índice](README.md) · Decisiones citadas: DR-15, DR-27, DR-39, DR-42, DR-43, DR-44. Principios: **D7** (accesibilidad y confianza) y **P7** (WCAG 2.2 AA, usable con una mano).

**Base vigente (no se reescribe):** `04-patrones/accessibility.md` (estructura, teclado y foco, ayuda, formularios, color y tamaño, lectores, movimiento, verificación). Este documento fija **cómo se aplica a cada patrón del sistema**, qué está medido y qué falta.

> Regla de honestidad (B5): **no se declara «cumple WCAG»** sin una evaluación con alcance definido. Las pruebas automáticas encuentran una parte; el resto es manual y en dispositivos.

## 1. Estado medido (hechos, heurísticos)

| Señal | Valor | Lectura |
|---|---|---|
| `aria-label` en `app/` y `components/` | 348 | Uso extendido; no mide calidad de los nombres |
| `role="alert"` / `role="status"` | 93 | Estados anunciados |
| `sr-only` | 47 | Texto solo para lectores |
| Referencias a movimiento reducido | 38 | Respetado |
| `<img>` sin `alt` | 0 | Sin hallazgo por heurística |
| `outline-none` sin `focus-visible` en la misma línea | **14** | **Revisar** (DR-42): puede haber falsos positivos |
| Atributo `title` | **205** | **Auditar** (DR-43): `title` no llega con teclado ni táctil |
| `placeholder` / etiquetas | 174 / 173 | Revisar campo a campo (DR-44) |
| Pruebas axe | 10 componentes × 2 temas + `FormDialog` con errores | **Sin axe a nivel de página ni de plantilla** |

**Candidatos de `outline-none` a revisar (DR-42)** — cada uno debe tener foco visible por otra vía:
`app/onboarding/_components/adaptive-business-form.tsx`, `app/admin/_components/tenant-form.tsx`, `app/admin/beneficios/*`, `app/[tenant]/(app)/catalog/import/_components/mapping-editor.tsx`, `app/[tenant]/(app)/crm/[id]/_components/notes-panel.tsx`, `components/molecules/phone-input.tsx`, `components/molecules/popover.tsx`, `components/molecules/kpi-card.tsx` (enlace de superficie completa), `components/organisms/onboarding/access-step.tsx`, `components/organisms/command-palette.tsx`, `components/atoms/select.tsx`. Algunos son contenedores (popover, lista del select) donde el foco lo gestiona un hijo: la revisión decide, no la cuenta.

## 2. Reglas por patrón

| Patrón | Reglas obligatorias | Porqué |
|---|---|---|
| **Navegación** (barra, riel, hoja «Más») | `<nav aria-label>`; ítem activo con `aria-current="page"`; etiqueta visible (texto, no solo icono) en toda vista; orden de foco lógico; sin ítems solo-icono | S2, D7 |
| **Búsqueda global** | Patrón combobox (cmdk); flechas, Enter, Escape; el foco vuelve al disparador; resultados con nombre completo | D7 |
| **Tabla / lista** (DR-08) | Tabla real con `<th scope>` y `caption`; en modo lista, cada elemento es una unidad con nombre accesible y las acciones por fila alcanzables; orden y filtros anunciados | D7, D8 |
| **Formularios** (DR-44) | Etiqueta asociada; `aria-required`; `autocomplete`/`inputMode` correctos; error con texto + icono, `aria-invalid`, `aria-describedby`; resumen y foco al primer inválido | D7, P6 |
| **Diálogos y hojas** | Foco atrapado, Escape cierra (salvo guardando), el foco **vuelve** al disparador; título como `aria-labelledby` | Ya cubierto por `ResponsiveSheet` |
| **Estados y notificaciones** | `role="status"` (cargando, éxito) y `role="alert"` (error); no anunciar dos veces el mismo hecho | D7 |
| **Badges de estado** (DR-27) | Texto + icono + color; contraste ≥ 4,5:1 del texto | D7 |
| **Gráficos** (DR-39) | Valor/etiqueta visible; alternativa en tabla o resumen; no solo color; ejes ≥ 11 px | D7 |
| **Ayuda contextual** | `ContextHelp` con nombre «Ayuda sobre …», accesible con teclado y táctil; nunca solo `title` | D7 |
| **Movimiento** | Tokens `--d1`–`--d4`; sin parpadeo > 3/s; todo se entiende con movimiento reducido | D7, B4 |
| **Integraciones** | Estado anunciado como texto («Conectado», «Requiere atención»), no solo icono | D7 |

## 3. Tamaños, contraste y zoom

- **Texto:** ≥ 4,5:1 (≥ 3:1 si es grande); texto dorado sobre claro con `--accent-text`. **Texto con opacidad:** 7 de 12 usos incumplen o rozan AA (cálculo, H-07) → corregir con revisión visual.
- **Objetivos táctiles:** la guía vigente fija ≥ 24 px (AA 2.5.8) y 40 px en botones de icono; la decisión **DR-15** eleva a **44 px** todo control táctil. La guía vigente deberá actualizarse al implementarlo (ver `13` §5).
- **Zoom 200 %** y texto agrandado sin recortar mensajes ni etiquetas largas; **320 px** sin scroll horizontal (probado en `responsive`).
- **Campos de 16 px en móvil** (DR-06): evita el zoom automático de Safari en iOS (H-06, sin validar en dispositivo).

## 4. Teclado y foco

- Todo se alcanza y se opera con teclado en orden lógico; foco visible de 2 px en `--ring`.
- Atajos (`Ctrl K`) nunca son el único camino.
- Menús, pestañas y combobox siguen APG (Radix y cmdk; no se reimplementan).
- Contenedores con foco gestionado por un hijo (popover, listas) quedan documentados como excepción.

## 5. Cómo se verifica (por nivel)

| Nivel | Qué | Cómo | Estado |
|---|---|---|---|
| Componente | axe + tema claro/oscuro | Storybook + Playwright | 10 historias + 1 diálogo (cobertura parcial de 138 componentes) |
| Plantilla/página | axe sobre plantillas | **Por añadir** como propuesta | No existe |
| Teclado y foco | Escape, devolución de foco, foco atrapado | `overlays.spec.ts`, `context-help.spec.ts` | Existe (2 fallos intermitentes citados en el reporte de #143) |
| Táctil/móvil | Objetivos y reflow | Proyecto `responsive` | Existe |
| Lector de pantalla | NVDA, VoiceOver, TalkBack | Manual por pantalla cambiada | **No ejecutado en esta etapa** |
| Contraste renderizado | Capturas | Manual / herramienta | **No ejecutado** |
| Dispositivos | iOS Safari, Android, iPad | Pruebas reales | **No ejecutado** |

**Propuesta de cobertura mínima de axe (N, parte de DR-09):** una historia por **estado** (cargando, vacío, error, sin permiso) de cada plantilla piloto, en ambos temas.

## 6. Criterios de aceptación

| Criterio | Medida | Umbral |
|---|---|---|
| Foco visible | Revisión de los 14 candidatos | 0 sin foco |
| `title` como única ayuda | Auditoría de 205 usos | 0 |
| Formularios | Auditoría de campos | 0 campos sin etiqueta asociada |
| axe | Historias de plantillas y estados | 0 violaciones |
| Objetivos táctiles | Prueba `pointer: coarse` | 0 < 44 px |
| Lector de pantalla | Prueba manual en 3 flujos (Inicio, registrar cliente, cobrar) | Resultado anotado en el PR |

## 7. Límites
- Todas las cifras de §1 salen de búsquedas de texto; no analizan el árbol ni la calidad de los nombres accesibles.
- Axe detecta una fracción de los problemas; no sustituye la prueba con lectores ni con personas usuarias.
- Ningún criterio se declara cumplido sin esas pruebas (DR-30).
