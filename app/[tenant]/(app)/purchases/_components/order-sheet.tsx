"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Select } from "@/components/atoms/select";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, textareaClasses } from "@/components/atoms/input";
import { Alert } from "@/components/molecules/alert";
import { Field } from "@/components/molecules/field";
import { MoneyInput } from "@/components/molecules/money-input";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { formatCurrency } from "@/lib/format";
import type { PartyRow } from "@/lib/parties/parties-db";
import { orderTotals } from "@/lib/purchasing/purchases";
import { createOrderAction } from "@/app/[tenant]/(app)/purchases/actions";

export type ProductOption = { id: string; name: string; cost: number | null; stock: number };
export type WarehouseOption = { id: string; name: string; isDefault: boolean };
type Line = { key: number; productId: string; quantity: string; unitCost: number | null; taxRatePct: string };
const TAXES = ["0", "5", "19"];

/** Nueva orden de compra: proveedor, productos con cantidad y costo, y a qué bodega llega. */
export default function OrderSheet({ slug, suppliers, products, warehouses, today, onClose, onNeedSupplier }: { slug: string; suppliers: PartyRow[]; products: ProductOption[]; warehouses: WarehouseOption[]; today: string; onClose: () => void; onNeedSupplier: () => void }) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [warehouseId, setWarehouseId] = useState(warehouses.find((w) => w.isDefault)?.id ?? "");
  const [expectedDate, setExpectedDate] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([{ key: 1, productId: "", quantity: "1", unitCost: null, taxRatePct: "0" }]);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const parsed = lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) || 0, unitCost: l.unitCost ?? 0, taxRatePct: Number(l.taxRatePct) || 0 }));
  const totals = orderTotals(parsed);
  const setLine = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const save = (markOrdered: boolean) =>
    start(async () => {
      const r = await createOrderAction(slug, { supplierPartyId: supplierId, warehouseId: warehouseId || null, expectedDate: expectedDate || null, note, lines: parsed, markOrdered });
      if (r.ok) {
        toast(r.message ?? "Orden creada", "success");
        router.refresh();
        onClose();
      } else toast({ title: "No se creó la orden", description: r.message, variant: "error" });
    });

  return (
    <ResponsiveSheet
      drawer
      size="lg"
      open
      onOpenChange={(o) => !o && onClose()}
      busy={pending}
      title="Nueva orden de compra"
      description="Numeración automática. La mercancía entra al inventario cuando la recibas."
      footer={
        <>
          <span className="mr-auto self-center font-mono text-[15px] font-semibold tabular-nums" aria-label="Total de la orden">
            {formatCurrency(totals.total)}
          </span>
          <button type="button" onClick={onClose} disabled={pending} className={buttonVariants({ variant: "outline" })}>
            Cancelar
          </button>
          <button type="button" disabled={pending || !suppliers.length} onClick={() => save(false)} className={buttonVariants({ variant: "outline" })}>
            Guardar borrador
          </button>
          <button type="button" disabled={pending || !suppliers.length} onClick={() => save(true)} className={buttonVariants()}>
            {pending ? "Creando…" : "Pedir al proveedor"}
          </button>
        </>
      }
    >
      {!suppliers.length ? (
        <Alert tone="warning" title="Primero registra un proveedor">
          <button type="button" onClick={onNeedSupplier} className="font-medium underline underline-offset-4">
            Ir a Proveedores
          </button>
        </Alert>
      ) : !products.length ? (
        <Alert tone="warning" title="No hay productos con inventario">
          Activa «Controla inventario» en un producto del catálogo para poder comprarlo.
        </Alert>
      ) : (
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Proveedor" required>
              {(c) => (
                <Select {...c} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.legalName}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Fecha esperada" optional>
              {(c) => <input {...c} type="date" min={today} value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className={inputClasses} />}
            </Field>
            {warehouses.length > 1 ? (
              <Field label="Bodega de destino" className="sm:col-span-2">
                {(c) => (
                  <Select {...c} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : null}
          </div>

          <section className="grid gap-2">
            <h3 className="text-[13px] font-semibold">Productos</h3>
            {lines.map((l, i) => (
              <div key={l.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-border p-2.5 sm:grid-cols-[minmax(0,2fr)_80px_150px_90px_auto] sm:items-end">
                <label className="grid gap-1 text-xs font-medium max-sm:col-span-2">
                  Producto
                  <Select
                    value={l.productId}
                    onChange={(e) => {
                      const p = products.find((x) => x.id === e.target.value);
                      setLine(l.key, { productId: e.target.value, unitCost: p?.cost ?? l.unitCost });
                    }}
                  >
                    <option value="">Elige un producto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (hay {p.stock})
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  Cantidad
                  <input inputMode="numeric" value={l.quantity} onChange={(e) => setLine(l.key, { quantity: e.target.value.replace(/\D/g, "") })} className={inputClasses} />
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  Costo unitario
                  <MoneyInput value={l.unitCost} onValueChange={(v) => setLine(l.key, { unitCost: v })} />
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  IVA
                  <Select value={l.taxRatePct} onChange={(e) => setLine(l.key, { taxRatePct: e.target.value })}>
                    {TAXES.map((t) => (
                      <option key={t} value={t}>
                        {t} %
                      </option>
                    ))}
                  </Select>
                </label>
                <button type="button" aria-label={`Quitar producto ${i + 1}`} disabled={lines.length === 1} onClick={() => setLines(lines.filter((x) => x.key !== l.key))} className={buttonVariants({ variant: "ghost", size: "icon", className: "max-sm:col-start-2 max-sm:row-start-1" })}>
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setLines([...lines, { key: Date.now(), productId: "", quantity: "1", unitCost: null, taxRatePct: "0" }])} className={buttonVariants({ variant: "outline", size: "sm", className: "justify-self-start" })}>
              <Plus aria-hidden="true" className="size-3.5" /> Agregar producto
            </button>
            <p className="text-xs text-muted-foreground">
              Subtotal {formatCurrency(totals.subtotal)} · IVA {formatCurrency(totals.taxTotal)}. El costo que entra al inventario es el de cada unidad <b>sin IVA</b>.
            </p>
          </section>

          <Field label="Notas" optional>
            {(c) => <textarea {...c} rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={textareaClasses} placeholder="Condiciones, forma de pago, dirección de entrega…" />}
          </Field>
        </div>
      )}
    </ResponsiveSheet>
  );
}
