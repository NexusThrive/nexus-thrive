import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { N_PATH } from "@/components/atoms/n-path";
import { EmptyPageFrame, type EmptyPreview } from "./empty-page-frame";

/**
 * Estado vacío NEXUS THRIVE: texto alineado a la izquierda con su acción (el botón para crear el primero) y la N en
 * contorno grande, recortada en la esquina inferior derecha como en el panel del acceso (opacidad baja, detrás del
 * texto, sin moverse). Título Montserrat 600 16 px, descripción muted 13 px y una acción.
 * Con `icon` (p. ej. «sin resultados» de una búsqueda) el icono va sobre el título y la N queda de fondo igual.
 * Con `mark="page"` (una vista entera vacía: una lista o un tablero sin nada) se arma con propósito: el icono del área en un
 * recuadro, el título, para qué sirve, la acción principal (con su destello periódico `nx-flash`, ver app/styles/motion.css) y una
 * secundaria (p. ej. importar), y debajo `highlights`: tres primeros pasos cortos con su icono. Ocupa el alto que queda sin dejar
 * scroll. Los vacíos pequeños (una tarjeta, un panel, Actividad reciente) siguen con `corner`.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  headingLevel = 3,
  mark = "corner",
  remember = true,
  secondaryAction,
  highlights,
  preview,
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
  /** `corner`: N de contorno en la esquina (por defecto). `page`: vista entera vacía, texto centrado y N grande abajo. */
  mark?: "corner" | "page";
  /** Con `page`: anota la ruta como vacía para que la próxima precarga pinte este estado y no filas (apágalo con filtros o búsqueda). */
  remember?: boolean;
  /** Con `page`: acción secundaria junto a la principal (p. ej. «Importar»), con estilo de contorno. */
  secondaryAction?: ReactNode;
  /** Con `page`: primeros pasos (idealmente tres) que explican para qué sirve la vista. */
  highlights?: { icon: ReactNode; title: string; text: string }[];
  /** Con `page`: datos de ejemplo detrás (cómo se verá la lista con datos), difuminados por debajo del contenido. */
  preview?: EmptyPreview;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const content = (
    <>
      {icon ? (
        <span aria-hidden="true" className="mb-3 text-muted-foreground [&_svg]:size-8">
          {icon}
        </span>
      ) : null}
      <Heading className="font-display text-lg font-semibold text-foreground">{title}</Heading>
      {description && <p className="mt-1.5 max-w-md text-ui text-muted-foreground">{description}</p>}
      {action && <div className={cn("mt-5 flex flex-wrap items-center gap-2", mark === "page" && "nx-flash justify-center")}>{action}</div>}
    </>
  );
  if (mark === "page") {
    return (
      <EmptyPageFrame remember={remember} preview={preview} className={className}>
        <div className="grid w-full max-w-2xl justify-items-center gap-6">
          {icon ? (
            <span aria-hidden="true" className="grid size-12 place-items-center rounded-xl border border-border bg-card text-accent-text [&_svg]:size-6">
              {icon}
            </span>
          ) : null}
          <div className="grid gap-2">
            <Heading className="font-display text-xl font-semibold text-foreground">{title}</Heading>
            {description ? <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {action || secondaryAction ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {action ? <span className="nx-flash inline-flex">{action}</span> : null}
              {secondaryAction}
            </div>
          ) : null}
          {highlights?.length ? (
            <ul className="grid w-full gap-3 text-left sm:grid-cols-3">
              {highlights.map((h) => (
                <li key={h.title} className="flex gap-3 rounded-xl border border-border bg-card/85 p-4 backdrop-blur-sm sm:flex-col sm:gap-2.5">
                  <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-accent-text [&_svg]:size-4">
                    {h.icon}
                  </span>
                  <span className="grid gap-0.5">
                    <span className="text-sm font-medium text-foreground">{h.title}</span>
                    <span className="text-xs text-muted-foreground">{h.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </EmptyPageFrame>
    );
  }
  return (
    <div className={cn("relative isolate flex min-h-52 flex-col justify-center overflow-hidden px-6 py-12 sm:px-10", className)}>
      <svg
        viewBox="394.83 239.93 734.96 634.25"
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -right-12 -z-10 w-72 text-foreground opacity-[0.07] sm:-bottom-16 sm:-right-16 sm:w-96"
      >
        <path d={N_PATH} fill="none" stroke="currentColor" strokeWidth={10} strokeLinejoin="round" />
      </svg>
      {content}
    </div>
  );
}
