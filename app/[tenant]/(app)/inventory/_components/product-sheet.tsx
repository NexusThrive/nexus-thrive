"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, textareaClasses } from "@/components/atoms/input";
import { Switch } from "@/components/atoms/switch";
import { Field } from "@/components/molecules/field";
import { MoneyInput } from "@/components/molecules/money-input";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { KIND_LABELS, type ProductDraft } from "@/lib/business/catalog-kinds";
import { margin } from "@/lib/business/inventory";
import type { ProductKindValue, ProductRow } from "@/lib/business/products-db";
import { saveProductAction } from "../actions";

const num = (v: string) => (v.trim() === "" ? null : Number(v));

/** Crear o editar lo que vende el negocio; los campos cambian según el tipo. */
export default function ProductSheet({ slug, kinds, product, defaultKind, onClose, onSaved }: { slug: string; kinds: ProductKindValue[]; product: ProductRow | null; defaultKind: ProductKindValue; onClose: () => void; onSaved?: (kind: ProductKindValue) => void }) {
  const [d, setD] = useState<ProductDraft>(() =>
    product
      ? { ...product, description: product.description ?? "", sku: product.sku ?? "", category: product.category ?? "", unit: product.unit ?? "", initialStock: null }
      : { kind: defaultKind, name: "", description: "", sku: "", category: "", price: null, cost: null, trackStock: defaultKind === "PRODUCT", initialStock: null, minStock: null, unit: "", durationMinutes: defaultKind === "SERVICE" ? 60 : null, durationDays: defaultKind === "PLAN" ? 30 : null, capacity: null, active: true },
  );
  const [errors, setErrors] = useState<Partial<Record<keyof ProductDraft, string>>>({});
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const set = <K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) => setD((p) => ({ ...p, [k]: v }));
  const m = margin(d.price ?? 0, d.cost);

  const save = () =>
    start(async () => {
      const r = await saveProductAction(slug, product?.id ?? null, d);
      if (r.ok) {
        toast(`${KIND_LABELS[d.kind].one} ${product ? "guardado" : "creado"}`, "success");
        router.refresh();
        onSaved?.(d.kind);
        onClose();
      } else {
        setErrors(r.errors ?? {});
        toast({ title: "No se guardó", description: r.message, variant: "error" });
      }
    });

  return (
    <ResponsiveSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={product ? `Editar · ${product.name}` : `Nuevo ${KIND_LABELS[d.kind].one.toLowerCase()}`}
      description={KIND_LABELS[d.kind].hint}
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonVariants({ variant: "outline" })}>
            Cancelar
          </button>
          <button type="button" disabled={pending} onClick={save} className={buttonVariants()}>
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!product && kinds.length > 1 ? (
          <div className="sm:col-span-2">
            <SegmentedControl ariaLabel="Tipo" value={d.kind} onChange={(k) => setD((p) => ({ ...p, kind: k, trackStock: k === "PRODUCT", durationDays: k === "PLAN" ? (p.durationDays ?? 30) : p.durationDays }))} options={kinds.map((k) => ({ value: k, label: KIND_LABELS[k].one }))} />
          </div>
        ) : null}
        <Field label="Nombre" required error={errors.name} className="sm:col-span-2">
          {(c) => <input {...c} value={d.name} onChange={(e) => set("name", e.target.value)} className={inputClasses} placeholder={d.kind === "PLAN" ? "Plan mensual" : d.kind === "TICKET" ? "Entrada general" : d.kind === "TOUR" ? "Tour por la ciudad amurallada" : d.kind === "SERVICE" ? "Entrenamiento personalizado" : "Proteína 2 lb"} />}
        </Field>
        <Field label="Precio" required error={errors.price}>
          {(c) => <MoneyInput id={c.id} value={d.price} onValueChange={(v) => set("price", v)} />}
        </Field>
        <Field label="Costo" hint={m != null ? `Margen ${m.toLocaleString("es-CO")} %` : "Opcional, para ver tu margen."} error={errors.cost}>
          {(c) => <MoneyInput id={c.id} value={d.cost} onValueChange={(v) => set("cost", v)} />}
        </Field>
        {d.kind === "PLAN" ? (
          <Field label="Vigencia (días)" required error={errors.durationDays}>
            {(c) => <input {...c} inputMode="numeric" value={d.durationDays ?? ""} onChange={(e) => set("durationDays", num(e.target.value))} className={inputClasses} />}
          </Field>
        ) : null}
        {d.kind === "SERVICE" || d.kind === "TOUR" ? (
          <Field label="Duración (minutos)" error={errors.durationMinutes}>
            {(c) => <input {...c} inputMode="numeric" value={d.durationMinutes ?? ""} onChange={(e) => set("durationMinutes", num(e.target.value))} className={inputClasses} />}
          </Field>
        ) : null}
        {d.kind !== "PRODUCT" && d.kind !== "PLAN" ? (
          <Field label="Cupo" hint={d.kind === "TICKET" ? "Personas por franja horaria." : "Personas por cita, clase o salida."} error={errors.capacity}>
            {(c) => <input {...c} inputMode="numeric" value={d.capacity ?? ""} onChange={(e) => set("capacity", num(e.target.value))} className={inputClasses} />}
          </Field>
        ) : null}
        <Field label="Categoría">{(c) => <input {...c} value={d.category} onChange={(e) => set("category", e.target.value)} className={inputClasses} />}</Field>
        {d.kind === "PRODUCT" ? (
          <>
            <Field label="Referencia (SKU)">{(c) => <input {...c} value={d.sku} onChange={(e) => set("sku", e.target.value)} className={inputClasses} />}</Field>
            <label htmlFor="p-stock" className="flex items-center justify-between gap-3 rounded-md bg-surface-muted p-3 sm:col-span-2">
              <span>
                <b className="block text-[13.5px] font-medium">Llevar inventario</b>
                <small className="text-xs text-muted-foreground">Descuenta con cada venta y avisa cuando quede poco.</small>
              </span>
              <Switch id="p-stock" checked={d.trackStock} onCheckedChange={(v) => set("trackStock", v)} />
            </label>
            {d.trackStock ? (
              <>
                {!product ? (
                  <Field label="Cantidad inicial" error={errors.initialStock}>
                    {(c) => <input {...c} inputMode="numeric" value={d.initialStock ?? ""} onChange={(e) => set("initialStock", num(e.target.value))} className={inputClasses} />}
                  </Field>
                ) : null}
                <Field label="Avisar cuando queden" error={errors.minStock}>
                  {(c) => <input {...c} inputMode="numeric" value={d.minStock ?? ""} onChange={(e) => set("minStock", num(e.target.value))} className={inputClasses} />}
                </Field>
              </>
            ) : null}
          </>
        ) : null}
        <Field label="Descripción" className="sm:col-span-2">
          {(c) => <textarea {...c} rows={2} value={d.description} onChange={(e) => set("description", e.target.value)} className={textareaClasses} />}
        </Field>
        {product ? (
          <label htmlFor="p-active" className="flex items-center justify-between gap-3 rounded-md bg-surface-muted p-3 sm:col-span-2">
            <span>
              <b className="block text-[13.5px] font-medium">Disponible</b>
              <small className="text-xs text-muted-foreground">Si lo apagas, no aparece para vender ni agendar.</small>
            </span>
            <Switch id="p-active" checked={d.active} onCheckedChange={(v) => set("active", v)} />
          </label>
        ) : null}
      </div>
    </ResponsiveSheet>
  );
}
