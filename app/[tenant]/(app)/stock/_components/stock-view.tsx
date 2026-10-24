"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Select } from "@/components/atoms/select";
import { EmptyState } from "@/components/molecules/empty-state";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { formatCurrency } from "@/lib/format";
import { COUNT_LABELS } from "@/lib/inventory/stock-docs";
import type { CountRow, OverviewRow, ReorderRow, TransferRow } from "@/lib/inventory/stock-docs-db";
import CountSheet from "./count-sheet";
import NewCountDialog from "./new-count-dialog";
import ReorderTable from "./reorder-table";
import TransferSheet from "./transfer-sheet";
import WarehousesView from "./warehouses-view";

export type WarehouseOption = { id: string; name: string; code: string | null; isDefault: boolean };
type Tab = "stock" | "transfers" | "counts" | "reorder" | "warehouses";
const COUNT_TONES = { DRAFT: "warning", COMPLETED: "success", CANCELED: "muted" } as const;

/** Existencias: por bodega, traslados, conteos físicos, reposición y bodegas. */
export default function StockView({ slug, warehouses, overview, transfers, counts, reorder, products, purchasesActive }: { slug: string; warehouses: WarehouseOption[]; overview: OverviewRow[]; transfers: TransferRow[]; counts: CountRow[]; reorder: ReorderRow[]; products: { id: string; name: string }[]; purchasesActive: boolean }) {
  const [tab, setTab] = useState<Tab>("stock");
  const [warehouse, setWarehouse] = useState("all");
  const [transferring, setTransferring] = useState(false);
  const [counting, setCounting] = useState(false);
  const [openCount, setOpenCount] = useState<string | null>(null);
  const needed = reorder.filter((r) => r.needsOrder).length;
  const rows = overview.filter((r) => warehouse === "all" || r.warehouseId === warehouse);
  const total = rows.reduce((s, r) => s + r.value, 0);
  const canMove = warehouses.length > 1;

  return (
    <div className="grid gap-4">
      <div className="max-w-full overflow-x-auto pb-1">
        <SegmentedControl
          ariaLabel="Sección"
          value={tab}
          onChange={setTab}
          options={[
            { value: "stock", label: "Existencias" },
            { value: "transfers", label: "Traslados", count: transfers.length },
            { value: "counts", label: "Conteos", count: counts.filter((c) => c.status === "DRAFT").length },
            { value: "reorder", label: "Reposición", count: needed },
            { value: "warehouses", label: "Bodegas", count: warehouses.length },
          ]}
        />
      </div>

      {tab === "stock" ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {warehouses.length > 1 ? (
              <div className="w-56">
                <Select aria-label="Bodega" value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
                  <option value="all">Todas las bodegas</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <span className="text-[13px] text-muted-foreground">
              Valor del inventario <b className="font-mono text-foreground">{formatCurrency(total)}</b>
            </span>
          </div>
          {rows.length ? (
            <div role="region" aria-label="Existencias por bodega" tabIndex={0} className="overflow-x-auto rounded-lg border border-border bg-surface focus-visible:outline-2 focus-visible:outline-accent">
              <table className="w-full min-w-[520px] text-[13px]">
                <caption className="sr-only">Existencias por producto y bodega</caption>
                <thead className="bg-surface-muted text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Producto</th>
                    <th scope="col" className="px-3 py-2 font-medium">Bodega</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Hay</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Costo promedio</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={`${r.productId}-${r.warehouseId}`}>
                      <th scope="row" className="px-3 py-2 text-left font-medium">{r.productName}</th>
                      <td className="px-3 py-2">{r.warehouseName}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{r.quantity}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(r.avgCost)}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(r.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface">
              <EmptyState title="Aún no hay existencias" description="Registra una entrada desde el Catálogo o recibe una compra, y aparecerán aquí por bodega." />
            </div>
          )}
        </>
      ) : null}

      {tab === "transfers" ? (
        <>
          <div className="flex">
            <button type="button" disabled={!canMove} onClick={() => setTransferring(true)} className={buttonVariants({ className: "ml-auto" })}>
              <Plus aria-hidden="true" className="size-4" /> Nuevo traslado
            </button>
          </div>
          {!canMove ? <p className="text-[13px] text-muted-foreground">Para trasladar necesitas al menos dos bodegas: créala en la pestaña Bodegas.</p> : null}
          {transfers.length ? (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {transfers.map((t) => (
                <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
                  <span className="grid min-w-0">
                    <b className="truncate text-[13.5px] font-medium">
                      {t.fromName} → {t.toName}
                    </b>
                    <small className="truncate text-xs text-muted-foreground">
                      <span className="font-mono">{t.code}</span> · {t.lineCount} {t.lineCount === 1 ? "producto" : "productos"} · {t.units} u. · {t.createdAt.slice(0, 10)}
                      {t.note ? ` · ${t.note}` : ""}
                    </small>
                  </span>
                  <b className="font-mono text-[13.5px] tabular-nums">{formatCurrency(t.value)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-border bg-surface">
              <EmptyState title="Aún no hay traslados" description="Mueve mercancía de una bodega a otra sin perder su costo." />
            </div>
          )}
        </>
      ) : null}

      {tab === "counts" ? (
        <>
          <div className="flex">
            <button type="button" onClick={() => setCounting(true)} className={buttonVariants({ className: "ml-auto" })}>
              <Plus aria-hidden="true" className="size-4" /> Nuevo conteo
            </button>
          </div>
          {counts.length ? (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {counts.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setOpenCount(c.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted">
                    <span className="grid min-w-0">
                      <b className="truncate text-[13.5px] font-medium">{c.warehouseName}</b>
                      <small className="truncate text-xs text-muted-foreground">
                        <span className="font-mono">{c.code}</span> · {c.counted} de {c.lines} contados{c.withDifference ? ` · ${c.withDifference} con diferencia` : ""} · {c.createdAt.slice(0, 10)}
                      </small>
                    </span>
                    <Badge tone={COUNT_TONES[c.status]}>{COUNT_LABELS[c.status]}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-border bg-surface">
              <EmptyState title="Aún no hay conteos" description="Cuenta lo que hay en la bodega y NEXUS ajusta las diferencias, dejando el motivo en el kardex." />
            </div>
          )}
        </>
      ) : null}

      {tab === "reorder" ? <ReorderTable slug={slug} rows={reorder} purchasesActive={purchasesActive} /> : null}
      {tab === "warehouses" ? <WarehousesView slug={slug} warehouses={warehouses} /> : null}

      {transferring ? <TransferSheet slug={slug} warehouses={warehouses} products={products} overview={overview} onClose={() => setTransferring(false)} /> : null}
      {counting ? <NewCountDialog slug={slug} warehouses={warehouses} onClose={() => setCounting(false)} onCreated={(id) => { setCounting(false); setOpenCount(id); setTab("counts"); }} /> : null}
      {openCount ? <CountSheet slug={slug} id={openCount} onClose={() => setOpenCount(null)} /> : null}
      {purchasesActive ? null : tab === "reorder" ? (
        <p className="text-[13px] text-muted-foreground">
          Para pedir a tus proveedores desde aquí, enciende «Compras» en{" "}
          <Link href={`/${slug}/functions`} className="font-medium text-foreground underline underline-offset-4">
            Funciones
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
