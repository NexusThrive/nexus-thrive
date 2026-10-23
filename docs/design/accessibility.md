# Accesibilidad

[← DESIGN.md](../../DESIGN.md)

**Base: WCAG 2.2 nivel AA.** Es un requisito de implementación, no un repaso
final. No se declara "cumple WCAG" sin una evaluación con alcance definido:
las pruebas automáticas encuentran una parte de los problemas, no todos.

## 1. Requisitos

### Estructura

- Un `<h1>` por página (el `PageHeader`); los niveles no saltan.
- Botón para acciones, enlace para navegar. Nada de `div` con `onClick`.
- Regiones con nombre (`<nav aria-label>`, `<section aria-label>`) donde
  ayudan a orientarse.
- HTML nativo primero; ARIA solo para completar lo que el HTML no dice.

### Teclado y foco

- Todo se alcanza y se opera con teclado, en un orden lógico.
- Foco siempre visible: contorno de 2 px en `--ring` (`:focus-visible`).
- Diálogos y paneles atrapan el foco, cierran con Escape (si no están
  guardando) y **devuelven el foco** al control que los abrió
  (`ResponsiveSheet` lo hace también cuando se abre de forma controlada).
- Menús, pestañas y combobox siguen su patrón de APG (Radix y `cmdk` ya lo
  implementan; no reimplementar).

### Ayuda "?" y tooltips

- `ContextHelp` para explicar: nombre accesible "Ayuda sobre …", se abre con
  hover, clic, toque, Enter o Espacio, cierra con Escape, se anuncia por
  `role="status"` y no se recorta (portal en `--z-popover`).
- `Tooltip` solo nombra un botón de icono que **ya** tiene `aria-label`; no
  lleva contenido interactivo.
- Lo imprescindible para llenar un campo va en su descripción visible
  (`Field hint`), nunca solo en un tooltip ni en el `placeholder`.
- El atributo `title` no cuenta como ayuda (no llega con teclado ni táctil).

### Formularios

- Cada control tiene etiqueta asociada (`Field` lo cablea).
- Obligatorio: "*" visible + "obligatorio" para lectores (`aria-required`).
  Opcional: "(opcional)" cuando es la excepción.
- `type`, `inputMode` y `autoComplete` correctos (`email`, `tel`, `name`,
  `organization`, `street-address`…).
- Error: texto + icono (no solo color), `aria-invalid`, `aria-describedby` al
  mensaje; tras un envío fallido, `Alert role="alert"` y foco al primer
  campo inválido (`focusFirstInvalid`). Lo escrito no se borra.
- Éxito: toast (`role="status"`) sin sacar a la persona de su contexto.

### Color, contraste y tamaño

- Texto ≥ 4.5:1 (≥ 3:1 si es grande); bordes de controles, foco e iconos con
  significado ≥ 3:1. En oro, el texto usa `--accent-text` (oro 700 en claro),
  no `--accent`.
- Estados distinguibles sin color (icono, texto, forma).
- Objetivos táctiles de al menos 24 × 24 px (WCAG 2.5.8); los controles
  principales miden `--control-h` (40 px). Botones de icono: 40 px.
- Funciona con zoom al 200 % y con texto agrandado: sin alturas fijas que
  recorten mensajes de error o etiquetas largas.
- Sin scroll horizontal en contenido normal a 320 px de ancho.

### Lectores de pantalla y anuncios

- Toasts y `LoadingState` usan `role="status"` (educados, una vez).
- Errores de envío: `role="alert"`.
- Iconos decorativos con `aria-hidden="true"`.
- No anunciar lo mismo dos veces (p. ej. toast **y** alerta con el mismo
  texto para el mismo evento).

### Movimiento

- `prefers-reduced-motion` y Ajustes → Reducir movimiento apagan toda
  animación (`app/styles/motion.css`). El cambio de estado se sigue
  entendiendo sin ella.
- Nada parpadea más de 3 veces por segundo.

## 2. Cómo se verifica

| Qué | Cómo | Dónde |
|---|---|---|
| Reglas automáticas WCAG 2.2 AA | axe-core en Playwright, tema claro y oscuro | `e2e/a11y.spec.ts` (`pnpm test:e2e`, corre en CI) |
| Foco, teclado, Escape, devolución del foco, foco atrapado | Playwright | `e2e/overlays.spec.ts`, `e2e/context-help.spec.ts` |
| Táctil y móvil | Playwright con Pixel 7 | proyecto `movil` |
| Movimiento reducido | Playwright con `reducedMotion: "reduce"` | `e2e/overlays.spec.ts` |
| Componente aislado | Panel *Accessibility* de Storybook (addon a11y) | `pnpm storybook` |
| Lo que no se automatiza | A mano, por pantalla cambiada | Lista abajo |

### Revisión manual (cada pantalla cambiada)

1. Recorrerla solo con teclado: ¿llego a todo?, ¿veo el foco?, ¿Escape cierra?
2. Abrir y cerrar cada diálogo: ¿vuelve el foco al botón?
3. Zoom 200 % y ancho 320 px: ¿se lee todo sin scroll horizontal?
4. Con un lector (NVDA, VoiceOver o TalkBack): ¿se entiende el nombre de cada
   botón de icono, el error de un campo y el resultado de guardar?
5. Activar *Reducir movimiento*: ¿se entiende lo que cambió?

Los resultados reales se anotan en el PR. No se escriben puntajes que no se
midieron.
