"use client";

import { useState } from "react";
import { Check, ChevronDown, Building2 } from "lucide-react";
import { cambiarOrgActiva } from "@/lib/core/acciones";

interface OrgLite {
  id: string;
  nombre: string;
  slug: string;
}

/**
 * NAVBAR — selector del negocio activo (acción GLOBAL).
 * Con una sola org muestra el nombre fijo; con varias, dropdown para
 * cambiar de negocio sin importar en qué módulo estés parado.
 */
export function SelectorNegocio({
  orgActiva,
  orgs,
}: {
  orgActiva: OrgLite;
  orgs: OrgLite[];
}) {
  const [abierto, setAbierto] = useState(false);

  if (orgs.length <= 1) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-nexus-border px-3 py-1.5">
        <Building2 className="h-4 w-4 text-nexus-muted" />
        <span className="max-w-44 truncate text-sm font-medium text-nexus-ink">{orgActiva.nombre}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-nexus-border px-3 py-1.5 transition hover:border-nexus-gold/60 hover:bg-nexus-surface-alt"
      >
        <Building2 className="h-4 w-4 text-nexus-muted" />
        <span className="max-w-44 truncate text-sm font-medium text-nexus-ink">{orgActiva.nombre}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-nexus-muted transition ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && (
        <>
          <button
            type="button"
            aria-hidden
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setAbierto(false)}
          />
          <div className="absolute left-0 top-full z-20 mt-1.5 w-64 overflow-hidden rounded-xl border border-nexus-border bg-nexus-surface shadow-lg">
            <p className="border-b border-nexus-border/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-nexus-muted">
              Mis negocios
            </p>
            {orgs.map((o) => (
              <form key={o.id} action={cambiarOrgActiva}>
                <input type="hidden" name="orgId" value={o.id} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-nexus-muted transition hover:bg-nexus-surface-alt hover:text-nexus-ink"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-nexus-gold" />
                    <span className="truncate">{o.nombre}</span>
                  </span>
                  {o.id === orgActiva.id && <Check className="h-3.5 w-3.5 shrink-0 text-nexus-gold" />}
                </button>
              </form>
            ))}
          </div>
        </>
      )}
    </div>
  );
}