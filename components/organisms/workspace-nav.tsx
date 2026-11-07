"use client";

import Link from "next/link";
import { useShell } from "@/components/providers/shell-context";
import { cn } from "@/lib/utils";

/**
 * Navegación contextual del espacio activo (Nexus Workspace): las secciones del grupo al que pertenece la página actual, en una
 * fila horizontal debajo de la barra superior. Sustituye a la barra lateral fija en escritorio. Solo muestra enlaces reales.
 */
export function WorkspaceNav() {
  const { groups, activeKey, hrefFor } = useShell();
  const current = groups.find((group) => group.items.some((item) => item.key === activeKey));
  if (!current || current.label === "General" || current.label === "Sistema") return null;
  return (
    <nav aria-label={`Sección: ${current.label}`} data-workspace-nav="" className="hidden border-b border-border bg-card lg:block">
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto px-6 py-2">
        <span className="shrink-0 pr-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{current.label}</span>
        {current.items.map((item) => {
          const active = item.key === activeKey;
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={hrefFor(item.href)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active ? "bg-accent-subtle text-foreground" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
