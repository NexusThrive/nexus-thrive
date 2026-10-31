# PrettyModal en los modales de escritorio — diseño

Fecha: 2026-10-29 · Rama: `PrettyModal` · Estado: implementado (2026-10-29)

## Intención

Sustituir el morfeo actual de los modales centrados de escritorio (Web
Animations, 380 ms, solo `transform` + `scale`) por el viaje del ZIP
(`Pretty Modal Demo.zip`): el modal **es** el botón que lo abre (mismo tamaño,
posición, radio y color), crece hasta su sitio y al cerrar vuelve exactamente a
él. Apertura y cierre a **0,60 s** (ampliado desde los 0,40 s iniciales
porque el viaje se percibía demasiado rápido), la misma coreografía del ZIP.

El laboratorio `components/labs/pretty-modal` ya validó el efecto con una copia
de `ResponsiveSheet`; este diseño lleva ese motor al componente real.

## Alcance

**Entra**
- `ResponsiveSheet` en variante `dialog` (modal centrado) con `min-width: 768px`.
  Incluye `FormDialog`, `ConfirmDialog`, `Modal` y cualquier uso directo.
- Todos los tamaños de modal centrado: `sm`, `md`, `lg`, `xl`.
- Cierre por Escape, fondo, X, «Cancelar» y desmontaje del padre (copia de
  salida que ya existe, `ghostOut`).
- Cierre a mitad de apertura.

**No entra**
- Móvil (`< 768px`): la hoja inferior sigue subiendo/bajando y arrastrándose.
- `drawer` (panel lateral): sigue deslizándose por el borde derecho.
- `alert`: el aviso sobre otro panel conserva sus 160/120 ms.
- `size="full"`: el visor de documentos a pantalla completa mantiene su entrada
  CSS; el motor centrado no aplica (la caja no está centrada: ocupa el viewport
  con `left/right/top/bottom`).
- Estructura, foco, guard de cambios, `busy` y lógica de negocio.

## Restricciones

1. **Contrato de movimiento** (`docs/design/movimiento.md` §1.3): solo
   `transform`, `opacity`, `filter`, `clip-path`. Este efecto necesita además
   `width`, `height`, `border-radius` y `background-color` para ser idéntico.
   Se acepta como **excepción documentada** en el componente y en la guía, como
   ya ocurre con el logo del riel.
2. **Un dueño por transición**: con el motor activo, el CSS de entrada/salida
   del modal se apaga (`data-morph`) y solo sostiene la animación para que Radix
   espere (`modal-out-hold`, 620 ms).
3. **No bloquear**: el foco vuelve y la página recibe clics desde el primer
   fotograma del cierre (`.sheet[data-state="closed"] { pointer-events: none }`
   ya lo garantiza; el scrim se apaga en el acto).
4. **GSAP** pasa de devDependency a dependencia de la app (hoy solo lo usa el
   laboratorio).
5. **Movimiento reducido**: sin viaje; el modal aparece y desaparece en el
   sitio (ya es así hoy con `animation-duration: 1ms`).

## Enfoques considerados

| Enfoque | Qué implica | Veredicto |
|---|---|---|
| **A. Portar el motor GSAP del laboratorio** | Cambia tamaño/posición/radio/color reales; idéntico al ZIP. Requiere GSAP y una excepción al contrato. | **Elegido**: es lo aprobado visualmente. |
| B. Reescribir con WAAPI y `transform` + `clip-path` | Cumple el contrato, pero no reproduce el cambio real de tamaño ni el contenido reflowado; se parece, no es igual. | Descartado: el usuario pidió «idéntico». |
| C. Mantener el morfeo actual y solo cambiar la duración | Cero riesgo, pero no es la animación que gustó. | Descartado. |

## Cómo funciona

- El motor se arma en el `ref` del contenido (antes del primer pintado), con
  `armModalMorph`: mide el botón de origen y el modal ya en su sitio.
- **Apertura**: estado inicial = origen (tamaño, `x/y`, radio, color), contenido
  oculto; una línea de tiempo pausada se reproduce en el siguiente fotograma
  para que el origen se pinte antes de arrancar. `expo.out`; el eje Y con
  `power4.out`; el contenido entra escalonado.
- **Cierre**: un `MutationObserver` sobre `data-state` dispara la reversa cuando
  Radix marca el panel como cerrado (Escape, fondo, X y desmontaje pasan por
  ahí). El panel sigue montado 620 ms por `modal-out-hold`; el scrim se apaga en
  el acto y el puntero deja de capturarse. Al terminar, el panel se oculta en el
  sitio (sin limpiar estilos) para que Radix no muestre un fotograma a tamaño
  completo.
- **Salida garantizada** (`ghostOut`): la copia que se crea cuando el padre
  desmonta el panel reproduce el mismo viaje con `playExit(copia)`.
- **Duraciones**: 0,60 s en ambos sentidos. Los tiempos dependientes del ZIP
  (contenido, espera del cierre) se escalan en la misma proporción que la
  duración (base del ZIP: 0,75 s apertura / 0,55 s cierre) para conservar la
  coreografía.
- Si no hay botón de origen (menú que se cierra, origen fuera de pantalla) o el
  movimiento está reducido: entrada/salida CSS de siempre.

## Decisiones mías (revisables)

- Escalar los tiempos internos con la duración, en vez de mantener 0,5 s de
  contenido sobre un viaje de 0,6 s (el contenido terminaría después de que el
  modal aterrice).
- Excluir `size="full"` y `alert`.
- Extraer el motor a `lib/motion/modal-morph.ts` (`armModalMorph`,
  `exitPlayerFor`) en vez de mantener el nombre `connectToActivator`.

## Verificación

- `pnpm exec tsc --noEmit` y `pnpm exec eslint` sobre lo tocado.
- `pnpm test` (unitario) y `pnpm test:integration` si aplica.
- `e2e/overlays.spec.ts` (salida animada al desmontar, Escape, foco, guard).
- Playwright manual sobre Storybook: apertura desde botón, cierre por Escape,
  fondo y X, cierre a mitad, móvil intacto, drawer intacto, reducido.
- Revisión visual del usuario en Storybook antes de dar por cerrado.
