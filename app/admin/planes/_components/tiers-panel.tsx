"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { UsdInput } from "@/components/molecules/usd-input";
import type { CustomerTier } from "@/lib/plans/pricing";
import { cn } from "@/lib/utils";
import { saveTiersAction } from "../actions";
import { useSave } from "./use-save";

/**
 * Precio por cantidad de clientes: tramos de menor a mayor, el último sin
 * límite. Se suman al plan según cuántos clientes atiende el negocio.
 */
export default function TiersPanel({ tiers, canPrice }: { tiers: CustomerTier[]; canPrice: boolean }) {
  const [rows, setRows] = useState(() => [...tiers].sort((a, b) => a.order - b.order));
  const { save, pending } = useSave();
  const dirty = JSON.stringify(rows) !== JSON.stringify([...tiers].sort((a, b) => a.order - b.order));
  const set = (i: number, patch: Partial<CustomerTier>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <section className="grid gap-3 rounded-lg border border-border bg-surface p-[18px]">
      <p className="text-[13px] text-muted-foreground">El negocio elige su tramo en el registro y se suma a su plan. El último tramo no tiene límite.</p>
      <ol className="grid gap-2.5">
        {rows.map((t, i) => {
          const last = i === rows.length - 1;
          return (
            <li key={t.id} className="grid grid-cols-1 items-end gap-2.5 rounded-md border border-border p-3 sm:grid-cols-[minmax(0,1.4fr)_150px_150px_auto]">
              <label className="grid gap-1.5 text-[12.5px] font-medium">
                Nombre del tramo
                <input disabled={!canPrice} value={t.label} onChange={(e) => set(i, { label: e.target.value })} className={inputClasses} />
              </label>
              <label className="grid gap-1.5 text-[12.5px] font-medium">
                Máximo de clientes
                <input
                  type="number"
                  min={1}
                  disabled={!canPrice || last}
                  value={last ? "" : (t.maxCustomers ?? "")}
                  placeholder={last ? "Sin límite" : ""}
                  onChange={(e) => set(i, { maxCustomers: e.target.value ? Number(e.target.value) : null })}
                  className={cn(inputClasses, "font-mono")}
                />
              </label>
              <label className="grid gap-1.5 text-[12.5px] font-medium">
                Precio / mes
                <UsdInput value={t.priceUsdCents} disabled={!canPrice} onChange={(v) => set(i, { priceUsdCents: v })} />
              </label>
              <button type="button" aria-label={`Quitar ${t.label}`} disabled={!canPrice || rows.length <= 1} onClick={() => setRows(rows.filter((_, j) => j !== i).map((r, j, a) => (j === a.length - 1 ? { ...r, maxCustomers: null } : r)))} className={buttonVariants({ variant: "ghost", size: "icon" })}>
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </li>
          );
        })}
      </ol>
      {canPrice ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={rows.length >= 8}
            onClick={() => {
              const prevMax = rows.at(-2)?.maxCustomers ?? 0;
              const copy = rows.map((r, j) => (j === rows.length - 1 ? { ...r, maxCustomers: prevMax ? prevMax * 2 : 100 } : r));
              setRows([...copy, { id: `tier-${Date.now().toString(36)}`, label: "Nuevo tramo", maxCustomers: null, priceUsdCents: (rows.at(-1)?.priceUsdCents ?? 0) + 1000, order: rows.length }]);
            }}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Plus aria-hidden="true" className="size-4" /> Agregar tramo
          </button>
          <button type="button" disabled={!dirty || pending} onClick={() => save(() => saveTiersAction(rows), "Tramos de clientes guardados")} className={buttonVariants({ size: "sm" })}>
            <Check aria-hidden="true" className="size-4" /> {pending ? "Guardando…" : "Guardar tramos"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
