"use client";

import { useState } from "react";
import { Input } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { Textarea } from "@/components/atoms/textarea";
import { Field } from "@/components/molecules/field";
import { MoneyInput } from "@/components/molecules/money-input";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { registerMovementAction } from "@/app/[tenant]/(app)/inventario/existencias/actions";
import type { WarehouseOption } from "./stock-view";

type Kind = "IN" | "OUT" | "ADJUST";
const KINDS: { value: Kind; label: string; hint: string }[] = [
  { value: "IN", label: "Entrada", hint: "Llega mercancía: compra, devolución o producción." },
  { value: "OUT", label: "Salida", hint: "Sale mercancía sin venta: daño, regalo, consumo propio." },
  { value: "ADJUST", label: "Ajuste", hint: "Corriges lo que hay: escribes la cantidad real que cuentas." },
];

/** Nuevo movimiento de inventario: entrada, salida o ajuste de un producto en una bodega. Salidas y ajustes piden el motivo. */
export default function MovementDialog({ slug, warehouses, products, onClose, onDone }: { slug: string; warehouses: WarehouseOption[]; products: { id: string; name: string }[]; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [kind, setKind] = useState<Kind>("IN");
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState(warehouses.find((w) => w.isDefault)?.id ?? warehouses[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const current = KINDS.find((k) => k.value === kind)!;

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Nuevo movimiento"
      description="Todo movimiento queda en el kardex con quién lo hizo y por qué."
      submitLabel="Registrar movimiento"
      pendingLabel="Registrando…"
      onSubmit={async () => {
        const qty = quantity.trim() === "" ? Number.NaN : Number(quantity);
        const errors: Record<string, string> = {};
        if (!productId) errors.producto = "Elige el producto.";
        if (!Number.isInteger(qty) || qty < 0 || (kind !== "ADJUST" && qty === 0)) errors.cantidad = kind === "ADJUST" ? "Escribe la cantidad real (0 o más)." : "Escribe una cantidad entera mayor que cero.";
        if (kind !== "IN" && note.trim().length < 3) errors.motivo = kind === "OUT" ? "Explica el motivo de la salida." : "Explica el motivo del ajuste.";
        if (Object.keys(errors).length) return { ok: false, message: "Revisa los campos marcados.", fieldErrors: errors };
        const r = await registerMovementAction(slug, { productId, warehouseId, kind, quantity: qty, unitCost: kind === "IN" ? unitCost : null, note });
        if (!r.ok) return { ok: false, message: r.message };
        toast(r.message, "success");
        onDone();
        return { ok: true };
      }}
    >
      {({ fieldErrors }) => (
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <SegmentedControl ariaLabel="Tipo de movimiento" value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k.value, label: k.label }))} />
            <p className="text-ui text-muted-foreground">{current.hint}</p>
          </div>
          <Field label="Producto" required error={fieldErrors.producto}>
            {(c) => (
              <Select {...c} value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">Elige un producto</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            )}
          </Field>
          {warehouses.length > 1 ? (
            <Field label="Bodega">
              {(c) => (
                <Select {...c} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
              )}
            </Field>
          ) : null}
          <Field label={kind === "ADJUST" ? "Cantidad real" : "Cantidad"} required error={fieldErrors.cantidad}>
            {(c) => <Input {...c} name="cantidad" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/[^\d]/g, ""))} />}
          </Field>
          {kind === "IN" ? (
            <Field label="Costo por unidad" optional hint="Si lo dejas vacío, entra al costo promedio de hoy.">
              {(c) => <MoneyInput id={c.id} aria-describedby={c["aria-describedby"]} value={unitCost} onValueChange={setUnitCost} />}
            </Field>
          ) : null}
          <Field label={kind === "IN" ? "Nota" : "Motivo"} required={kind !== "IN"} optional={kind === "IN"} error={fieldErrors.motivo}>
            {(c) => <Textarea {...c} name="motivo" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />}
          </Field>
        </div>
      )}
    </FormDialog>
  );
}
