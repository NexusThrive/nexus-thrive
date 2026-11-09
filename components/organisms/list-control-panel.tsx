import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/molecules/breadcrumbs";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { cn } from "@/lib/utils";

/**
 * Panel de control de una lista (base tomada del panel de Odoo, con diseño propio de Nexus):
 *  - Fila 1: migas por registro («Clientes › María Pérez») y acciones principales.
 *  - Fila 2: búsqueda y filtros; a la derecha, el selector de vistas (lista, tablero) y el paginador.
 * Es un contenedor: cada pantalla pone sus controles en los huecos. En móvil las filas se apilan y las vistas se desplazan.
 */
export type ListViewOption<T extends string> = { value: T; label: string };

export function ListControlPanel<T extends string>({
  crumbs,
  actions,
  search,
  filters,
  views,
  pager,
  className,
}: {
  crumbs?: Crumb[];
  actions?: ReactNode;
  search?: ReactNode;
  filters?: ReactNode;
  views?: { ariaLabel: string; value: T; onChange: (value: T) => void; options: ListViewOption<T>[] };
  pager?: ReactNode;
  className?: string;
}) {
  return (
    <section aria-label="Controles de la lista" data-list-control-panel="" className={cn("grid gap-3", className)}>
      {crumbs?.length || actions ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          {crumbs?.length ? <Breadcrumbs items={crumbs} className="min-w-0" /> : <span />}
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {search || filters || views || pager ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {search ? <div className="min-w-0 flex-1 basis-60">{search}</div> : null}
          {filters ? <div className="flex min-w-0 flex-wrap items-center gap-2">{filters}</div> : null}
          {views ? (
            <div className="max-w-full overflow-x-auto pb-1">
              <SegmentedControl ariaLabel={views.ariaLabel} value={views.value} onChange={views.onChange} options={views.options} />
            </div>
          ) : null}
          {pager ? <div className="ms-auto flex items-center gap-2">{pager}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
