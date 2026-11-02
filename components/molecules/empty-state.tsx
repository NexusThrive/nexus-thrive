import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { N_PATH } from "@/components/atoms/n-path";

/**
 * Estado vacío NEXUS THRIVE: texto alineado a la izquierda con su acción (el botón para crear el primero) y la N en
 * contorno grande, recortada en la esquina inferior derecha como en el panel del acceso (opacidad baja, detrás del
 * texto, sin moverse). Título Montserrat 600 16 px, descripción muted 13 px y una acción.
 * Con `icon` (p. ej. «sin resultados» de una búsqueda) el icono va sobre el título y la N queda de fondo igual.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  headingLevel = 3,
  className,
}: {
  title: string;
  description?: string;
  /** Acción principal (crear el primero, limpiar filtros). Una sola. */
  action?: ReactNode;
  /** Icono propio sobre el título (p. ej. sin resultados de búsqueda). */
  icon?: ReactNode;
  /** Nivel del título para respetar la jerarquía de la página. */
  headingLevel?: 2 | 3 | 4;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className={cn("relative isolate flex min-h-52 flex-col justify-center overflow-hidden px-6 py-12 sm:px-10", className)}>
      <svg
        viewBox="394.83 239.93 734.96 634.25"
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -right-12 -z-10 w-72 text-foreground opacity-[0.07] sm:-bottom-16 sm:-right-16 sm:w-96"
      >
        <path d={N_PATH} fill="none" stroke="currentColor" strokeWidth={10} strokeLinejoin="round" />
      </svg>
      {icon ? (
        <span aria-hidden="true" className="mb-3 text-muted-foreground [&_svg]:size-8">
          {icon}
        </span>
      ) : null}
      <Heading className="font-display text-lg font-semibold text-foreground">{title}</Heading>
      {description && <p className="mt-1.5 max-w-md text-ui text-muted-foreground">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
