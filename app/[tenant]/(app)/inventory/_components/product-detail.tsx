"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Pencil, Plus, Scale, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, selectClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { KIND_LABELS } from "@/lib/business/catalog-kinds";
import { STOCK_KIND_LABELS, stockLevel, type StockKind } from "@/lib/business/inventory";
import type { ProductRow } from "@/lib/business/products-db";
import { PAYMENT_METHODS } from "@/lib/finance";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { moveStockAction, sellProductAction, stockHistoryAction } from "../actions";

type Customer = { id: string; name: string };

/** Ficha de un producto: vender, entradas, salidas, ajuste de inventario e historial. */
export default function ProductDetail({ slug, product, customers, canManage, onEdit, onClose }: { slug: string; product: ProductRow; customers: Customer[]; canManage: boolean; onEdit: () => void; onClose: () => void }) {
  const [mode, setMode] = useState<null | "sell" | "IN" | "OUT" | "ADJUST">(null);
  const [qty, setQty] = useState("1");
  const [method, setMethod] = useState("CASH");
  const [customerId, setCustomerId] = useState("");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<Awaited<ReturnType<typeof stockHistoryAction>>>([]);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const level = stockLevel(product);

  useEffect(() => {
    if (!product.trackStock) return;
    let alive = true;
    void stockHistoryAction(slug, product.id).then((h) => alive && setHistory(h));
    return () => {
      alive = false;
    };
  }, [slug, product.id, product.trackStock]);

  const submit = () =>
    start(async () => {
      const n = Number(qty);
      const r = mode === "sell" ? await sellProductAction(slug, product.id, { quantity: n, method, customerId: customerId || null }) : await moveStockAction(slug, product.id, mode!, n, note);
      if (r.ok) {
        toast(r.message ?? "Listo", "success");
        router.refresh();
        onClose();
      } else toast({ title: "No se pudo", description: r.message, variant: "error" });
    });

  return (
    <ResponsiveSheet drawer open onOpenChange={(o) => !o && onClose()} title={product.name} description={`${KIND_LABELS[product.kind].one} · ${formatCurrency(product.price)}`}>
      <div className="grid gap-5">
        <div className="flex flex-wrap gap-1.5">
          {!product.active ? <Badge tone="muted">No disponible</Badge> : null}
          {product.trackStock ? <Badge tone={level === "out" ? "danger" : level === "low" ? "warning" : "success"}>{product.stock} en inventario</Badge> : null}
          {product.durationDays ? <Badge tone="neutral">{product.durationDays} días</Badge> : null}
          {product.durationMinutes ? <Badge tone="neutral">{product.durationMinutes} min</Badge> : null}
          {product.capacity ? <Badge tone="neutral">Cupo {product.capacity}</Badge> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {product.active && (product.kind === "PRODUCT" || product.kind === "SERVICE") ? (
            <button type="button" onClick={() => setMode("sell")} className={buttonVariants({ size: "sm" })}>
              <ShoppingCart aria-hidden="true" className="size-3.5" /> Vender
            </button>
          ) : null}
          {product.trackStock && canManage ? (
            <>
              <button type="button" onClick={() => setMode("IN")} className={buttonVariants({ size: "sm", variant: "outline" })}>
                <Plus aria-hidden="true" className="size-3.5" /> Entrada
              </button>
              <button type="button" onClick={() => setMode("OUT")} className={buttonVariants({ size: "sm", variant: "outline" })}>
                <Minus aria-hidden="true" className="size-3.5" /> Salida
              </button>
              <button type="button" onClick={() => { setMode("ADJUST"); setQty(String(product.stock)); }} className={buttonVariants({ size: "sm", variant: "outline" })}>
                <Scale aria-hidden="true" className="size-3.5" /> Ajustar conteo
              </button>
            </>
          ) : null}
          {canManage ? (
            <button type="button" onClick={onEdit} className={buttonVariants({ size: "sm", variant: "ghost" })}>
              <Pencil aria-hidden="true" className="size-3.5" /> Editar
            </button>
          ) : null}
        </div>

        {mode ? (
          <section className="grid gap-3 rounded-md bg-surface-muted p-3.5">
            <h3 className="text-[13px] font-semibold">{mode === "sell" ? "Registrar venta" : STOCK_KIND_LABELS[mode as StockKind]}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={mode === "ADJUST" ? "Cantidad contada" : "Cantidad"}>
                {(c) => <input {...c} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} className={inputClasses} />}
              </Field>
              {mode === "sell" ? (
                <Field label="Medio de pago">
                  {(c) => (
                    <select {...c} value={method} onChange={(e) => setMethod(e.target.value)} className={selectClasses}>
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              ) : (
                <Field label="Motivo" hint={mode === "IN" ? "Opcional: proveedor o factura." : "Daño, consumo interno, conteo…"}>
                  {(c) => <input {...c} value={note} onChange={(e) => setNote(e.target.value)} className={inputClasses} />}
                </Field>
              )}
              {mode === "sell" ? (
                <Field label="Cliente" className="sm:col-span-2">
                  {(c) => (
                    <select {...c} value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={selectClasses}>
                      <option value="">Venta de mostrador</option>
                      {customers.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              ) : null}
            </div>
            {mode === "sell" ? <p className="text-[13px]">Total: <b className="font-mono tabular-nums">{formatCurrency(product.price * (Number(qty) || 0))}</b></p> : null}
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode(null)} className={buttonVariants({ size: "sm", variant: "ghost" })}>
                Cancelar
              </button>
              <button type="button" disabled={pending || !(Number(qty) >= (mode === "ADJUST" ? 0 : 1))} onClick={submit} className={buttonVariants({ size: "sm" })}>
                {mode === "sell" ? "Cobrar" : "Guardar"}
              </button>
            </div>
          </section>
        ) : null}

        {product.description ? <p className="text-[13.5px] text-muted-foreground">{product.description}</p> : null}

        {product.trackStock ? (
          <section className="grid gap-2">
            <h3 className="text-[13px] font-semibold">Movimientos de inventario</h3>
            <ul className="divide-y divide-border rounded-md border border-border">
              {history.map((h) => (
                <li key={h.id} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                  <span className="min-w-0 flex-1">
                    <b className="font-medium">{STOCK_KIND_LABELS[h.kind]}</b>
                    <small className="block truncate text-xs text-muted-foreground">
                      {h.note ? `${h.note} · ` : ""}
                      {formatDateTime(h.createdAt)}
                    </small>
                  </span>
                  <span className="font-mono tabular-nums">{h.kind === "IN" || (h.kind === "ADJUST" && h.quantity > 0) ? "+" : h.kind === "ADJUST" && h.quantity === 0 ? "" : "−"}{Math.abs(h.quantity)}</span>
                </li>
              ))}
              {history.length === 0 ? <li className="px-3 py-3 text-[13px] text-muted-foreground">Sin movimientos.</li> : null}
            </ul>
          </section>
        ) : null}
      </div>
    </ResponsiveSheet>
  );
}
