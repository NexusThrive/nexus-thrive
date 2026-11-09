"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Layers, Package, Percent, Plus, Star, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Input } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { Switch } from "@/components/atoms/switch";
import { Field } from "@/components/molecules/field";
import { FormDialog } from "@/components/organisms/form-sheet";
import type { PriceTierInput } from "@/lib/business/catalog/pricing";
import { EmptyState } from "@/components/molecules/empty-state";
import { MoneyInput } from "@/components/molecules/money-input";
import { SearchField } from "@/components/molecules/search-field";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import type { PriceListLine, PriceListRow } from "@/lib/business/catalog/price-lists-db";
import { formatCurrency } from "@/lib/foundation/format";
import { assignPriceListAction, deletePriceListAction, makeDefaultPriceListAction, renamePriceListAction, savePriceListPricesAction, savePriceTiersAction, setPriceListActiveAction } from "@/app/[tenant]/(app)/ventas/listas-precios/actions";

/** Los precios de una lista: se editan en la tabla y se guardan juntos. «Aplicar %» propone un precio por descuento o recargo. */
export default function PriceListDetail({ slug, list, lines, tiers = {}, groups = [], assigned = [], customers = [] }: { slug: string; list: PriceListRow; lines: PriceListLine[]; tiers?: Record<string, PriceTierInput[]>; groups?: { id: string; name: string; usesThis: boolean }[]; assigned?: { id: string; name: string }[]; customers?: { id: string; name: string }[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [pending, start] = useTransition();
  const [name, setName] = useState(list.name);
  const [q, setQ] = useState("");
  const [pct, setPct] = useState("");
  const [prices, setPrices] = useState<Record<string, number | null>>(() => Object.fromEntries(lines.map((l) => [l.productId, l.listPrice])));
  const base = `/${slug}/ventas/listas-precios`;
  const [editingTiers, setEditingTiers] = useState<PriceListLine | null>(null);
  const [draftTiers, setDraftTiers] = useState<{ qty: string; price: number | null }[]>([]);
  const [pickCustomer, setPickCustomer] = useState("");
  const openTiers = (l: PriceListLine) => {
    setDraftTiers((tiers[l.productId] ?? []).map((t) => ({ qty: String(t.minQty), price: t.price })));
    setEditingTiers(l);
  };

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
              <thead className="border-b border-border bg-surface-muted text-xs text-muted-foreground"><tr><th scope="col" className="px-3 py-2 font-medium">Producto</th><th scope="col" className="px-3 py-2 text-right font-medium">Precio base</th><th scope="col" className="w-56 px-3 py-2 font-medium">Precio en esta lista</th><th scope="col" className="px-3 py-2 text-right font-medium">Diferencia</th><th scope="col" className="px-3 py-2 font-medium">Por cantidad</th></tr></thead>
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
                      <td className="px-3 py-1.5">
                        <button type="button" onClick={() => openTiers(l)} aria-label={`Precios por cantidad de ${l.name}`} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:min-h-11">
                          <Layers aria-hidden="true" className="size-3.5" />{tiers[l.productId]?.length ? `${tiers[l.productId]!.length} ${tiers[l.productId]!.length === 1 ? "escalón" : "escalones"}` : "Agregar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <section aria-labelledby="aplica-a" className="grid gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 id="aplica-a" className="flex items-center gap-2 font-display text-base font-semibold"><Users aria-hidden="true" className="size-4" />A quién se aplica</h2>
        <p className="text-ui text-muted-foreground">Un cliente usa la lista que tenga asignada; si no, la de su grupo; si no, la predeterminada.</p>
        {groups.length > 0 ? (
          <ul className="grid gap-2">
            {groups.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <span className="min-w-0 truncate text-ui font-medium">Grupo «{g.name}»</span>
                <Switch checked={g.usesThis} disabled={pending} aria-label={`Aplicar esta lista al grupo ${g.name}`} onCheckedChange={(on) => run(() => assignPriceListAction(slug, { groupId: g.id }, on ? list.id : null), on ? "Lista asignada al grupo" : "Lista quitada del grupo")} />
              </li>
            ))}
          </ul>
        ) : null}
        <div className="grid gap-2">
          {assigned.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {assigned.map((c) => (
                <li key={c.id} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-ui">
                  {c.name}
                  <button type="button" aria-label={`Quitar la lista a ${c.name}`} disabled={pending} onClick={() => run(() => assignPriceListAction(slug, { customerId: c.id }, null), "Lista quitada")} className="grid size-5 place-items-center rounded-full outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"><Trash2 aria-hidden="true" className="size-3" /></button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-64 max-w-full">
              <Select aria-label="Cliente al que asignar la lista" value={pickCustomer} onChange={(e) => setPickCustomer(e.target.value)}>
                <option value="">Asignar a un cliente…</option>
                {customers.filter((c) => !assigned.some((a) => a.id === c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <Button type="button" variant="outline" disabled={!pickCustomer || pending} onClick={() => run(() => assignPriceListAction(slug, { customerId: pickCustomer }, list.id), "Lista asignada al cliente", () => { setPickCustomer(""); router.refresh(); })}><Plus aria-hidden="true" className="size-4" /> Asignar</Button>
          </div>
        </div>
      </section>

      <FormDialog
        open={editingTiers !== null}
        onOpenChange={(o) => !o && setEditingTiers(null)}
        title={editingTiers ? `Por cantidad: ${editingTiers.name}` : "Por cantidad"}
        description="Desde cierta cantidad, cada unidad cuesta menos. Se aplica el escalón más alto que la cantidad alcance."
        submitLabel="Guardar escalones"
        onSubmit={async () => {
          if (!editingTiers) return { ok: true };
          const parsed = draftTiers.map((t) => ({ minQty: Number(t.qty), price: t.price ?? Number.NaN }));
          if (parsed.some((t) => Number.isNaN(t.price))) return { ok: false, message: "Escribe el precio de cada escalón." };
          const result = await savePriceTiersAction(slug, list.id, editingTiers.productId, parsed);
          return result.ok ? { ok: true, message: "Escalones guardados" } : { ok: false, message: result.message };
        }}
        onSuccess={() => { toast("Escalones guardados", "success"); router.refresh(); }}
      >
        <div className="grid gap-3">
          {editingTiers ? <p className="text-ui text-muted-foreground">Precio base {formatCurrency(editingTiers.basePrice)}{prices[editingTiers.productId] != null ? ` · en la lista ${formatCurrency(prices[editingTiers.productId]!)}` : ""}</p> : null}
          {draftTiers.map((t, i) => (
            <div key={i} className="grid grid-cols-[6rem_minmax(0,1fr)_auto] items-end gap-2">
              <Field label="Desde (u.)">{(c) => <Input {...c} inputMode="numeric" value={t.qty} onChange={(e) => setDraftTiers((d) => d.map((x, j) => (j === i ? { ...x, qty: e.target.value.replace(/[^\d]/g, "") } : x)))} />}</Field>
              <Field label="Precio por unidad">{(c) => <MoneyInput id={c.id} aria-describedby={c["aria-describedby"]} value={t.price} onValueChange={(v) => setDraftTiers((d) => d.map((x, j) => (j === i ? { ...x, price: v } : x)))} />}</Field>
              <button type="button" aria-label={`Quitar el escalón ${i + 1}`} onClick={() => setDraftTiers((d) => d.filter((_, j) => j !== i))} className={buttonVariants({ variant: "ghost", size: "icon" })}><Trash2 aria-hidden="true" className="size-4" /></button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="justify-self-start" disabled={draftTiers.length >= 10} onClick={() => setDraftTiers((d) => [...d, { qty: String((Number(d[d.length - 1]?.qty) || 1) + 5), price: null }])}><Plus aria-hidden="true" className="size-4" /> Agregar escalón</Button>
        </div>
      </FormDialog>
      {confirmDialog}
    </div>
  );
}
