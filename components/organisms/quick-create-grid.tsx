"use client";

import { IconTile } from "@/components/atoms/icon-tile";
import { QuickActionLink } from "@/components/organisms/quick-action-link";
import { useShell } from "@/components/providers/shell-context";

/**
 * Las acciones de "Crear" del negocio en tarjetas de 2 columnas; entran una a
 * una con rebote. Se usa dentro del panel del botón central (móvil).
 */
export function QuickCreateGrid({ onNavigate }: { onNavigate?: () => void }) {
  const { quickActions, hrefFor } = useShell();
  if (!quickActions.length) {
    return <p className="text-sm text-muted-foreground">No hay acciones disponibles con los módulos activos.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {quickActions.map((action, i) => {
        const Icon = action.icon;
        return (
          <QuickActionLink
            key={action.key}
            actionKey={action.key}
            href={hrefFor(action.href)}
            onClick={onNavigate}
            data-press="card"
            className="grid animate-[nx-pop_520ms_cubic-bezier(.34,1.4,.64,1)_backwards] justify-items-start gap-2.5 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-input motion-reduce:animate-none"
            style={{ animationDelay: `${90 + i * 55}ms` }}
          >
            <IconTile tone="ink">
              <Icon />
            </IconTile>
            <span className="font-semibold">{action.label}</span>
          </QuickActionLink>
        );
      })}
    </div>
  );
}
