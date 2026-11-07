"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { useShell } from "@/components/providers/shell-context";

/**
 * Launcher de Nexus: todas las áreas del negocio que el usuario tiene habilitadas, agrupadas por dominio. Se abre desde la barra
 * superior con el mismo panel de Nexus (no un menú nuevo). Muestra solo lo que la organización y el rol permiten.
 */
export function WorkspaceLauncher() {
  const [open, setOpen] = useState(false);
  const { groups, activeKey, hrefFor } = useShell();
  const areas = groups.filter((group) => group.label !== "Sistema");
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className={buttonVariants({ variant: "ghost", size: "icon" })}>
        <LayoutGrid aria-hidden="true" className="size-5" />
        <span className="sr-only">Aplicaciones de Nexus</span>
      </button>
      <ResponsiveSheet open={open} onOpenChange={setOpen} title="Aplicaciones" description="Elige el espacio de trabajo." size="md">
        <div className="grid gap-5 sm:grid-cols-2">
          {areas.map((group) => (
            <section key={group.label} aria-labelledby={`launcher-${group.label}`} className="grid gap-1.5">
              <h3 id={`launcher-${group.label}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </h3>
              <ul className="grid gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.key}>
                      <Link
                        href={hrefFor(item.href)}
                        onClick={() => setOpen(false)}
                        aria-current={item.key === activeKey ? "page" : undefined}
                        className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=page]:bg-accent-subtle"
                      >
                        <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </ResponsiveSheet>
    </>
  );
}
