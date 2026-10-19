"use client";

import { useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { EmptyState } from "@/components/molecules/empty-state";
import { SearchField } from "@/components/molecules/search-field";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { KIND_LABELS } from "@/lib/business/catalog-kinds";
import { stockLevel } from "@/lib/business/inventory";
import type { ProductKindValue, ProductRow } from "@/lib/business/products-db";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import ProductDetail from "./product-detail";
import ProductSheet from "./product-sheet";

/** Catálogo del negocio por tipo (según el rubro), con inventario y ventas. */
export default function CatalogView({ slug, products, kinds, customers, canManage, initialNew }: { slug: string; products: ProductRow[]; kinds: ProductKindValue[]; customers: { id: string; name: string }[]; canManage: boolean; initialNew: boolean }) {
  const [kind, setKind] = useState<ProductKindValue>(kinds[0]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<ProductRow | "new" | null>(initialNew ? "new" : null);
  const [open, setOpen] = useState<ProductRow | null>(null);
  const low = products.filter((p) => p.active && ["low", "out"].includes(stockLevel(p)));
  const text = q.trim().toLowerCase();
  const list = products.filter((p) => p.kind === kind && (!text || [p.name, p.sku, p.category].some((x) => x?.toLowerCase().includes(text))));

  return (
    <div className="grid gap-4">
      {low.length ? (
        <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-[13px]">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
          <span>
            <b className="font-medium">Por reponer:</b> {low.map((p) => `${p.name} (${p.stock})`).join(" · ")}
          </span>
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {kinds.length > 1 ? (
          <div className="overflow-x-auto [scrollbar-width:none]">
            <SegmentedControl ariaLabel="Tipo" value={kind} onChange={setKind} options={kinds.map((k) => ({ value: k, label: KIND_LABELS[k].many, count: products.filter((p) => p.kind === k).length }))} />
          </div>
        ) : null}
        <SearchField aria-label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o referencia" containerClassName="order-last basis-full sm:order-none sm:basis-auto sm:max-w-xs" />
        {canManage ? (
          <button type="button" onClick={() => setEditing("new")} className={buttonVariants({ className: "ml-auto" })}>
            <Plus aria-hidden="true" className="size-4" /> Nuevo {KIND_LABELS[kind].one.toLowerCase()}
          </button>
        ) : null}
      </div>

      {list.length ? (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const level = stockLevel(p);
            return (
              <li key={p.id}>
                <button type="button" onClick={() => setOpen(p)} className={cn("grid w-full gap-2 rounded-lg border border-border bg-surface p-3.5 text-left transition-colors hover:border-border-strong", !p.active && "opacity-60")}>
                  <span className="flex items-start justify-between gap-3">
                    <b className="min-w-0 flex-1 truncate text-[14px] font-medium">{p.name}</b>
                    <b className="font-mono text-[14px] tabular-nums">{formatCurrency(p.price)}</b>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {p.category ? <Badge tone="neutral">{p.category}</Badge> : null}
                    {p.trackStock ? <Badge tone={level === "out" ? "danger" : level === "low" ? "warning" : "success"}>{level === "out" ? "Agotado" : `${p.stock} disp.`}</Badge> : null}
                    {p.durationDays ? <Badge tone="neutral">{p.durationDays} días</Badge> : null}
                    {p.durationMinutes ? <Badge tone="neutral">{p.durationMinutes} min</Badge> : null}
                    {p.capacity ? <Badge tone="neutral">Cupo {p.capacity}</Badge> : null}
                    {!p.active ? <Badge tone="muted">No disponible</Badge> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState title={text ? "Sin coincidencias" : `Aún no hay ${KIND_LABELS[kind].many.toLowerCase()}`} description={KIND_LABELS[kind].hint} />
        </div>
      )}

      {open ? <ProductDetail slug={slug} product={open} customers={customers} canManage={canManage} onEdit={() => { setEditing(open); setOpen(null); }} onClose={() => setOpen(null)} /> : null}
      {editing ? <ProductSheet slug={slug} kinds={kinds} product={editing === "new" ? null : editing} defaultKind={kind} onClose={() => setEditing(null)} onSaved={setKind} /> : null}
    </div>
  );
}
