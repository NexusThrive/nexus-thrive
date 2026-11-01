/**
 * Punto de entrada del movimiento: reexporta curvas de easing, resortes, efectos, transición de tema y morfeo de
 * ventanas emergentes. Las reglas de uso están en `docs/design/movimiento.md`.
 */
export { motionOff } from "./reduced";
export { EASE_IN, EASE_IN_OUT, EASE_OUT, EASE_SPRING, expoOut, easeInOutQuart } from "./easing";
export { spring, springFrames, shake, type SpringOptions } from "./spring";
export { burst, burstFrom, drawPath, flash, reveal } from "./effects";
export { withThemeSweep } from "./theme-transition";
export { armPopoverMorph, POPOVER_MORPH_SECONDS, SELECT_MORPH_SECONDS, type PopoverMorph } from "./popover-morph";
