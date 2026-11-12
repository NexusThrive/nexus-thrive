"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, LayoutGrid, List, Package, Plus, ScanBarcode, Search, Star, Tags, Wallet, X } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Select } from "@/components/atoms/select";
import { AdaptiveTable } from "@/components/organisms/adaptive-table";
import { EmptyState } from "@/components/molecules/empty-state";
import { SearchField } from "@/components/molecules/search-field";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { KIND_LABELS } from "@/lib/business/catalog/catalog-kinds";
import { categoryAndChildren, categoryPath, type CategoryRow } from "@/lib/business/catalog/category-tree";
import { stockLevel } from "@/lib/business/inventory/inventory";
import type { ProductKindValue, ProductRow } from "@/lib/business/catalog/products-db";
import { formatCurrency } from "@/lib/foundation/format";
import { cn } from "@/lib/utils";
import ProductDetail from "./product-detail";

export type CatalogVista = "tarjetas" | "tabla";

/** Foto del producto o su icono (nunca un hueco). */
function Thumb({ product, className }: { product: ProductRow; className?: string }) {
  return product.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- archivo del negocio servido por /api/files (con sesión)
    <img src={product.imageUrl} alt="" loading="lazy" className={cn("absolute inset-0 size-full max-w-none object-cover", className)} />
  ) : (
    <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-accent-subtle text-accent-text">
      <Package className="size-1/2 max-h-8 max-w-8" strokeWidth={1.5} />
    </span>
  );
}

function StockBadge({ product }: { product: ProductRow }) {
  if (!product.trackStock) return null;
  const level = stockLevel(product);
  return <Badge tone={level === "out" ? "danger" : level === "low" ? "warning" : "success"}>{level === "out" ? "Agotado" : `${product.stock} disp.`}</Badge>;
}

