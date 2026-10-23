@AGENTS.md

## Interfaz: sistema de diseño obligatorio

Toda pantalla, formulario, componente o interacción nueva o modificada sigue el
sistema de diseño. Antes de escribir UI, leer:

- [DESIGN.md](DESIGN.md) — marca (no se cambia: NEXUS, Public Stunt, negro y
  oro), tokens, componentes compartidos y movimiento.
- [docs/design/interaction-patterns.md](docs/design/interaction-patterns.md) —
  diálogo, panel lateral, ventana flotante, página o en línea.
- [docs/design/accessibility.md](docs/design/accessibility.md) — WCAG 2.2 AA.
- [docs/design/quality-checklist.md](docs/design/quality-checklist.md) — se
  copia en el PR.

Reglas que no se negocian:

1. Reusar antes de crear: `ResponsiveSheet`, `FormDialog`/`FormDrawer`,
   `ConfirmDialog`/`useConfirm`, `Popover`, `ContextHelp`, `Field`, `Alert`,
   `EmptyState`, `LoadingState`, `useToast`.
2. Prohibido: `window.confirm`/`alert`, modales hechos a mano
   (`fixed inset-0`), `organisms/dialog.tsx` y `organisms/sheet.tsx`
   (deprecados), `z-index` numérico, colores/sombras/duraciones sueltos, y
   `title` como única ayuda.
3. Cada control con etiqueta; errores con texto e icono; foco visible, que
   vuelve al disparador al cerrar; todo operable con teclado y táctil.
4. Movimiento solo con los tokens y respetando movimiento reducido. Sin
   librerías de animación nuevas.
5. Si se toca un componente compartido: historia en Storybook y
   `pnpm test:e2e` (Playwright + axe). Si cambia el sistema, se actualiza
   DESIGN.md en el mismo PR.
6. Datos: nada en `app/` importa `@/prisma/db`; repositorios de `lib/` con
   `tenantId`, `can()`, `money-service` y `logTenantAction`
   ([docs/guias/nueva-funcionalidad.md](docs/guias/nueva-funcionalidad.md)).
