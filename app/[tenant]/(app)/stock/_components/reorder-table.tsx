"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { EmptyState } from "@/components/molecules/empty-state";
import { useToast } from "@/components/molecules/toast";
import type { ReorderRow } from "@/lib/inventory/stock-docs-db";
import { setLevelsAction } from "@/app/[tenant]/(app)/stock/actions";

const num = (v: string) => (v.trim() === "" ? null : Number(v));

/** Niveles por producto (mínimo, punto de reorden y máximo) y qué conviene pedir ya. */
export default function ReorderTable({ slug, rows, purchasesActive }: { slug: string; rows: ReorderRow[]; purchasesActive: boolean }) {
  const [draft, setDraft] = useState<Record<string, { min: string; reorder: string; max: string }>>(() => Object.fromEntries(rows.map((r) => [r.productId, { min: String(r.minStock), reorder: r.reorderPoint === null ? "" : String(r.reorderPoint), max: r.maxStock === null ? "" : String(r.maxStock) }])));
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  if (!rows.length) return <div className="rounded-lg border border-border bg-surface"><EmptyState title="Sin productos con inventario" description="Activa «Controla inventario» en un producto del Catálogo para definir sus niveles." /></div>;

  const field = (id: string, key: "min" | "reorder" | "max", label: string, name: string) => (
    <input aria-label={`${label} de ${name}`} inputMode="numeric" value={draft[id]?.[key] ?? ""} onChange={(e) => setDraft({ ...draft, [id]: { ...draft[id], [key]: e.target.value.replace(/\D/g, "") } })} className={`${inputClasses} h-8 w-20 text-right`} />
  );
  const save = (r: ReorderRow) =>
    start(async () => {
      const d = draft[r.productId];
      const res = await setLevelsAction(slug, r.productId, { minStock: Number(d.min) || 0, maxStock: num(d.max), reorderPoint: num(d.reorder) });
      if (res.ok) {
        toast(res.message, "success");
        router.refresh();
      } else toast({ title: "No se guardó", description: res.message, variant: "error" });
    });

  return (
    <div role="region" aria-label="Reposición" tabIndex={0} className="overflow-x-auto rounded-lg border border-border bg-surface focus-visible:outline-2 focus-visible:outline-accent">
      <table className="w-full min-w-[900px] text-[13px]">
        <caption className="sr-only">Niveles de reposición por producto</caption>
        <thead className="bg-surface-muted text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Producto</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Hay</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Mínimo</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Reordenar en</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Máximo</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Ya pedido</th>
            <th scope="col" className="px-3 py-2 font-medium"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.productId}>
              <th scope="row" className="px-3 py-2 text-left font-medium">
                {r.name}
                {r.needsOrder ? <Badge variant="gold" className="ml-2">Reponer {r.suggested}</Badge> : null}
              </th>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{r.stock}</td>
              <td className="px-3 py-2 text-right">{field(r.productId, "min", "Mínimo", r.name)}</td>
              <td className="px-3 py-2 text-right">{field(r.productId, "reorder", "Punto de reorden", r.name)}</td>
              <td className="px-3 py-2 text-right">{field(r.productId, "max", "Máximo", r.name)}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{r.onOrder}</td>
              <td className="px-3 py-2 text-right">
                <div className="flex justify-end gap-2 whitespace-nowrap">
                  <button type="button" disabled={pending} onClick={() => save(r)} aria-label={`Guardar niveles de ${r.name}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Guardar
                  </button>
                  {r.needsOrder && purchasesActive ? (
                    <Link href={`/${slug}/purchases`} className={buttonVariants({ size: "sm" })}>
                      Pedir
                    </Link>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
