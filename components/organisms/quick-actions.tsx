import Link from "next/link";
import { IconTile } from "@/components/atoms/icon-tile";
import { ListItem } from "@/components/molecules/list-item";
import type { QuickCreateAction } from "@/lib/navigation/quick-create";

/**
 * Acciones rápidas del inicio (Server Component): las mismas acciones de
 * "Crear" del botón central y la paleta, según los módulos activos, en filas
 * `ListItem` que se hunden al presionarlas. La tarjeta rellena el alto que
 * tenga y las filas se reparten ese alto (con tres opciones, cada una ocupa su tercio).
 */
export default function QuickActions({
  tenantSlug,
  actions,
}: {
  tenantSlug: string;
  actions: QuickCreateAction[];
}) {
  return (
    <section
      aria-labelledby="quick-actions-title"
      className="nx-rise flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card"
      style={{ ["--i" as string]: 2 }}
    >
      <div className="shrink-0 border-b border-border px-[18px] py-4">
        <h2 id="quick-actions-title" className="font-display text-[15px] font-semibold text-foreground">
          Acciones rápidas
        </h2>
        <p className="text-xs text-muted-foreground">Lo que haces cada día</p>
      </div>
      {actions.length ? (
        <ul className="flex min-h-0 flex-1 flex-col">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <li key={action.key} className="flex min-h-0 flex-1 flex-col">
                <Link
                  href={`/${tenantSlug}${action.href}`}
                  data-press="card"
                  className="flex flex-1 flex-col focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <ListItem
                    interactive
                    chevron
                    className="flex-1"
                    leading={
                      <IconTile>
                        <Icon strokeWidth={1.6} />
                      </IconTile>
                    }
                    title={action.label}
                    subtitle={action.hint}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-[18px] py-6 text-sm text-muted-foreground">Activa módulos en Configuración para ver atajos aquí.</p>
      )}
    </section>
  );
}
