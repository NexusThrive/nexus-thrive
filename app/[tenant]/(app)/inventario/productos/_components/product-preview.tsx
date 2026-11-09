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

const label = "text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground";

export function ProductPreview({ data }: { data: PreviewData }) {
  const name = data.name.trim() || "Nombre del producto";
  const price = data.price != null ? formatCurrency(data.price) : "$ 0";
  const dim = !data.name.trim();
  return (
    <aside aria-label="Previsualización del producto" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 overflow-hidden rounded-xl border border-border bg-surface p-4">
      <div className="grid min-w-0 gap-2">
        <p className={label}>En el punto de venta</p>
        {data.posEnabled && data.active ? (
          <div className={cn("relative flex min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-border bg-background p-2", dim && "opacity-60")}>
            <span className="relative block size-14 shrink-0 overflow-hidden rounded-md"><Photo src={data.imageSrc} /></span>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-sm font-medium">{name}</b>
              <span className="block truncate font-mono text-sm tabular-nums">{price}</span>
            </span>
            {data.customizable ? <Badge tone="neutral" className="shrink-0">A medida</Badge> : null}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-ui text-muted-foreground">{data.active ? "No aparece en el punto de venta." : "Está marcado como no disponible."}</p>
        )}
      </div>

      <div className="grid min-w-0 gap-2">
        <p className={label}>En la tienda en línea</p>
        {data.publishedOnline && data.active ? (
          <div className={cn("min-w-0 overflow-hidden rounded-xl border border-border bg-background", dim && "opacity-60")}>
            <span className="relative block aspect-[4/3] w-full overflow-hidden bg-surface-muted">
              <Photo src={data.imageSrc} />
              {data.favorite ? <Star aria-label="Destacado" className="absolute right-2 top-2 size-4 fill-accent text-accent drop-shadow" /> : null}
            </span>
            <span className="grid min-w-0 gap-1 p-3">
              {data.categoryLabel ? <span className="text-xs text-muted-foreground">{data.categoryLabel}</span> : null}
              <b className="line-clamp-2 break-words text-sm font-medium leading-snug">{name}</b>
              {data.brand.trim() ? <span className="text-xs text-muted-foreground">{data.brand.trim()}</span> : null}
              <b className="truncate font-mono text-base tabular-nums">{price}</b>
            </span>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-ui text-muted-foreground">No se publica en la tienda.</p>
        )}
      </div>

      <div className="grid min-w-0 gap-2">
        <p className={label}>En el catálogo</p>
        <div className={cn("flex min-w-0 items-center gap-2.5 overflow-hidden rounded-lg border border-border bg-background p-2", dim && "opacity-60")}>
          <span className="relative block size-9 shrink-0 overflow-hidden rounded-md"><Photo src={data.imageSrc} /></span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
          <span className="shrink-0 font-mono text-xs tabular-nums">{price}</span>
          {data.trackStock ? <Badge tone={data.stock === 0 ? "danger" : "success"} className="shrink-0">{data.stock === 0 ? "Agotado" : `${data.stock ?? 0} disp.`}</Badge> : null}
        </div>
      </div>
    </aside>
  );
}
