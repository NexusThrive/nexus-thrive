"use client";

import { useState } from "react";
import Link from "next/link";
import { Boxes, Coins, PackageX, Plus, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Select } from "@/components/atoms/select";
import { EmptyState } from "@/components/molecules/empty-state";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { AdaptiveTable } from "@/components/organisms/adaptive-table";
import { formatCurrency } from "@/lib/foundation/format";
import { COUNT_LABELS } from "@/lib/business/inventory/stock-docs";
import type { CountRow, MovementRow, OverviewRow, ReorderRow, TransferRow } from "@/lib/business/inventory/stock-docs-db";
import CountSheet from "./count-sheet";
import MovementDialog from "./movement-dialog";
import NewCountDialog from "./new-count-dialog";
import ReorderTable from "./reorder-table";
import TransferSheet from "./transfer-sheet";
import WarehousesView from "./warehouses-view";

export type WarehouseOption = { id: string; name: string; code: string | null; isDefault: boolean };
type Tab = "stock" | "movements" | "transfers" | "counts" | "reorder" | "warehouses";
const MOVEMENT_LABELS: Record<string, string> = { IN: "Entrada", OUT: "Salida", SALE: "Venta", ADJUST: "Ajuste" };
const COUNT_TONES = { DRAFT: "warning", COMPLETED: "success", CANCELED: "muted" } as const;

