# Pruebas responsive

Cómo se verifica el principio 08 (*Mobile as a First-Class Experience*, [decisiones §4](../03-sistema/decisiones-nexus-design-system.md#4-principio-transversal-mobile-as-a-first-class-experience)). Origen: la auditoría responsive del dashboard (`06-auditorias/responsive-dashboard-2026-11/informe.md`, PR #140; se enlazará al fusionarse).

## Viewports de referencia

Una sola fuente: [`e2e/viewports.ts`](../../../../e2e/viewports.ts). Storybook los ofrece en la barra de viewports (junto a sus presets) y Playwright los recorre todos.

| Viewport | Ancho × alto | Rol | Propósito |
|---|---|---|---|
| Móvil mínimo | 320 × 640 | Referencia | Mínimo de reflow y detección de fallos |
| Móvil | 360 × 740 | Referencia | Referencia principal de diseño móvil |
| Móvil 375 | 375 × 812 | Regresión | Se conserva para detectar regresiones |
| Móvil grande | 412 × 915 | Referencia | Referencia de pruebas automáticas |
| Tablet 768 | 768 × 1024 | Límite | Umbral entre móvil y tablet |
| Tablet vertical | 820 × 1180 | Referencia | Tablet vertical |
| Tablet 1023 | 1023 × 768 | Límite | Último ancho antes de la navegación expandida |
| Tablet horizontal | 1180 × 820 | Referencia | Tablet horizontal |
| Escritorio | 1280 × 800 | Referencia | Escritorio |

## Cómo ejecutarlas

```bash
pnpm test:responsive          # construye Storybook y corre solo el proyecto `responsive`
pnpm exec playwright test --project=responsive -g "320×640"   # un solo viewport (Storybook ya construido)
```

Las pruebas viven en [`e2e/responsive.spec.ts`](../../../../e2e/responsive.spec.ts) y sus medidas en `e2e/responsive-helpers.ts`. Los proyectos `escritorio` y `movil` no las ejecutan.

## Qué comprueban

| Criterio | Prueba |
|---|---|
| R4 · reflow | La página no gana scroll horizontal; los textos de las tarjetas no se recortan |
| R2/R3 | Los controles de la barra superior no se superponen; objetivos táctiles ≥ 24 px (AA) y ≥ 44 px |
| R3 | Navegación según el ancho (móvil < 768 px, lateral desde 768 px) y etiqueta visible en toda la navegación lateral |
| R4 | Ningún texto por debajo de 11 px |
| Adaptación | Hoja inferior bajo 768 px y modal centrado desde 768 px; detalle de la gráfica como hoja inferior (móvil) o panel lateral derecho (desde 768 px) |
| Estados | Cuenta nueva (primeros pasos y actividad vacía) y precarga de la ruta dentro del shell |

## Hallazgos conocidos: `test.fail`

Los hallazgos de la auditoría que aún no se corrigen se marcan con `test.fail(condición, "P?-n: motivo · paso")`. La prueba **pasa mientras el hallazgo exista y falla cuando se corrige**, y entonces hay que **quitar la marca en el mismo PR**. Así ningún criterio se da por cumplido sin una prueba que pase sin marca.

| Marca | Hallazgo | Se resuelve en |
|---|---|---|
| `P2-3` | Objetivos táctiles de 40–42 px | Paso 4 |
| `P2-4` | Riel de tablet sin etiquetas y texto de 10 px (también los títulos de grupo de la barra expandida) | Paso 5 |
| `P2-5` | Controles de contenido por debajo de 44 px (selectores de periodo, filtros, ayudas, enlaces) | Paso 4 |

**Corregidos (marca retirada):** `P1-1`, `P1-2` y `P1-3` (importes recortados y barra superior superpuesta) en el paso 3; ver [`correcciones-p1-2026-11`](../06-auditorias/correcciones-p1-2026-11/informe.md).

## Alcance y límites

- Corren sobre **historias**, no sobre la aplicación. Incluyen casos exigentes: `NombreLargo` y `CifrasGrandes`. La más fiel es `Páginas/Inicio/Dashboard fiel` (`ConDatos`, `CuentaNueva` y `Cargando`): `TenantShell` real y la composición de `page.tsx` con datos de muestra. Sus diferencias con producción están en [`historia-fiel-dashboard-2026-11`](../06-auditorias/historia-fiel-dashboard-2026-11/informe.md).
- Solo **Chromium con emulación táctil**: no sustituyen la prueba en iPhone o iPad reales (zoom de Safari, gestos, teclado virtual).
- No miden red lenta, contraste renderizado ni estados de carga y error (R5).
- Los criterios **R2, R4 y R5 no se dan por cumplidos** hasta probarlos también en dispositivos.
