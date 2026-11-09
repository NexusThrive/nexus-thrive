"use client";

import { useState } from "react";
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

/** Datos de ejemplo detrás del catálogo vacío (formato de los estados vacíos: packages/brand/docs/04-patrones/estados-vacios.md). */
const PRODUCT_PREVIEW = {
  columns: ["Producto", "Categoría", "Precio", "Existencias"],
  rows: [
    ["Camiseta básica", "Ropa", "$ 45.000", "24 disp."],
    ["Gaseosa 400 ml", "Bebidas", "$ 3.500", "120 disp."],
    ["Taza personalizada", "Merchandising", "$ 28.000", ""],
    ["Instalación", "Servicios", "$ 80.000", ""],
  ],
};

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
    <Link href={href()} className={buttonVariants({ variant: "accent", size: "sm", className: "h-[34px]" })}>
      <Plus aria-hidden="true" className="size-4" /> {newLabel}
    </Link>
  ) : null;

  return (
    <div className="grid gap-4">
      {low.length ? (
        <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-ui">
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
        <SearchField aria-label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, referencia o marca" containerClassName="order-last basis-full sm:order-none sm:basis-72" />
        {categories.length > 0 ? (
          <Select aria-label="Categoría" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-52">
            <option value="">Todas las categorías</option>
            {categories.filter((c) => !c.parentId).sort((a, b) => a.position - b.position).flatMap((c) => [
              <option key={c.id} value={c.id}>{c.name}</option>,
              ...categories.filter((s) => s.parentId === c.id).map((s) => <option key={s.id} value={s.id}>{categoryPath(categories, s.id)}</option>),
            ])}
          </Select>
        ) : null}
        <div role="group" aria-label="Vista" className="ml-auto flex h-[34px] items-center rounded-lg border border-border p-0.5">
          {([
            ["tarjetas", "Vista de tarjetas", LayoutGrid],
            ["tabla", "Vista de tabla", List],
          ] as const).map(([value, label, Icon]) => (
            <button key={value} type="button" aria-pressed={vista === value} aria-label={label} onClick={() => setVista(value)} className={cn("grid h-[28px] w-8 place-items-center rounded-md outline-none focus-visible:outline-2 focus-visible:outline-ring", vista === value ? "bg-surface-muted text-accent-text" : "text-muted-foreground hover:text-foreground")}>
              <Icon aria-hidden="true" className="size-4" />
            </button>
          ))}
        </div>
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
            action={<button type="button" onClick={clear} className={buttonVariants({ variant: "outline", size: "sm", className: "h-[34px]" })}><X aria-hidden="true" className="size-4" /> Quitar filtros</button>}
          />
        ) : (
          <EmptyState
            mark="page"
            headingLevel={2}
            title={`Aún no hay ${KIND_LABELS[kind].many.toLowerCase()}`}
            description={`${KIND_LABELS[kind].hint} Créalos uno a uno o cárgalos todos de una vez desde Excel.`}
            icon={<Package />}
            preview={kind === "PRODUCT" ? PRODUCT_PREVIEW : undefined}
            action={newButton ?? undefined}
            secondaryAction={canManage ? <Link href={`/${slug}/data`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-[34px] border border-border")}>Importar desde Excel</Link> : undefined}
            highlights={[
              { icon: <ScanBarcode />, title: "Vende con el lector", text: "Código de barras y foto: el punto de venta los reconoce." },
              { icon: <Tags />, title: "Categorías y variantes", text: "Talla, color y precios por lista de clientes." },
              { icon: <Wallet />, title: "Stock y márgenes", text: "Existencias por bodega, costo y ganancia." },
            ]}
          />
        )
      ) : vista === "tarjetas" ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {list.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setOpen(p)} className={cn("group relative grid w-full overflow-hidden rounded-xl border border-border bg-surface text-left transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-ring", !p.active && "opacity-60")}>
                <span className="relative block aspect-[4/3] w-full overflow-hidden bg-surface-muted"><Thumb product={p} className="transition-transform duration-200 group-hover:scale-[1.03]" /></span>
                {p.favorite ? <Star aria-label="Favorito" className="absolute right-2 top-2 size-4 fill-accent text-accent drop-shadow" /> : null}
                <span className="grid gap-1.5 p-3">
                  <b className="line-clamp-2 text-sm font-medium leading-snug">{p.name}</b>
                  <b className="font-mono text-sm tabular-nums">{formatCurrency(p.price)}</b>
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
                  <span className="relative block size-9 shrink-0 overflow-hidden rounded-md"><Thumb product={p} /></span>
                  <span className="truncate font-medium">{p.name}</span>
                  {p.favorite ? <Star aria-label="Favorito" className="size-3.5 shrink-0 fill-accent text-accent" /> : null}
                </button>
              ),
            },
            { key: "sku", header: "Referencia", role: "detail", cell: (p) => p.sku ?? "" },
            { key: "category", header: "Categoría", role: "detail", cell: (p) => categoryPath(categories, p.categoryId) || (p.category ?? "") },
            { key: "price", header: "Precio", role: "figure", cell: (p) => <span className="font-mono tabular-nums">{formatCurrency(p.price)}</span> },
            { key: "stock", header: "Existencias", role: "status", cell: (p) => <StockBadge product={p} /> },
          ]}
        />
      )}

      {open ? <ProductDetail slug={slug} product={open} customers={customers} canManage={canManage} onEdit={() => router.push(href(open.id))} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

