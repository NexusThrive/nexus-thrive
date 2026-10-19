import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/atoms/wordmark";
import { getAppBaseUrl } from "@/lib/app-url";
import { verifyReceiptToken } from "@/lib/business/finance-db";
import { receiptQrDataUrl, receiptQrPayload } from "@/lib/business/receipt-qr";
import { receiptCode } from "@/lib/business/invoice";
import { paymentMethodLabel, type PaymentMethodValue } from "@/lib/finance";
import { formatCurrency, toNumber } from "@/lib/format";
import { db } from "@/prisma/db";

export const metadata: Metadata = { title: "Recibo de pago", robots: { index: false } };

/**
 * Recibo público de un pago (el enlace que va en el WhatsApp). La firma del
 * enlace impide adivinar otros recibos. Muestra solo lo del recibo: sin
 * correos, teléfonos ni datos internos del negocio.
 */
export default async function ReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const id = verifyReceiptToken(token);
  if (!id) notFound();
  const p = await db.orm.public.Payment.where({ id }).first();
  if (!p) notFound();
  const [tenant, customer] = await Promise.all([
    db.orm.public.Tenant.where({ id: p.tenantId }).select("name", "city", "taxId", "legalName").first(),
    p.customerId ? db.orm.public.Customer.where({ id: p.customerId }).select("name").first() : null,
  ]);
  const voided = p.status === "VOIDED";
  const date = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "long", timeStyle: "short" }).format(new Date(String(p.createdAt)));
  const reference = p.receiptNumber ? receiptCode(p.receiptNumber) : "—";
  const total = formatCurrency(toNumber(p.amount));
  const link = `${getAppBaseUrl()}/r/${token}`;
  const qr = await receiptQrDataUrl(receiptQrPayload({ link, reference, total, business: tenant?.name })).catch(() => null);
  const rows: [string, string][] = [
    ["Recibo", reference],
    ["Fecha", date],
    ["Cliente", customer?.name ?? "Venta de mostrador"],
    ["Concepto", p.description ?? "Pago"],
    ["Medio de pago", paymentMethodLabel(p.provider as PaymentMethodValue)],
  ];
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <article className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <header className="grid gap-1 border-b border-dashed border-border px-6 py-5 text-center">
          <i aria-hidden="true" className="mx-auto mb-1 h-[3px] w-10 rounded-full bg-accent" />
          <p className="font-display text-lg font-bold">{tenant?.legalName || tenant?.name}</p>
          <p className="text-xs text-muted-foreground">{[tenant?.taxId ? `NIT ${tenant.taxId}` : null, tenant?.city].filter(Boolean).join(" · ")}</p>
          <span className="mx-auto mt-1 inline-block rounded-full border border-border px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Comprobante de pago
          </span>
        </header>
        <div className="grid gap-1 px-6 py-6 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{voided ? "Pago anulado" : "Total pagado"}</p>
          <p className={`font-display text-[40px] font-bold tabular-nums ${voided ? "text-muted-foreground line-through" : ""}`}>{total}</p>
          {voided ? <p className="text-sm text-danger">Este recibo fue anulado{p.voidReason ? `: ${p.voidReason}` : ""}.</p> : null}
        </div>
        <dl className="grid gap-2 border-t border-dashed border-border px-6 py-5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        {qr ? (
          <div className="grid justify-items-center gap-2 border-t border-dashed border-border px-6 py-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR para verificar el recibo" width={132} height={132} className="size-[132px] rounded-lg border border-border bg-white p-1.5" />
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Escanea para verificar</p>
          </div>
        ) : null}
        <footer className="flex items-center justify-center gap-2 border-t border-border bg-surface-muted px-6 py-3 text-[11px] text-muted-foreground">
          Generado con <Wordmark size={12} />
        </footer>
      </article>
    </main>
  );
}
