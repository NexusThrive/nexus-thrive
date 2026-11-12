import type { ReactNode } from "react";
import { Skeleton } from "@/components/atoms/skeleton";
import { cn } from "@/lib/utils";
import shell from "./tenant-shell.module.css";
import styles from "./tenant-shell-skeleton.module.css";

/** Bloque en blanco translúcido: sobre el marco gris, el gris del `Skeleton` normal se fundiría con el fondo. */
const onFrame = "bg-card/70";

/** Etiquetas de los ítems de la barra lateral: anchos distintos para que parezca texto y no una columna de barras iguales. */
const NAV_WIDTHS = ["w-20", "w-28", "w-24", "w-16", "w-28", "w-24"] as const;
const FOOT_WIDTHS = ["w-16", "w-24", "w-20", "w-20"] as const;

function NavItem({ width }: { width: string }) {
  return (
    <div className={styles.item}>
      <Skeleton className={cn("size-5 shrink-0 rounded-md", onFrame)} />
      <Skeleton className={cn("h-3.5", width, styles.label, onFrame)} />
    </div>
  );
}

/**
 * Esqueleto del sistema completo mientras el negocio carga (sesión, negocio, membresía): barra lateral, barra superior y panel con el
 * esqueleto de la pantalla, en lugar de una pantalla en blanco o de la N. Usa las mismas medidas y el mismo marco que `TenantShell`
 * (`--sw`, panel de 28 px) y las clases de su CSS, así que se ajusta solo a PC, riel de iconos y celular; al llegar lo real nada salta.
 * `children` es el esqueleto del contenido (normalmente `RouteLoading`, el de la ruta de destino) y es quien anuncia «cargando»; sin él, el
 * marco lo anuncia con `label`. Lo demás (barras) es solo apariencia: `aria-hidden`.
 */
export function TenantShellSkeleton({ children, label = "Cargando tu negocio" }: { children?: ReactNode; label?: string }) {
  return (
    <div className={shell.root} aria-busy="true">
      <aside className={styles.side} aria-hidden="true">
        <div className={styles.biz}>
          <Skeleton className={cn("size-9 shrink-0 rounded-lg", "bg-surface-muted")} />
          <div className={cn("grid flex-1 gap-1.5", styles.label)}>
            <Skeleton className="h-3 w-28 bg-surface-muted" />
            <Skeleton className="h-2.5 w-16 bg-surface-muted" />
          </div>
        </div>
        {NAV_WIDTHS.map((width, i) => (
          <NavItem key={i} width={width} />
        ))}
        <div className={styles.foot}>
          {FOOT_WIDTHS.map((width, i) => (
            <NavItem key={i} width={width} />
          ))}
        </div>
      </aside>

      <div className={shell.main}>
        <header className={styles.top} aria-hidden="true">
          <Skeleton className={cn("size-9 rounded-lg", styles.topMark, onFrame)} />
          <Skeleton className={cn("h-4 w-24", styles.topTitle, onFrame)} />
          <Skeleton className={cn("h-11 w-full rounded-full", styles.topSearch, "bg-card")} />
          <div className={styles.topActions}>
            <Skeleton className={cn("size-11 rounded-full", onFrame)} />
            <Skeleton className={cn("size-9 rounded-md", onFrame)} />
          </div>
        </header>
        <div className={shell.panel} data-scroll-panel="">
          <div className={shell.view}>
            {/* El contenido (`PageSkeleton`) ya es un `role="status"` con su etiqueta; sin él, el marco anuncia la suya. */}
            {children ?? (
              <p role="status" className="sr-only">
                {label}
              </p>
            )}
          </div>
        </div>
      </div>

      <nav className={styles.tabs} aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className={cn("h-9 w-12 rounded-full", onFrame)} />
        ))}
      </nav>
    </div>
  );
}