/** Catálogo por tipo (según el rubro): tarjetas con foto o tabla, filtro por categoría y búsqueda. Crear y editar son páginas aparte. */
export default function CatalogView({
  slug,
  products,
  kinds,
  categories,
  customers,
  canManage,
  vista,
}: {
  slug: string;
  products: ProductRow[];
  kinds: ProductKindValue[];
  categories: CategoryRow[];
  customers: { id: string; name: string }[];
  canManage: boolean;
  vista: CatalogVista;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [kind, setKind] = useState<ProductKindValue>(kinds[0]);
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [open, setOpen] = useState<ProductRow | null>(null);

  const low = products.filter((p) => p.active && ["low", "out"].includes(stockLevel(p)));
  const text = q.trim().toLowerCase();
  const allowed = categoryId ? new Set(categoryAndChildren(categories, categoryId)) : null;
  const ofKind = products.filter((p) => p.kind === kind);
  const list = ofKind.filter((p) => (!allowed || (p.categoryId && allowed.has(p.categoryId))) && (!text || [p.name, p.sku, p.category, p.brand].some((x) => x?.toLowerCase().includes(text))));
  const filtered = Boolean(text || categoryId);
  const empty = ofKind.length === 0 && !filtered;
  // El vacío ocupa justo el alto que queda en el panel (nunca más): las tarjetas de ejemplo se recortan en vez de empujar y dejar scroll.
  const emptyRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = emptyRef.current;
    if (!el) return;
    const fit = () => {
      const panel = el.closest<HTMLElement>("[data-scroll-panel]");
      if (!panel) return;
      const pad = Number.parseFloat(getComputedStyle(el.closest<HTMLElement>("[data-bleed]") ?? panel).paddingBottom) || 0;
      el.style.height = "";
      el.style.height = `${Math.max(240, Math.floor(panel.getBoundingClientRect().bottom - el.getBoundingClientRect().top - pad))}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [empty, kind]);
  const base = `/${slug}/inventario/productos`;
  const href = (id?: string) => (id ? `${base}/${id}` : `${base}/nuevo?tipo=${kind}`);

  const setVista = (next: CatalogVista) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("vista", next);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };
  const clear = () => {
    setQ("");
    setCategoryId("");
  };
  const newLabel = `Nuevo ${KIND_LABELS[kind].one.toLowerCase()}`;
  const newButton = canManage ? (
    <Link href={href()} className={cn(buttonVariants({ variant: "accent" }), "h-11 rounded-full px-6 text-sm font-semibold")}>
      <Plus aria-hidden="true" className="size-4" /> {newLabel}
    </Link>
  ) : null;

  return (
    <div className="grid gap-4">
      {low.length ? (
        <p className="flex items-start gap-3 rounded-2xl bg-warning/10 px-5 py-3.5 text-ui">
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
        {empty ? null : (
          <div className="relative order-last min-w-0 basis-full sm:order-none sm:flex-1 sm:basis-80">
            <SearchField aria-label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, referencia o marca" shortcut={q ? undefined : "/"} className={cn("h-11 rounded-full border-border/60 bg-card pl-11", q && "pr-11")} containerClassName="basis-full" />
            {q ? (
              <button type="button" aria-label="Borrar la búsqueda" onClick={() => setQ("")} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground outline-none hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                <X aria-hidden="true" className="size-4" />
              </button>
            ) : null}
          </div>
        )}
        {categories.length > 0 && !empty ? (
          <Select aria-label="Categoría" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="h-11 w-56 rounded-full">
            <option value="">Todas las categorías</option>
            {categories.filter((c) => !c.parentId).sort((a, b) => a.position - b.position).flatMap((c) => [
              <option key={c.id} value={c.id}>{c.name}</option>,
              ...categories.filter((s) => s.parentId === c.id).map((s) => <option key={s.id} value={s.id}>{categoryPath(categories, s.id)}</option>),
            ])}
          </Select>
        ) : null}
        {empty ? <span className="ml-auto" /> : <div role="group" aria-label="Vista" className="ml-auto flex h-11 items-center gap-0.5 rounded-full border border-border/60 bg-card p-1">
          {([
            ["tarjetas", "Vista de tarjetas", LayoutGrid],
            ["tabla", "Vista de tabla", List],
          ] as const).map(([value, label, Icon]) => (
            <button key={value} type="button" aria-pressed={vista === value} aria-label={label} onClick={() => setVista(value)} className={cn("grid size-9 place-items-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-ring", vista === value ? "bg-accent-subtle text-accent-text" : "text-muted-foreground hover:text-foreground")}>
              <Icon aria-hidden="true" className="size-4" />
            </button>
          ))}
        </div>}
        {newButton}
      </div>

      {list.length === 0 ? (
        filtered ? (
          <EmptyState
            mark="page"
            remember={false}
            headingLevel={2}
            title={`Ningún ${KIND_LABELS[kind].one.toLowerCase()} coincide con estos filtros`}
            description="Prueba con otra palabra o quita los filtros para ver todo el catálogo."
            icon={<Search />}
            action={<button type="button" onClick={clear} className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-full border-border/60 bg-transparent px-5")}><X aria-hidden="true" className="size-4" /> Quitar filtros</button>}
          />
        ) : (
          <section ref={emptyRef} aria-labelledby="cat-vacio" className="flex flex-col gap-6 rounded-(--radius-widget) border border-border/60 bg-card p-6 sm:p-8">
            <div className="grid justify-items-center gap-3 text-center">
              <span aria-hidden="true" className="grid size-16 place-items-center rounded-full bg-accent-subtle text-accent-text">
                <Package className="size-7" strokeWidth={1.6} />
              </span>
              <h2 id="cat-vacio" className="font-display text-xl font-semibold text-foreground">Aún no hay {KIND_LABELS[kind].many.toLowerCase()}</h2>
              <p className="max-w-md text-ui text-muted-foreground">{KIND_LABELS[kind].hint} Créalos uno a uno o cárgalos todos de una vez desde Excel.</p>
              <div className="mt-1 flex flex-wrap justify-center gap-2.5">
                {newButton}
                {canManage ? <Link href={`/${slug}/data`} className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-full border-border/60 bg-transparent px-5")}>Importar desde Excel</Link> : null}
              </div>
            </div>
            <ul aria-hidden="true" className="grid min-h-0 flex-1 grid-cols-2 content-start gap-4 overflow-hidden sm:grid-cols-4">
              {[0, 1, 2, 3].map((n) => (
                <li key={n} className="grid gap-3 rounded-3xl border border-dashed border-border-strong p-2.5" style={{ opacity: 1 - n * 0.2 }}>
                  <span className="grid aspect-[4/3] place-items-center rounded-2xl bg-surface-muted text-muted-foreground">{n === 0 ? <Plus className="size-6" /> : null}</span>
                  <span className="grid gap-1.5 px-1.5 pb-1.5">
                    <i className="block h-3 w-3/4 rounded-full bg-surface-muted" />
                    <i className="block h-3 w-1/3 rounded-full bg-surface-muted" />
                  </span>
                </li>
              ))}
            </ul>
            <ul className="grid gap-3 sm:grid-cols-3 [@media(max-height:700px)]:hidden">
              {[
                { icon: <ScanBarcode />, title: "Vende con el lector", text: "Código de barras y foto: el punto de venta los reconoce." },
                { icon: <Tags />, title: "Categorías y variantes", text: "Talla, color y precios por lista de clientes." },
                { icon: <Wallet />, title: "Stock y márgenes", text: "Existencias por bodega, costo y ganancia." },
              ].map((h) => (
                <li key={h.title} className="flex items-start gap-3 rounded-2xl bg-surface-muted/60 p-4">
                  <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-accent-text [&_svg]:size-4">{h.icon}</span>
                  <span className="grid gap-0.5">
                    <b className="text-ui font-semibold text-foreground">{h.title}</b>
                    <span className="text-xs text-muted-foreground">{h.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )
      ) : vista === "tarjetas" ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {list.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setOpen(p)} className={cn("group relative grid w-full gap-3 overflow-hidden rounded-3xl border border-border/60 bg-card p-2.5 text-left transition-colors hover:border-accent/50 hover:bg-accent-subtle/20 focus-visible:outline-2 focus-visible:outline-ring", !p.active && "opacity-60")}>
                <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface-muted"><Thumb product={p} className="transition-transform duration-200 group-hover:scale-[1.03]" /></span>
                {p.favorite ? <Star aria-label="Favorito" className="absolute right-5 top-5 size-4 fill-accent text-accent drop-shadow" /> : null}
                <span className="grid gap-1.5 px-1.5 pb-1.5">
                  <b className="line-clamp-2 text-sm font-medium leading-snug">{p.name}</b>
                  <b className="font-display text-sm font-semibold tabular-nums">{formatCurrency(p.price)}</b>
                  <span className="flex flex-wrap gap-1.5">
                    <StockBadge product={p} />
                    {p.durationDays ? <Badge tone="neutral">{p.durationDays} días</Badge> : null}
                    {p.durationMinutes ? <Badge tone="neutral">{p.durationMinutes} min</Badge> : null}
                    {!p.active ? <Badge tone="muted">No disponible</Badge> : null}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <AdaptiveTable<ProductRow>
          caption={`${KIND_LABELS[kind].many} del catálogo`}
          className="rounded-(--radius-widget) border-border/60"
          rows={list}
          getRowId={(p) => p.id}
          rowClassName={(p) => (p.active ? undefined : "opacity-60")}
          columns={[
            {
              key: "name",
              header: KIND_LABELS[kind].one,
              role: "primary",
              cell: (p) => (
                <button type="button" onClick={() => setOpen(p)} className="flex min-w-0 items-center gap-2.5 text-left outline-none hover:text-accent-text focus-visible:outline-2 focus-visible:outline-ring">
                  <span className="relative block size-11 shrink-0 overflow-hidden rounded-xl"><Thumb product={p} /></span>
                  <span className="truncate font-medium">{p.name}</span>
                  {p.favorite ? <Star aria-label="Favorito" className="size-3.5 shrink-0 fill-accent text-accent" /> : null}
                </button>
              ),
            },
            { key: "sku", header: "Referencia", role: "detail", cell: (p) => p.sku ?? "" },
            { key: "category", header: "Categoría", role: "detail", cell: (p) => categoryPath(categories, p.categoryId) || (p.category ?? "") },
            { key: "price", header: "Precio", role: "figure", cell: (p) => <span className="font-display font-semibold tabular-nums">{formatCurrency(p.price)}</span> },
            { key: "stock", header: "Existencias", role: "status", cell: (p) => <StockBadge product={p} /> },
          ]}
        />
      )}

      {open ? <ProductDetail slug={slug} product={open} customers={customers} canManage={canManage} onEdit={() => router.push(href(open.id))} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

