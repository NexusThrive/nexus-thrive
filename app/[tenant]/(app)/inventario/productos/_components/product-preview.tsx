import type { ReactNode } from "react";
import { Package, Star } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { formatCurrency } from "@/lib/foundation/format";
import { cn } from "@/lib/utils";

/**
 * Cómo se verá el producto: la ficha del punto de venta, la tarjeta de la tienda y la fila del catálogo, con lo que se va escribiendo
 * en el formulario. Es solo lectura y no consulta nada: recibe el borrador.
 */
export type PreviewData = {
  name: string;
  price: number | null;
  categoryLabel: string;
  brand: string;
  imageSrc: string | null;
  favorite: boolean;
  trackStock: boolean;
  stock: number | null;
  posEnabled: boolean;
  publishedOnline: boolean;
  active: boolean;
  customizable: boolean;
  description?: string;
  /** Atributos elegidos (talla, color…) con sus valores, tal como se ven en la ficha. */
  options?: { name: string; values: { name: string; hex: string | null }[] }[];
};

/**
 * Foto o icono. Va siempre dentro de una caja `relative` con tamaño propio y se dibuja con `absolute inset-0`: así el tamaño original de
 * la imagen nunca empuja a la caja (una foto de 4000 px no ensancha ni alarga la previsualización).
 */
function Photo({ src }: { src: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- vista previa de un archivo local o del negocio
    <img src={src} alt="" className="absolute inset-0 size-full max-w-none object-cover" />
  ) : (
    <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-accent-subtle text-accent-text">
      <Package className="size-1/2 max-h-10 max-w-10" strokeWidth={1.4} />
    </span>
  );
}

const label = "text-xs font-medium text-muted-foreground";

export function ProductPreview({ data, actions }: { data: PreviewData; actions?: ReactNode }) {
  const name = data.name.trim() || "Nombre del producto";
  const price = data.price != null ? formatCurrency(data.price) : "$ 0";
  const dim = !data.name.trim();
  return (
    <aside aria-label="Previsualización del producto" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <div className="grid min-w-0 gap-3 rounded-(--radius-widget) border border-border/60 bg-card p-3">
        <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface-muted">
          <Photo src={data.imageSrc} />
          {data.favorite ? <Star aria-label="Destacado" className="absolute right-3 top-3 size-5 fill-accent text-accent drop-shadow" /> : null}
        </span>
        <div className={cn("grid min-w-0 gap-1.5 px-1.5", dim && "opacity-60")}>
          {data.categoryLabel ? <span className="text-xs text-muted-foreground">{data.categoryLabel}</span> : null}
          <b className="line-clamp-2 break-words font-display text-base font-semibold leading-snug">{name}</b>
          {data.description?.trim() ? <p className="line-clamp-3 text-xs text-muted-foreground">{data.description.trim()}</p> : null}
          <p className="flex flex-wrap items-baseline gap-2">
            <b className="font-display text-lg font-semibold tabular-nums">{price}</b>
            {data.brand.trim() ? <span className="text-xs text-muted-foreground">{data.brand.trim()}</span> : null}
          </p>
        </div>
        {data.options?.some((o) => o.values.length > 0) ? (
          <div className="grid gap-2 px-1.5">
            {data.options.filter((o) => o.values.length > 0).map((o) => (
              <div key={o.name} className="flex flex-wrap items-center gap-1.5">
                <span className="w-full text-xs text-muted-foreground">{o.name}</span>
                {o.values.map((v) => (
                  <span key={v.name} className="inline-flex h-7 min-w-7 items-center justify-center gap-1.5 rounded-full border border-border/60 bg-surface-muted/60 px-2.5 text-2xs font-medium">
                    {v.hex ? <span aria-hidden="true" className="size-3 rounded-full border border-border" style={{ background: v.hex }} /> : null}
                    {v.name}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ) : null}
        {actions ? <div className="grid grid-cols-2 gap-2 px-0.5 pb-0.5">{actions}</div> : null}
      </div>

      <div className="grid min-w-0 gap-2 rounded-(--radius-widget) border border-border/60 bg-card p-4">
        <p className="text-ui font-semibold">Dónde se verá</p>
        <div className="grid min-w-0 gap-1">
          <p className={label}>Punto de venta</p>
          {data.posEnabled && data.active ? (
            <div className={cn("relative flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl bg-surface-muted/60 p-2", dim && "opacity-60")}>
              <span className="relative block size-11 shrink-0 overflow-hidden rounded-xl"><Photo src={data.imageSrc} /></span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm font-medium">{name}</b>
                <span className="block truncate text-xs tabular-nums text-muted-foreground">{price}</span>
              </span>
              {data.customizable ? <Badge tone="neutral" className="shrink-0">A medida</Badge> : null}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-border-strong px-3 py-3 text-center text-xs text-muted-foreground">{data.active ? "No aparece en el punto de venta." : "Está marcado como no disponible."}</p>
          )}
        </div>
        <div className="grid min-w-0 gap-1">
          <p className={label}>Tienda en línea</p>
          <p className={cn("rounded-2xl px-3 py-3 text-xs", data.publishedOnline && data.active ? "bg-success/10 text-success" : "border border-dashed border-border-strong text-center text-muted-foreground")}>
            {data.publishedOnline && data.active ? "Se publica en la tienda con esta misma ficha." : "No se publica en la tienda."}
          </p>
        </div>
        <div className="grid min-w-0 gap-1">
          <p className={label}>Catálogo</p>
          <div className={cn("flex min-w-0 items-center gap-2.5 overflow-hidden rounded-2xl bg-surface-muted/60 p-2", dim && "opacity-60")}>
            <span className="relative block size-9 shrink-0 overflow-hidden rounded-lg"><Photo src={data.imageSrc} /></span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
            {data.trackStock ? <Badge tone={data.stock === 0 ? "danger" : "success"} className="shrink-0">{data.stock === 0 ? "Agotado" : `${data.stock ?? 0} disp.`}</Badge> : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
