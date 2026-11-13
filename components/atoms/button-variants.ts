import { cva } from "class-variance-authority";

/**
 * Clases del botón NEXUS THRIVE, sin "use client": las usan también los
 * componentes de servidor y los enlaces con aspecto de botón
 * (`<Link className={buttonVariants({ variant: "outline" })}>`).
 * `nx-press` activa el hundimiento con resorte de MotionProvider.
 *
 * Soft Enterprise: radio de control (`rounded-md`, 10 px), Inter 550 a 13 px.
 * - `primary`: la acción principal, en oro con tinta encima (9,6:1). Una por vista.
 * - `outline`: superficie blanca, borde sutil y sombra xs; la acción secundaria habitual.
 * - `secondary`: relleno gris suave, para acciones dentro de una tarjeta.
 * - `ghost`: sin fondo hasta pasar el cursor (barras, iconos).
 * - `danger`: borrar o anular, siempre con confirmación.
 * - `link`: texto en oro legible.
 * `accent` y `default` son alias de `primary`; `destructive`, de `danger` (compatibilidad).
 */
const primary = "bg-accent text-ink hover:bg-accent-hover";
const danger = "bg-danger text-white hover:brightness-110";

export const buttonVariants = cva(
  "nx-press relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent text-ui font-semibold leading-none outline-none transition-[background-color,border-color,filter,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary,
        outline: "border-border bg-surface text-foreground shadow-xs hover:border-border-strong hover:bg-surface-muted",
        secondary: "bg-surface-muted text-foreground hover:bg-surface-hover",
        ghost: "bg-transparent text-foreground hover:bg-surface-muted",
        danger,
        link: "h-auto px-0 text-accent-text underline-offset-4 hover:underline",
        // Alias de compatibilidad: mismo aspecto que su variante.
        accent: primary,
        default: primary,
        destructive: danger,
      },
      size: {
        default: "h-(--control-h) px-4.5",
        sm: "h-8 px-3 text-xs pointer-coarse:h-11",
        lg: "h-12 px-5.5 text-sm",
        icon: "size-(--control-h) p-0",
        "icon-sm": "size-8 p-0 pointer-coarse:size-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);
