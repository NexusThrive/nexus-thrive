import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Corte oro de 3×12 px con el ángulo de la N: firma de los encabezados. */
export function Slash({ className }: { className?: string }) {
  return <i aria-hidden="true" className={cn("inline-block h-3 w-[3px] -skew-x-[24deg] bg-accent", className)} />;
}

/** Antetítulo en versalitas con el corte oro (sección o fecha). */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mb-1.5 flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.1em] text-muted-foreground",
        className,
      )}
    >
      <Slash />
      {children}
    </div>
  );
}

/**
 * Encabezado de página: antetítulo, título Montserrat 500 (22→28 px según
 * ancho), descripción y acciones alineadas abajo a la derecha (debajo en
 * móvil). `title` admite un RevealText para la entrada letra por letra.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  descriptionClassName,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Para esconder o acortar la descripción en pantallas chicas (`max-sm:hidden`). */
  descriptionClassName?: string;
}) {
  return (
    <header className={cn("mb-3 flex flex-wrap sm:mb-4 items-end justify-between gap-x-4 gap-y-3", className)}>
      <div className="nx-rise min-w-0">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="font-display text-[clamp(22px,3.4vw,28px)] font-medium leading-[1.15] tracking-[-0.02em] text-foreground">
          {title}
        </h1>
        {description ? <p className={cn("mt-1 max-w-[62ch] text-sm text-muted-foreground", descriptionClassName)}>{description}</p> : null}
      </div>
      {actions ? (
        <div
          className="nx-rise ml-auto flex grow flex-wrap items-center justify-end gap-2"
          style={{ ["--i" as string]: 1 }}
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}

/** Título de sección dentro de una página, con enlace opcional a la derecha. */
export function SectionTitle({
  title,
  action,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 mt-[26px] flex items-center justify-between gap-2.5", className)}>
      <h2 className="font-display text-[17px] font-medium text-foreground">{title}</h2>
      {action}
    </div>
  );
}