/** Existencias: por bodega, traslados, conteos físicos, reposición y bodegas. */
export default function StockView({ initialTab, slug, warehouses, overview, transfers, counts, reorder, products, purchasesActive, movements = [] }: { movements?: MovementRow[]; initialTab?: string; slug: string; warehouses: WarehouseOption[]; overview: OverviewRow[]; transfers: TransferRow[]; counts: CountRow[]; reorder: ReorderRow[]; products: { id: string; name: string }[]; purchasesActive: boolean }) {
  const [tab, setTab] = useState<Tab>((["stock", "movements", "transfers", "counts", "reorder", "warehouses"] as const).find((t) => t === initialTab) ?? "stock");
  const [warehouse, setWarehouse] = useState("all");
  const [transferring, setTransferring] = useState(false);
  const router = useRouter();
  const [counting, setCounting] = useState(false);
  const [moving, setMoving] = useState(false);
  const [openCount, setOpenCount] = useState<string | null>(null);
  const needed = reorder.filter((r) => r.needsOrder).length;
  const rows = overview.filter((r) => warehouse === "all" || r.warehouseId === warehouse);
  const total = rows.reduce((s, r) => s + r.value, 0);
  const totalAll = overview.reduce((s, r) => s + r.value, 0);
  const units = overview.reduce((s, r) => s + r.quantity, 0);
  const soldOut = reorder.filter((r) => r.stock <= 0).length;
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
            { value: "movements", label: "Movimientos" },
            { value: "transfers", label: "Traslados", count: transfers.length },
            { value: "counts", label: "Conteos", count: counts.filter((c) => c.status === "DRAFT").length },
            { value: "reorder", label: "Reposición", count: needed },
            { value: "warehouses", label: "Bodegas", count: warehouses.length },
          ]}
        />
      </div>

      <dl className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {[
          { icon: <Boxes />, label: "Unidades en inventario", value: String(units) },
          { icon: <Coins />, label: "Inventario valorizado", value: formatCurrency(totalAll) },
          { icon: <TriangleAlert />, label: "Por reponer", value: String(needed) },
          { icon: <PackageX />, label: "Agotados", value: String(soldOut) },
        ].map((k) => (
          <div key={k.label} className="grid gap-1 rounded-xl border border-border bg-surface p-3.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground [&>svg]:size-3.5">{k.icon}{k.label}</dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">{k.value}</dd>
          </div>
        ))}
      </dl>
      {tab === "stock" || tab === "movements" ? (
        <div className="flex">
          <button type="button" onClick={() => setMoving(true)} className={buttonVariants({ className: "ml-auto" })}>
            <Plus aria-hidden="true" className="size-4" /> Nuevo movimiento
          </button>
        </div>
      ) : null}
      {tab === "movements" ? (
        movements.length ? (
          <AdaptiveTable<MovementRow>
            caption="Últimos movimientos de inventario"
            rows={movements}
            getRowId={(r) => r.id}
            columns={[
              { key: "date", header: "Fecha", role: "detail", cell: (r) => <span className="text-ui tabular-nums text-muted-foreground">{r.date.slice(0, 16).replace("T", " ")}</span> },
              { key: "product", header: "Producto", role: "primary", cell: (r) => <span className="font-medium">{r.productName}</span> },
              { key: "kind", header: "Tipo", role: "status", cell: (r) => <Badge tone={r.kind === "IN" ? "success" : r.kind === "ADJUST" ? "warning" : "muted"}>{MOVEMENT_LABELS[r.kind] ?? r.kind}</Badge> },
              { key: "qty", header: "Cantidad", role: "detail", align: "right", cell: (r) => <span className="font-mono tabular-nums">{r.quantity}</span> },
              { key: "wh", header: "Bodega", role: "secondary", cell: (r) => r.warehouseName },
              { key: "bal", header: "Quedan", role: "detail", align: "right", cell: (r) => (r.balance == null ? "" : <span className="font-mono tabular-nums">{r.balance}</span>) },
              { key: "note", header: "Motivo", role: "detail", cell: (r) => <span className="text-muted-foreground">{r.note ?? ""}</span> },
            ]}
          />
        ) : (
          <EmptyState mark="page" remember={false} title="Aún no hay movimientos" description="Cada entrada, salida, venta, traslado y ajuste queda aquí con quién lo hizo y por qué." action={<button type="button" onClick={() => setMoving(true)} className={buttonVariants()}><Plus aria-hidden="true" className="size-4" /> Nuevo movimiento</button>} />
        )
      ) : null}

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
            <span className="text-ui text-muted-foreground">
              Valor del inventario <b className="font-mono text-foreground">{formatCurrency(total)}</b>
            </span>
          </div>
          {rows.length ? (
            <AdaptiveTable<OverviewRow>
              caption="Existencias por producto y bodega"
              rows={rows}
              getRowId={(r) => `${r.productId}-${r.warehouseId}`}
              columns={[
                { key: "product", header: "Producto", role: "primary", cell: (r) => r.productName },
                { key: "warehouse", header: "Bodega", role: "secondary", cell: (r) => r.warehouseName },
                { key: "qty", header: "Hay", role: "detail", align: "right", cell: (r) => <span className="font-mono tabular-nums">{r.quantity}</span> },
                { key: "avg", header: "Costo promedio", role: "detail", align: "right", cell: (r) => <span className="font-mono tabular-nums">{formatCurrency(r.avgCost)}</span> },
                { key: "value", header: "Valor", role: "figure", cell: (r) => <span className="font-mono">{formatCurrency(r.value)}</span> },
              ]}
            />
          ) : (
              <EmptyState mark="page" title="Aún no hay existencias" description="Registra una entrada desde el Catálogo o recibe una compra, y aparecerán aquí por bodega." action={<Link href={`/${slug}/inventario/productos`} className={buttonVariants()}>Ir al catálogo</Link>} />
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
          {!canMove ? <p className="text-ui text-muted-foreground">Para trasladar necesitas al menos dos bodegas: créala en la pestaña Bodegas.</p> : null}
          {transfers.length ? (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {transfers.map((t) => (
                <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
                  <span className="grid min-w-0">
                    <b className="truncate text-ui font-medium">
                      {t.fromName} → {t.toName}
                    </b>
                    <small className="truncate text-xs text-muted-foreground">
                      <span className="font-mono">{t.code}</span> · {t.lineCount} {t.lineCount === 1 ? "producto" : "productos"} · {t.units} u. · {t.createdAt.slice(0, 10)}
                      {t.note ? ` · ${t.note}` : ""}
                    </small>
                  </span>
                  <b className="font-mono text-ui tabular-nums">{formatCurrency(t.value)}</b>
                </li>
              ))}
            </ul>
          ) : (
              <EmptyState mark="page" remember={false} title="Aún no hay traslados" description="Mueve mercancía de una bodega a otra sin perder su costo." action={canMove ? <button type="button" onClick={() => setTransferring(true)} className={buttonVariants()}><Plus aria-hidden="true" className="size-4" /> Nuevo traslado</button> : undefined} />
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
                      <b className="truncate text-ui font-medium">{c.warehouseName}</b>
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
              <EmptyState mark="page" remember={false} title="Aún no hay conteos" description="Cuenta lo que hay en la bodega y NEXUS ajusta las diferencias, dejando el motivo en el kardex." action={<button type="button" onClick={() => setCounting(true)} className={buttonVariants()}><Plus aria-hidden="true" className="size-4" /> Nuevo conteo</button>} />
          )}
        </>
      ) : null}

      {tab === "reorder" ? <ReorderTable slug={slug} rows={reorder} purchasesActive={purchasesActive} /> : null}
      {tab === "warehouses" ? <WarehousesView slug={slug} warehouses={warehouses} /> : null}

      {transferring ? <TransferSheet slug={slug} warehouses={warehouses} products={products} overview={overview} onClose={() => setTransferring(false)} /> : null}
      {moving ? <MovementDialog slug={slug} warehouses={warehouses} products={products} onClose={() => setMoving(false)} onDone={() => { setMoving(false); router.refresh(); }} /> : null}
      {counting ? <NewCountDialog slug={slug} warehouses={warehouses} onClose={() => setCounting(false)} onCreated={(id) => { setCounting(false); setOpenCount(id); setTab("counts"); }} /> : null}
      {openCount ? <CountSheet slug={slug} id={openCount} onClose={() => setOpenCount(null)} /> : null}
      {purchasesActive ? null : tab === "reorder" ? (
        <p className="text-ui text-muted-foreground">
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
