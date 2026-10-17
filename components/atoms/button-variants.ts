import { cva } from "class-variance-authority";

/**
 * Clases del botón NEXUS THRIVE, sin "use client": las usan también los
 * componentes de servidor y los enlaces con aspecto de botón
 * (`<Link className={buttonVariants({ variant: "outline" })}>`).
 * `nx-press` activa el hundimiento con resorte de MotionProvider.
 */
export const buttonVariants = cva(
  "nx-press relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent text-[13px] font-semibold leading-none outline-none transition-[background-color,border-color,filter,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:brightness-[1.18]",
        accent: "bg-accent text-ink hover:bg-accent-hover",
        outline:
          "border-border-strong bg-transparent text-foreground hover:border-border-input hover:bg-surface-muted",
        secondary: "bg-surface-muted text-foreground hover:bg-surface-hover",
        ghost: "bg-transparent text-foreground hover:bg-surface-muted",
        danger: "bg-danger text-white hover:brightness-110",
        link: "h-auto px-0 text-accent-text underline-offset-4 hover:underline",
        // Alias de compatibilidad (shadcn).
        default: "bg-primary text-primary-foreground hover:brightness-[1.18]",
        destructive: "bg-danger text-white hover:brightness-110",
      },
      size: {
        default: "h-[var(--control-h)] px-[18px]",
        sm: "h-8 px-3 text-[12.5px]",
        lg: "h-12 px-[22px] text-sm",
        icon: "size-[var(--control-h)] p-0",
        "icon-sm": "size-8 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);
