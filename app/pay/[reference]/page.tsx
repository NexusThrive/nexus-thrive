import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { STATUS_LABELS } from "@/lib/domains/finance/payments/intents";
import { publicIntent } from "@/lib/domains/finance/payments/intents-db";
import { ProofForm } from "./_components/proof-form";
import { formatCurrency } from "@/lib/foundation/format";

export const metadata: Metadata = { title: "Cobro · NEXUS THRIVE", robots: { index: false } };

/**
 * Enlace público de un cobro: muestra a quién se paga, cuánto y el estado. El código del
 * enlace no se adivina y la página no expone nada más (ni cliente, ni cuenta, ni credenciales).
 */
export default async function PayPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const intent = await publicIntent(reference);
  if (!intent) notFound();
  const tone = intent.status === "PAID" ? "text-success" : intent.status === "PENDING" || intent.status === "VERIFYING" ? "text-foreground" : "text-danger";
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center gap-5 px-4 py-10">
      <section aria-labelledby="pay-title" className="grid gap-4 rounded-lg border border-border bg-surface p-6">
        <p className="font-mono text-2xs uppercase tracking-[0.16em] text-muted-foreground">Cobro de {intent.business}</p>
        <h1 id="pay-title" className="font-display text-3xl font-bold tabular-nums">{formatCurrency(intent.amount)}</h1>
        <p className="text-sm">{intent.description}</p>
        <p role="status" className={`text-sm font-semibold ${tone}`}>{STATUS_LABELS[intent.status]}</p>
        {intent.payUrl ? (
          <a href={intent.payUrl} className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-5 text-[15px] font-semibold text-primary-foreground">
            Pagar con tarjeta o PSE
          </a>
        ) : null}
        {intent.status === "PENDING" ? (
          <>
            <p className="text-ui text-muted-foreground">Este cobro está pendiente. Se confirma con el estado oficial de la pasarela o cuando el negocio verifica tu transferencia.</p>
            <ProofForm reference={reference} />
          </>
        ) : null}
        {intent.status === "VERIFYING" ? (
          <p className="text-ui text-muted-foreground">Recibimos el aviso de tu transferencia. El negocio la está verificando en su banco; cuando la confirme, este cobro quedará pagado.</p>
        ) : null}
      </section>
    </main>
  );
}
