"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, textareaClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { validateTransfer } from "@/lib/inventory/stock-docs";
import type { OverviewRow } from "@/lib/inventory/stock-docs-db";
import { createTransferAction } from "@/app/[tenant]/(app)/stock/actions";
import type { WarehouseOption } from "./stock-view";

type Line = { key: number; productId: string; quantity: string };

/** Nuevo traslado: sale de una bodega y entra a otra con el costo promedio de la de origen. */
export default function TransferSheet({ slug, warehouses, products, overview, onClose }: { slug: string; warehouses: WarehouseOption[]; products: { id: string; name: string }[]; overview: OverviewRow[]; onClose: () => void }) {
  const [from, setFrom] = useState(warehouses[0]?.id ?? "");
  const [to, setTo] = useState(warehouses[1]?.id ?? "");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([{ key: 1, productId: "", quantity: "1" }]);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const available = (productId: string) => overview.find((o) => o.productId === productId && o.warehouseId === from)?.quantity ?? 0;
  const parsed = lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) || 0 }));
  const problem = validateTransfer({ fromWarehouseId: from, toWarehouseId: to, lines: parsed });
  const set = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const save = () =>
    start(async () => {
      const r = await createTransferAction(slug, { fromWarehouseId: from, toWarehouseId: to, note, lines: parsed });
      if (r.ok) {
        toast(r.message, "success");
        router.refresh();
        onClose();
      } else toast({ title: "No se hizo el traslado", description: r.message, variant: "error" });
    });

  return (
    <ResponsiveSheet
      drawer
      size="lg"
      open
      onOpenChange={(o) => !o && onClose()}
      busy={pending}
      title="Nuevo traslado"
      description="Mueve mercancía entre bodegas. El valor del inventario se conserva."
      footer={
        <>
          <span className="mr-auto self-center text-[13px] text-muted-foreground" role="status">
            {problem ?? "Listo para trasladar"}
          </span>
          <button type="button" onClick={onClose} disabled={pending} className={buttonVariants({ variant: "outline" })}>
            Cancelar
          </button>
          <button type="button" disabled={pending || !!problem} onClick={save} className={buttonVariants()}>
            {pending ? "Trasladando…" : "Trasladar"}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sale de">
            {(c) => (
              <Select {...c} value={from} onChange={(e) => setFrom(e.target.value)}>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Llega a">
            {(c) => (
              <Select {...c} value={to} onChange={(e) => setTo(e.target.value)}>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <section className="grid gap-2">
          <h3 className="text-[13px] font-semibold">Productos</h3>
          {lines.map((l, i) => (
            <div key={l.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-border p-2.5 sm:grid-cols-[minmax(0,2fr)_110px_auto] sm:items-end">
              <label className="grid gap-1 text-xs font-medium max-sm:col-span-2">
                Producto
                <Select value={l.productId} onChange={(e) => set(l.key, { productId: e.target.value })}>
                  <option value="">Elige un producto</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (hay {available(p.id)})
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Cantidad
                <input inputMode="numeric" value={l.quantity} onChange={(e) => set(l.key, { quantity: e.target.value.replace(/\D/g, "") })} className={inputClasses} />
              </label>
              <button type="button" aria-label={`Quitar producto ${i + 1}`} disabled={lines.length === 1} onClick={() => setLines(lines.filter((x) => x.key !== l.key))} className={buttonVariants({ variant: "ghost", size: "icon", className: "max-sm:col-start-2 max-sm:row-start-1" })}>
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
              {l.productId && Number(l.quantity) > available(l.productId) ? <p role="alert" className="col-span-full text-xs text-danger">Solo hay {available(l.productId)} en la bodega de origen.</p> : null}
            </div>
          ))}
          <button type="button" onClick={() => setLines([...lines, { key: Date.now(), productId: "", quantity: "1" }])} className={buttonVariants({ variant: "outline", size: "sm", className: "justify-self-start" })}>
            <Plus aria-hidden="true" className="size-3.5" /> Agregar producto
          </button>
        </section>
        <Field label="Nota" optional>
          {(c) => <textarea {...c} rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={textareaClasses} placeholder="Reposición de la sede norte" />}
        </Field>
      </div>
    </ResponsiveSheet>
  );
}
