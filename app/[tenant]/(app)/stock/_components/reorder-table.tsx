"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { EmptyState } from "@/components/molecules/empty-state";
import { useToast } from "@/components/molecules/toast";
import { AdaptiveTable } from "@/components/organisms/adaptive-table";
import type { ReorderRow } from "@/lib/business/inventory/stock-docs-db";
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
    <input aria-label={`${label} de ${name}`} inputMode="numeric" value={draft[id]?.[key] ?? ""} onChange={(e) => setDraft({ ...draft, [id]: { ...draft[id], [key]: e.target.value.replace(/\D/g, "") } })} className={`${inputClasses} h-8 pointer-coarse:h-11 w-20 text-right`} />
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
    <AdaptiveTable<ReorderRow>
      caption="Niveles de reposición por producto"
      rows={rows}
      getRowId={(r) => r.productId}
      columns={[
        {
          key: "name",
          header: "Producto",
          role: "primary",
          cell: (r) => (
            <>
              {r.name}
              {r.needsOrder ? <Badge variant="gold" className="ml-2">Reponer {r.suggested}</Badge> : null}
            </>
          ),
        },
        { key: "stock", header: "Hay", role: "detail", align: "right", cell: (r) => <span className="font-mono tabular-nums">{r.stock}</span> },
        { key: "min", header: "Mínimo", role: "detail", align: "right", cell: (r) => field(r.productId, "min", "Mínimo", r.name) },
        { key: "reorder", header: "Reordenar en", role: "detail", align: "right", cell: (r) => field(r.productId, "reorder", "Punto de reorden", r.name) },
        { key: "max", header: "Máximo", role: "detail", align: "right", cell: (r) => field(r.productId, "max", "Máximo", r.name) },
        { key: "onOrder", header: "Ya pedido", role: "detail", align: "right", cell: (r) => <span className="font-mono tabular-nums">{r.onOrder}</span> },
        {
          key: "actions",
          header: "Acciones",
          role: "action",
          cell: (r) => (
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
          ),
        },
      ]}
    />
  );
}
