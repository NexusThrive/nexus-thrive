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
        "mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground",
        className,
      )}
    >
      <Slash />
      {children}
    </div>
  );
}

/**
 * Encabezado de página: antetítulo, título Montserrat 700 (24→34 px según
 * ancho), descripción y acciones alineadas abajo a la derecha (debajo en
 * móvil). `title` admite un RevealText para la entrada letra por letra.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-5 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="nx-rise min-w-0">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="font-display text-[clamp(24px,4.4vw,34px)] font-bold leading-[1.12] tracking-[-0.02em] text-foreground">
          {title}
        </h1>
        {description ? <p className="mt-1.5 max-w-[62ch] text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? (
        <div className="nx-rise flex flex-wrap items-center gap-2" style={{ ["--i" as string]: 1 }}>
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
      <h2 className="font-display text-[17px] font-semibold text-foreground">{title}</h2>
      {action}
    </div>
  );
}
