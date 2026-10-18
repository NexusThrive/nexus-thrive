import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/atoms/wordmark";
import { verifyReceiptToken } from "@/lib/business/finance-db";
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
  const rows: [string, string][] = [
    ["Recibo", p.receiptNumber ? receiptCode(p.receiptNumber) : "—"],
    ["Fecha", date],
    ["Cliente", customer?.name ?? "Venta de mostrador"],
    ["Concepto", p.description ?? "Pago"],
    ["Medio de pago", paymentMethodLabel(p.provider as PaymentMethodValue)],
  ];
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <article className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <header className="grid gap-1 border-b border-dashed border-border px-6 py-5 text-center">
          <p className="font-display text-lg font-bold">{tenant?.legalName || tenant?.name}</p>
          <p className="text-xs text-muted-foreground">{[tenant?.taxId ? `NIT ${tenant.taxId}` : null, tenant?.city].filter(Boolean).join(" · ")}</p>
        </header>
        <div className="grid gap-1 px-6 py-6 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{voided ? "Pago anulado" : "Total pagado"}</p>
          <p className={`font-display text-[40px] font-bold tabular-nums ${voided ? "text-muted-foreground line-through" : ""}`}>{formatCurrency(toNumber(p.amount))}</p>
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
        <footer className="flex items-center justify-center gap-2 border-t border-border bg-surface-muted px-6 py-3 text-[11px] text-muted-foreground">
          Generado con <Wordmark size={12} />
        </footer>
      </article>
    </main>
  );
}
