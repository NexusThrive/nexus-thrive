"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { SkeletonRows } from "@/components/molecules/skeleton-rows";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Paperclip, Send, XCircle } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { receiptCode } from "@/lib/business/invoice";
import { drawReceiptPng, shareReceiptOnWhatsapp } from "@/lib/business/receipt-share";
import { paymentMethodLabel, type PaymentMethodValue } from "@/lib/finance";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { moneyDetailAction, uploadAttachmentAction, voidExpenseAction, voidPaymentAction } from "../money-actions";

export type MoneyItem =
  | { kind: "PAYMENT"; id: string; amount: number; title: string; concept: string; method: PaymentMethodValue; status: string; receiptNumber: number | null; date: string; phone: string | null; voidReason: string | null; notes: string | null }
  | { kind: "EXPENSE"; id: string; amount: number; title: string; concept: string; category: string; supplier: string | null; paidFrom: string; date: string; voided: boolean; voidReason: string | null };

const PAID_FROM: Record<string, string> = { CASH: "Caja menor", BANK: "Banco", CARD: "Tarjeta" };
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Ficha de un pago o un gasto: datos, comprobantes guardados en NEXUS, reenviar y anular con motivo. */
export default function MoneyDetailSheet({ slug, item, business, onClose }: { slug: string; item: MoneyItem; business: { name: string; subtitle?: string }; onClose: () => void }) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof moneyDetailAction>>>(null);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const voided = item.kind === "PAYMENT" ? item.status === "VOIDED" : item.voided;

  useEffect(() => {
    let alive = true;
    void moneyDetailAction(slug, item.kind, item.id).then((d) => alive && setDetail(d));
    return () => {
      alive = false;
    };
  }, [slug, item.kind, item.id]);

  const reload = () => moneyDetailAction(slug, item.kind, item.id).then(setDetail);

  const upload = (file: File) =>
    start(async () => {
      const fd = new FormData();
      fd.set("slug", slug);
      fd.set("kind", item.kind);
      fd.set("ownerId", item.id);
      fd.set("file", file);
      const r = await uploadAttachmentAction(fd);
      if (r.ok) {
        toast(r.message ?? "Archivo guardado", "success");
        await reload();
      } else toast({ title: "No se guardó", description: r.message, variant: "error" });
    });

  const doVoid = () =>
    start(async () => {
      const r = item.kind === "PAYMENT" ? await voidPaymentAction(slug, item.id, reason) : await voidExpenseAction(slug, item.id, reason);
      if (r.ok) {
        toast(r.message ?? "Anulado", "success");
        router.refresh();
        onClose();
      } else toast({ title: "No se anuló", description: r.message, variant: "error" });
    });

  const resend = () =>
    start(async () => {
      if (item.kind !== "PAYMENT") return;
      const code = item.receiptNumber ? receiptCode(item.receiptNumber) : "Recibo";
      const image = await drawReceiptPng({
        business: business.name,
        subtitle: business.subtitle,
        total: formatCurrency(item.amount),
        concept: item.concept,
        rows: [
          { label: "Recibo", value: code },
          { label: "Cliente", value: item.title },
          { label: "Medio", value: paymentMethodLabel(item.method) },
          { label: "Fecha", value: formatDateTime(item.date) },
        ],
      });
      const text = `Hola, este es tu comprobante de ${business.name}: ${formatCurrency(item.amount)} por ${item.concept} (${code}).${detail?.link ? `\nVer recibo: ${detail.link}` : ""}`;
      const r = await shareReceiptOnWhatsapp({ image, fileName: `recibo-${code}.png`, text, phone: item.phone });
      if (r === "copied") toast({ title: "Imagen copiada", description: "Pégala en el chat con Ctrl+V.", variant: "success" });
    });

  return (
    <ResponsiveSheet drawer open onOpenChange={(o) => !o && onClose()} title={`${item.kind === "PAYMENT" ? "Pago" : "Gasto"} · ${formatCurrency(item.amount)}`} description={item.title}>
      <div className="grid gap-5">
        <div className="flex flex-wrap gap-1.5">
          {voided ? <Badge tone="muted">Anulado</Badge> : <Badge tone="success">{item.kind === "PAYMENT" ? "Pagado" : "Registrado"}</Badge>}
          {item.kind === "PAYMENT" && item.receiptNumber ? <Badge tone="neutral">{receiptCode(item.receiptNumber)}</Badge> : null}
          {item.kind === "EXPENSE" ? <Badge tone="neutral">{PAID_FROM[item.paidFrom] ?? item.paidFrom}</Badge> : null}
        </div>
        {voided && item.voidReason ? <p className="rounded-md bg-surface-muted p-3 text-[13px]">Motivo de la anulación: {item.voidReason}</p> : null}

        <dl className="grid gap-2 text-[13.5px]">
          {(item.kind === "PAYMENT"
            ? [
                ["Concepto", item.concept],
                ["Medio", paymentMethodLabel(item.method)],
                ["Fecha", formatDateTime(item.date)],
                ["Notas", item.notes ?? "—"],
              ]
            : [
                ["Concepto", item.concept],
                ["Categoría", item.category],
                ["Proveedor", item.supplier ?? "—"],
                ["Fecha", formatDateTime(item.date)],
              ]
          ).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <section className="grid gap-2">
          <h3 className="text-[13px] font-semibold">{item.kind === "PAYMENT" ? "Comprobantes" : "Soporte (factura o recibo)"}</h3>
          {detail?.files.length ? (
            <ul className="grid gap-1.5">
              {detail.files.map((f) => (
                <li key={f.id}>
                  <a href={`/api/files/${f.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[13px] hover:bg-surface-muted">
                    <FileText aria-hidden="true" className="size-4 text-accent-text" />
                    <span className="min-w-0 flex-1 truncate">{f.fileName}</span>
                    <small className="text-xs text-muted-foreground">{kb(f.byteSize)}</small>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            detail ? <p className="text-[13px] text-muted-foreground">Sin archivos.</p> : <SkeletonRows rows={2} label="Cargando archivos" />
          )}
          {!voided ? (
            <>
              <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" aria-label="Adjuntar archivo" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              <button type="button" disabled={pending} onClick={() => fileRef.current?.click()} className={buttonVariants({ variant: "outline", size: "sm", className: "justify-self-start" })}>
                <Paperclip aria-hidden="true" className="size-3.5" /> Adjuntar foto o PDF
              </button>
            </>
          ) : null}
        </section>

        {item.kind === "PAYMENT" && !voided ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={resend} className={buttonVariants({ size: "sm" })}>
              <Send aria-hidden="true" className="size-3.5" /> Enviar recibo por WhatsApp
            </button>
            {detail?.link ? (
              <a href={detail.link} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm", variant: "outline" })}>
                <ExternalLink aria-hidden="true" className="size-3.5" /> Ver recibo
              </a>
            ) : null}
          </div>
        ) : null}

        {!voided && detail?.canManage ? (
          asking ? (
            <div className="grid gap-2">
              <Field label="Motivo de la anulación" required>
                {(c) => <input {...c} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClasses} placeholder="Se registró dos veces" />}
              </Field>
              <div className="flex gap-2">
                <button type="button" onClick={() => setAsking(false)} className={buttonVariants({ size: "sm", variant: "ghost" })}>
                  Cancelar
                </button>
                <button type="button" disabled={pending || reason.trim().length < 3} onClick={doVoid} className={buttonVariants({ size: "sm", variant: "danger" })}>
                  Anular
                </button>
              </div>
              <p className="text-xs text-muted-foreground">No se borra: queda anulado con el motivo y deja de contar en los totales.{item.kind === "PAYMENT" ? " Si entró a una caja abierta, sale de la caja." : ""}</p>
            </div>
          ) : (
            <button type="button" onClick={() => setAsking(true)} className={buttonVariants({ variant: "ghost", size: "sm", className: "justify-self-start text-danger" })}>
              <XCircle aria-hidden="true" className="size-3.5" /> Anular
            </button>
          )
        ) : null}
      </div>
    </ResponsiveSheet>
  );
}
