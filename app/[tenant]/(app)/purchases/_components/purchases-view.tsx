"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { EmptyState } from "@/components/molecules/empty-state";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { formatCurrency } from "@/lib/format";
import type { PartyRow } from "@/lib/parties/parties-db";
import { STATUS_LABELS, type OrderStatus } from "@/lib/purchasing/purchases";
import type { OrderRow } from "@/lib/purchasing/purchases-db";
import OrderDetailSheet from "./order-detail-sheet";
import OrderSheet, { type ProductOption, type WarehouseOption } from "./order-sheet";
import SuppliersView from "./suppliers-view";

type Tab = "orders" | "suppliers";
type Filter = "open" | "received" | "all";
const TONES = { DRAFT: "muted", ORDERED: "warning", PARTIAL: "warning", RECEIVED: "success", CANCELED: "muted" } as const;

/** Compras: órdenes (con su recepción) y proveedores. */
export default function PurchasesView({ slug, orders, suppliers, products, warehouses, today }: { slug: string; orders: OrderRow[]; suppliers: PartyRow[]; products: ProductOption[]; warehouses: WarehouseOption[]; today: string }) {
  const [tab, setTab] = useState<Tab>("orders");
  const [filter, setFilter] = useState<Filter>("open");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const isOpen = (s: OrderStatus) => s === "DRAFT" || s === "ORDERED" || s === "PARTIAL";
  const list = orders.filter((o) => (filter === "all" ? true : filter === "open" ? isOpen(o.status) : o.status === "RECEIVED"));
  const open = orders.filter((o) => isOpen(o.status));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl ariaLabel="Sección" value={tab} onChange={setTab} options={[{ value: "orders", label: "Órdenes", count: open.length }, { value: "suppliers", label: "Proveedores", count: suppliers.length }]} />
        {tab === "orders" ? (
          <button type="button" onClick={() => setCreating(true)} className={buttonVariants({ className: "ml-auto" })}>
            <Plus aria-hidden="true" className="size-4" /> Nueva orden
          </button>
        ) : null}
      </div>

      {tab === "orders" ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl ariaLabel="Estado de las órdenes" size="sm" value={filter} onChange={setFilter} options={[{ value: "open", label: "Por recibir", count: open.length }, { value: "received", label: "Recibidas" }, { value: "all", label: "Todas" }]} />
            <span className="text-[13px] text-muted-foreground">Por recibir {formatCurrency(open.reduce((s, o) => s + o.total, 0))}</span>
          </div>
          {list.length ? (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {list.map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => setOpenId(o.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted">
                    <span className="grid min-w-0">
                      <b className="truncate text-[13.5px] font-medium">{o.supplierName}</b>
                      <small className="truncate text-xs text-muted-foreground">
                        <span className="font-mono">{o.code}</span> · {o.lineCount} {o.lineCount === 1 ? "producto" : "productos"}
                        {isOpen(o.status) && o.pendingUnits > 0 ? ` · faltan ${o.pendingUnits} u.` : ""}
                        {o.expectedDate ? ` · esperada ${o.expectedDate}` : ""}
                      </small>
                    </span>
                    <span className="grid justify-items-end gap-1">
                      <b className="font-mono text-[13.5px] tabular-nums">{formatCurrency(o.total)}</b>
                      <Badge tone={TONES[o.status]}>{STATUS_LABELS[o.status]}</Badge>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-border bg-surface">
              <EmptyState
                title={orders.length ? "Nada en este filtro" : "Aún no hay órdenes"}
                description={suppliers.length ? "Crea una orden para pedir mercancía; al recibirla entra al inventario con su costo." : "Primero registra a tu proveedor en la pestaña Proveedores."}
                action={
                  suppliers.length ? (
                    <button type="button" onClick={() => setCreating(true)} className={buttonVariants({ variant: "outline" })}>
                      Nueva orden
                    </button>
                  ) : (
                    <button type="button" onClick={() => setTab("suppliers")} className={buttonVariants({ variant: "outline" })}>
                      Ir a Proveedores
                    </button>
                  )
                }
              />
            </div>
          )}
        </>
      ) : (
        <SuppliersView slug={slug} suppliers={suppliers} />
      )}

      {creating ? <OrderSheet slug={slug} suppliers={suppliers} products={products} warehouses={warehouses} today={today} onClose={() => setCreating(false)} onNeedSupplier={() => { setCreating(false); setTab("suppliers"); }} /> : null}
      {openId ? <OrderDetailSheet slug={slug} id={openId} today={today} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}
