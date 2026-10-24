import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { STATUS_LABELS } from "@/lib/payments/intents";
import { publicIntent } from "@/lib/payments/intents-db";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Cobro · NEXUS THRIVE", robots: { index: false } };

/**
 * Enlace público de un cobro: muestra a quién se paga, cuánto y el estado. El código del
 * enlace no se adivina y la página no expone nada más (ni cliente, ni cuenta, ni credenciales).
 */
export default async function PayPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const intent = await publicIntent(reference);
  if (!intent) notFound();
  const tone = intent.status === "PAID" ? "text-success" : intent.status === "PENDING" ? "text-foreground" : "text-danger";
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center gap-5 px-4 py-10">
      <section aria-labelledby="pay-title" className="grid gap-4 rounded-lg border border-border bg-surface p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Cobro de {intent.business}</p>
        <h1 id="pay-title" className="font-display text-3xl font-bold tabular-nums">{formatCurrency(intent.amount)}</h1>
        <p className="text-[14px]">{intent.description}</p>
        <p role="status" className={`text-[14px] font-semibold ${tone}`}>{STATUS_LABELS[intent.status]}</p>
        {intent.status === "PENDING" ? (
          <p className="text-[13px] text-muted-foreground">Este cobro está pendiente. El pago se confirma con el estado oficial de la pasarela o de la transferencia; no necesitas enviar comprobantes por aquí.</p>
        ) : null}
      </section>
    </main>
  );
}
