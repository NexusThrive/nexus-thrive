"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, Percent, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Input } from "@/components/atoms/input";
import { EmptyState } from "@/components/molecules/empty-state";
import { MoneyInput } from "@/components/molecules/money-input";
import { SearchField } from "@/components/molecules/search-field";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import type { PriceListLine, PriceListRow } from "@/lib/business/catalog/price-lists-db";
import { formatCurrency } from "@/lib/foundation/format";
import { deletePriceListAction, makeDefaultPriceListAction, renamePriceListAction, savePriceListPricesAction, setPriceListActiveAction } from "@/app/[tenant]/(app)/ventas/listas-precios/actions";

/** Los precios de una lista: se editan en la tabla y se guardan juntos. «Aplicar %» propone un precio por descuento o recargo. */
export default function PriceListDetail({ slug, list, lines }: { slug: string; list: PriceListRow; lines: PriceListLine[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [pending, start] = useTransition();
  const [name, setName] = useState(list.name);
  const [q, setQ] = useState("");
  const [pct, setPct] = useState("");
  const [prices, setPrices] = useState<Record<string, number | null>>(() => Object.fromEntries(lines.map((l) => [l.productId, l.listPrice])));
  const base = `/${slug}/ventas/listas-precios`;

  const changed = useMemo(() => lines.filter((l) => (prices[l.productId] ?? null) !== l.listPrice), [lines, prices]);
  const text = q.trim().toLowerCase();
  const shown = lines.filter((l) => !text || [l.name, l.sku].some((x) => x?.toLowerCase().includes(text)));

  const run = (job: () => Promise<{ ok: boolean; message?: string }>, done: string, after?: () => void) =>
    start(async () => {
      const result = await job().catch(() => ({ ok: false, message: "No se pudo completar. Inténtalo de nuevo." }));
      toast(result.ok ? done : (result.message ?? "No se pudo completar"), result.ok ? "success" : "error");
      if (result.ok) (after ?? (() => router.refresh()))();
    });

  const applyPercent = () => {
    const n = Number(pct.replace(",", "."));
    if (!Number.isFinite(n) || n === 0) return toast("Escribe un porcentaje, por ejemplo -10 para un descuento o 15 para un recargo.", "error");
    setPrices((current) => {
      const next = { ...current };
      for (const l of shown) next[l.productId] = Math.max(0, Math.round((l.basePrice * (1 + n / 100)) / 10) * 10);
      return next;
    });
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={base} aria-label="Volver a las listas" className={buttonVariants({ variant: "ghost", size: "icon" })}><ArrowLeft aria-hidden="true" className="size-4" /></Link>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Input aria-label="Nombre de la lista" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className="max-w-xs font-display text-lg font-bold" />
          {name.trim() !== list.name ? <Button type="button" size="sm" loading={pending} onClick={() => run(() => renamePriceListAction(slug, list.id, name), "Nombre actualizado")}>Guardar nombre</Button> : null}
          {list.isDefault ? <Badge tone="success">Predeterminada</Badge> : !list.active ? <Badge tone="muted">Inactiva</Badge> : null}
        </div>
        {!list.isDefault ? <Button type="button" variant="outline" onClick={() => run(() => makeDefaultPriceListAction(slug, list.id), "Ahora es la predeterminada")}><Star aria-hidden="true" className="size-4" /> Hacer predeterminada</Button> : null}
        {!list.isDefault ? <Button type="button" variant="outline" onClick={() => run(() => setPriceListActiveAction(slug, list.id, !list.active), list.active ? "Lista desactivada" : "Lista activada")}>{list.active ? "Desactivar" : "Activar"}</Button> : null}
        {!list.isDefault ? (
          <Button type="button" variant="ghost" className="text-danger" onClick={async () => { if (await confirm({ title: "Eliminar la lista", description: `«${list.name}» y sus precios se borran. Los productos conservan su precio base.`, confirmLabel: "Eliminar", tone: "danger" })) run(() => deletePriceListAction(slug, list.id), "Lista eliminada", () => router.push(base)); }}><Trash2 aria-hidden="true" className="size-4" /> Eliminar</Button>
        ) : null}
      </div>

      {lines.length === 0 ? (
        <EmptyState mark="page" headingLevel={2} title="Aún no hay productos para fijar precios" description="Crea productos en el catálogo y aquí podrás darles un precio propio en esta lista." icon={<Package />} action={<Link href={`/${slug}/inventario/productos/nuevo`} className={buttonVariants({ variant: "accent", size: "sm", className: "h-[34px]" })}>Nuevo producto</Link>} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <SearchField aria-label="Buscar producto" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o referencia" containerClassName="basis-72" />
            <div className="ml-auto flex items-center gap-2">
              <Input aria-label="Porcentaje a aplicar a los productos que ves" value={pct} inputMode="decimal" placeholder="-10 o 15" onChange={(e) => setPct(e.target.value)} className="w-28" />
              <Button type="button" variant="outline" onClick={applyPercent}><Percent aria-hidden="true" className="size-4" /> Aplicar %</Button>
              <Button type="button" loading={pending} disabled={changed.length === 0} onClick={() => run(() => savePriceListPricesAction(slug, list.id, changed.map((l) => ({ productId: l.productId, price: prices[l.productId] ?? null }))), `${changed.length} ${changed.length === 1 ? "precio guardado" : "precios guardados"}`)}>Guardar {changed.length > 0 ? `(${changed.length})` : ""}</Button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Precios de la lista {list.name}</caption>
              <thead className="border-b border-border bg-surface-muted text-xs text-muted-foreground"><tr><th scope="col" className="px-3 py-2 font-medium">Producto</th><th scope="col" className="px-3 py-2 text-right font-medium">Precio base</th><th scope="col" className="w-56 px-3 py-2 font-medium">Precio en esta lista</th><th scope="col" className="px-3 py-2 text-right font-medium">Diferencia</th></tr></thead>
              <tbody className="divide-y divide-border">
                {shown.map((l) => {
                  const price = prices[l.productId] ?? null;
                  const diff = price != null && l.basePrice > 0 ? Math.round(((price - l.basePrice) / l.basePrice) * 1000) / 10 : null;
                  return (
                    <tr key={l.productId}>
                      <th scope="row" className="px-3 py-2 font-medium">{l.name}{l.sku ? <span className="ms-2 font-normal text-muted-foreground">{l.sku}</span> : null}</th>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">{formatCurrency(l.basePrice)}</td>
                      <td className="px-3 py-1.5"><MoneyInput aria-label={`Precio de ${l.name} en la lista`} value={price} onValueChange={(v) => setPrices((p) => ({ ...p, [l.productId]: v }))} placeholder="Precio base" /></td>
                      <td className={`px-3 py-2 text-right font-mono tabular-nums ${diff == null ? "" : diff < 0 ? "text-success" : diff > 0 ? "text-danger" : "text-muted-foreground"}`}>{diff == null ? "" : `${diff > 0 ? "+" : ""}${diff.toLocaleString("es-CO")} %`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {confirmDialog}
    </div>
  );
}
