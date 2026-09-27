"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RANGOS, type RangoKey } from "@/lib/shared/rango";

/** Filtro de rango: Última semana / mes / año → query ?rango=. */
export function FiltroRango({ activo }: { activo: RangoKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function ir(rango: RangoKey) {
    const next = new URLSearchParams(params);
    if (rango === "semana") next.delete("rango");
    else next.set("rango", rango);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="inline-flex rounded-lg border border-nexus-border bg-nexus-surface p-1">
      {RANGOS.map((r) => {
        const selected = activo === r.key;
        return (
          <button
            key={r.key}
            onClick={() => ir(r.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              selected
                ? "bg-nexus-ink text-nexus-surface"
                : "text-nexus-muted hover:text-nexus-ink"
            }`}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}