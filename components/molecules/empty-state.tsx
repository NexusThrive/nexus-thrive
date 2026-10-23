import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { N_PATH } from "@/components/atoms/n-path";

/**
 * Estado vacío NEXUS THRIVE: la N en contorno (opacidad .18, 56 px) que flota,
 * título Montserrat 600 16 px, descripción muted 13 px y una acción (botón
 * outline). Centrado con 48 px de padding vertical.
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
  /** Icono propio en lugar de la N (p. ej. sin resultados de búsqueda). */
  icon?: ReactNode;
  /** Nivel del título para respetar la jerarquía de la página. */
  headingLevel?: 2 | 3 | 4;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <span aria-hidden="true" className="text-muted-foreground [&_svg]:size-10">
          {icon}
        </span>
      ) : (
      <svg
        viewBox="362 157 800 800"
        width={56}
        height={56}
        aria-hidden="true"
        className="animate-[nx-float_4s_ease-in-out_infinite] text-foreground opacity-[0.18] motion-reduce:animate-none"
      >
        <path
          d={N_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth={28}
          strokeLinejoin="round"
        />
      </svg>
      )}
      <Heading className="mt-4 font-display text-base font-semibold text-foreground">
        {title}
      </Heading>
      {description && (
        <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
