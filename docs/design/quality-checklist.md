# Lista de calidad de interfaz

[← DESIGN.md](../../DESIGN.md)

Obligatoria para todo PR que crea o cambia una pantalla, un formulario, un
componente o una interacción. Se copia en la descripción del PR y se marca lo
que aplica. Lo que no se pudo verificar se dice.

## Antes de construir

- [ ] Sé qué tarea resuelve la pantalla y para qué rol.
- [ ] Busqué si ya existe un componente o una interacción igual
      ([DESIGN.md §3](../../DESIGN.md#3-componentes)).
- [ ] Elegí el patrón con [interaction-patterns.md](interaction-patterns.md)
      (diálogo, panel lateral, ventana flotante, página o en línea).
- [ ] Tengo claros los estados: cargando, vacío, error, éxito, sin permiso,
      módulo apagado.
- [ ] Identifiqué la guía de ayuda afectada (si cambia lo que ve el usuario).

## Al construir

- [ ] Uso tokens y componentes compartidos: nada de colores, sombras,
      `z-index` o duraciones sueltos; nada de modales hechos a mano ni
      `window.confirm`.
- [ ] Formularios con `Field` (etiqueta, descripción, error) y `FormDialog` /
      `FormDrawer` / `ConfirmDialog`.
- [ ] Ayuda "?" con `ContextHelp` solo donde aporta; lo imprescindible en la
      descripción visible.
- [ ] Teclado, foco y táctil funcionan; botones de icono con `aria-label`.
- [ ] Movimiento con los tokens de [DESIGN.md §4](../../DESIGN.md#4-movimiento),
      y nada se rompe con movimiento reducido.
- [ ] Permisos y datos: la página llama `requirePageContext`, la acción
      `requireTenantContext` + `can()`; nada de `@/prisma/db` en `app/`;
      dinero por `money-service`; lo sensible a `logTenantAction`.
- [ ] Textos en español de Colombia, concretos ("Guardar cliente", no
      "Enviar").

## Antes del PR

- [ ] `pnpm exec tsc --noEmit` · `pnpm lint` · `pnpm test`
- [ ] `pnpm test:integration` si toqué datos
- [ ] `pnpm test:e2e` si toqué un componente compartido (Playwright + axe)
- [ ] Historia de Storybook con los estados, si es un componente compartido
- [ ] Probado en el navegador en 375, 768 y 1280 px; sin errores en consola
- [ ] Revisión manual de accesibilidad
      ([accessibility.md §2](accessibility.md#2-cómo-se-verifica))
- [ ] Capturas antes/después en el PR (sin datos personales)
- [ ] Ayuda actualizada si cambió un flujo visible
- [ ] Si el sistema cambió (token, componente, patrón), actualicé DESIGN.md o
      interaction-patterns.md
