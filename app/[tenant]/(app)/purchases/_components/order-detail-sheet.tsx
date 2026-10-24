"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Alert } from "@/components/molecules/alert";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { formatCurrency } from "@/lib/format";
import { canCancel, canClose, canMarkOrdered, canReceive, orderTotals, STATUS_LABELS } from "@/lib/purchasing/purchases";
import type { OrderDetail } from "@/lib/purchasing/purchases-db";
import { cancelOrderAction, closeOrderAction, markOrderedAction, orderDetailAction, receiveOrderAction } from "@/app/[tenant]/(app)/purchases/actions";

const TONES = { DRAFT: "muted", ORDERED: "warning", PARTIAL: "warning", RECEIVED: "success", CANCELED: "muted" } as const;

/** Detalle de una orden: lo pedido y lo recibido, y las acciones según su estado (recibir mercancía incluida). */
export default function OrderDetailSheet({ slug, id, today, onClose }: { slug: string; id: string; today: string; onClose: () => void }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiving, setReceiving] = useState(false);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [invoice, setInvoice] = useState({ number: "", issueDate: today, dueDate: "" });
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();

  const load = () =>
    orderDetailAction(slug, id).then((r) => {
      if (r.ok) setOrder(r.order);
      else setError(r.message);
    });
  // Carga inicial: el estado se actualiza al resolver la acción de servidor.
  useEffect(() => {
    let alive = true;
    orderDetailAction(slug, id).then((r) => {
      if (!alive) return;
      if (r.ok) setOrder(r.order);
      else setError(r.message);
    });
    return () => {
      alive = false;
    };
  }, [slug, id]);

  const done = (message: string | undefined) => {
    if (message) toast(message, "success");
    router.refresh();
    setReceiving(false);
    return load();
  };
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) await done(r.message);
      else toast({ title: "No se pudo", description: r.message, variant: "error" });
    });

  const pendingLines = order?.lines.filter((l) => l.quantity > l.receivedQuantity) ?? [];
  const toReceive = pendingLines.map((l) => ({ line: l, quantity: Math.min(l.quantity - l.receivedQuantity, Number(qty[l.id] ?? l.quantity - l.receivedQuantity) || 0) }));
  const receiveTotals = orderTotals(toReceive.map((r) => ({ quantity: r.quantity, unitCost: r.line.unitCost, taxRatePct: r.line.taxRatePct })));

  const startReceiving = () => {
    setQty(Object.fromEntries(pendingLines.map((l) => [l.id, String(l.quantity - l.receivedQuantity)])));
    setReceiving(true);
  };
  const confirmReceive = () =>
    run(() =>
      receiveOrderAction(slug, id, {
        items: toReceive.map((r) => ({ lineId: r.line.id, quantity: r.quantity })),
        invoice: invoice.number.trim() ? { number: invoice.number, issueDate: invoice.issueDate, dueDate: invoice.dueDate || null, subtotal: receiveTotals.subtotal, taxTotal: receiveTotals.taxTotal, total: receiveTotals.total } : null,
      }),
    );

  const ask = async (title: string, description: string, confirmLabel: string, fn: () => Promise<{ ok: boolean; message?: string }>) => {
    if (await confirm({ title, description, confirmLabel, tone: "danger" })) run(fn);
  };

  const receivedUnits = order?.lines.reduce((s, l) => s + l.receivedQuantity, 0) ?? 0;

  return (
    <>
      <ResponsiveSheet
        drawer
        size="lg"
        open
        onOpenChange={(o) => !o && onClose()}
        busy={pending}
        title={order ? `Orden ${order.code}` : "Orden de compra"}
        description={order ? `${order.supplierName} · llega a ${order.warehouseName}` : undefined}
        footer={
          order && !receiving ? (
            <>
              {canCancel(order.status, receivedUnits) ? (
                <button type="button" disabled={pending} onClick={() => ask(`¿Cancelar ${order.code}?`, "La orden queda cancelada y no se podrá recibir. No se borra: queda en el historial.", "Cancelar orden", () => cancelOrderAction(slug, id))} className={buttonVariants({ variant: "outline" })}>
                  Cancelar orden
                </button>
              ) : null}
              {canClose(order.status) ? (
                <button type="button" disabled={pending} onClick={() => ask(`¿Cerrar ${order.code}?`, `Quedan ${order.pendingUnits} unidades sin recibir. Se da por recibida y ya no se esperará el resto.`, "Cerrar orden", () => closeOrderAction(slug, id))} className={buttonVariants({ variant: "outline" })}>
                  Cerrar orden
                </button>
              ) : null}
              {canMarkOrdered(order.status) ? (
                <button type="button" disabled={pending} onClick={() => run(() => markOrderedAction(slug, id))} className={buttonVariants({ variant: "outline" })}>
                  Marcar como pedida
                </button>
              ) : null}
              {canReceive(order.status) ? (
                <button type="button" disabled={pending} onClick={startReceiving} className={buttonVariants()}>
                  {order.status === "PARTIAL" ? "Recibir el resto" : "Recibir mercancía"}
                </button>
              ) : null}
            </>
          ) : order && receiving ? (
            <>
              <span className="mr-auto self-center font-mono text-[15px] font-semibold tabular-nums" aria-label="Valor de lo que llega">
                {formatCurrency(receiveTotals.total)}
              </span>
              <button type="button" disabled={pending} onClick={() => setReceiving(false)} className={buttonVariants({ variant: "outline" })}>
                Volver
              </button>
              <button type="button" disabled={pending || toReceive.every((r) => r.quantity === 0)} onClick={confirmReceive} className={buttonVariants()}>
                {pending ? "Recibiendo…" : "Confirmar recepción"}
              </button>
            </>
          ) : null
        }
      >
        {error ? (
          <Alert tone="danger">{error}</Alert>
        ) : !order ? (
          <p role="status" className="text-[13px] text-muted-foreground">
            Cargando la orden…
          </p>
        ) : (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={TONES[order.status]}>{STATUS_LABELS[order.status]}</Badge>
              {order.expectedDate ? <span className="text-[13px] text-muted-foreground">Esperada {order.expectedDate}</span> : null}
            </div>
            {order.note ? <p className="text-[13px] text-muted-foreground">{order.note}</p> : null}

            <div role="region" aria-label={`Productos de la orden ${order.code}`} tabIndex={0} className="overflow-x-auto rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <table className="w-full min-w-[480px] text-[13px]">
                <caption className="sr-only">Productos de la orden {order.code}</caption>
                <thead className="bg-surface-muted text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Producto</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Pedido</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Recibido</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Costo</th>
                    {receiving ? <th scope="col" className="px-3 py-2 text-right font-medium">Llega hoy</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {order.lines.map((l) => {
                    const left = l.quantity - l.receivedQuantity;
                    return (
                      <tr key={l.id}>
                        <th scope="row" className="px-3 py-2 text-left font-medium">{l.productName}</th>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{l.quantity}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{l.receivedQuantity}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(l.unitCost)}</td>
                        {receiving ? (
                          <td className="px-3 py-2 text-right">
                            {left > 0 ? (
                              <input
                                aria-label={`Cantidad que llega de ${l.productName}`}
                                inputMode="numeric"
                                value={qty[l.id] ?? ""}
                                onChange={(e) => setQty({ ...qty, [l.id]: e.target.value.replace(/\D/g, "") })}
                                className={`${inputClasses} h-8 w-20 text-right`}
                              />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-right text-xs text-muted-foreground">
              Subtotal {formatCurrency(order.subtotal)} · IVA {formatCurrency(order.taxTotal)} · <b className="text-foreground">Total {formatCurrency(order.total)}</b>
            </p>

            {receiving ? (
              <section className="grid gap-3 rounded-lg border border-border p-3" aria-labelledby="invoice-title">
                <h3 id="invoice-title" className="text-[13px] font-semibold">
                  Factura del proveedor <span className="font-normal text-muted-foreground">(opcional)</span>
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Número" hint="Como aparece en su factura.">{(c) => <input {...c} value={invoice.number} onChange={(e) => setInvoice({ ...invoice, number: e.target.value })} className={inputClasses} />}</Field>
                  <Field label="Emisión">{(c) => <input {...c} type="date" value={invoice.issueDate} onChange={(e) => setInvoice({ ...invoice, issueDate: e.target.value })} className={inputClasses} />}</Field>
                  <Field label="Vence" optional>{(c) => <input {...c} type="date" value={invoice.dueDate} onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })} className={inputClasses} />}</Field>
                </div>
                <p className="text-xs text-muted-foreground">El valor de la factura se calcula de lo que llega ahora ({formatCurrency(receiveTotals.total)} con IVA). Quedará lista para las cuentas por pagar.</p>
              </section>
            ) : null}

            {order.invoices.length ? (
              <section aria-labelledby="invoices-title" className="grid gap-1">
                <h3 id="invoices-title" className="text-[13px] font-semibold">Facturas del proveedor</h3>
                <ul className="divide-y divide-border rounded-lg border border-border text-[13px]">
                  {order.invoices.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <span>
                        <span className="font-mono">{i.number}</span> · {i.issueDate}
                        {i.dueDate ? ` · vence ${i.dueDate}` : ""}
                      </span>
                      <b className="font-mono tabular-nums">{formatCurrency(i.total)}</b>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </ResponsiveSheet>
      {confirmDialog}
    </>
  );
}
