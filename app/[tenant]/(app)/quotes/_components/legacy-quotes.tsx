"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { NLoader } from "@/components/atoms/n-loader";
import { QuoteStatusBadge } from "@/components/molecules/quote-badges";
import { formatCurrency, formatDateShort } from "@/lib/format";
import type { QuoteStatusValue } from "@/lib/apu-engine";
import { migrateLegacyQuoteAction, type MigrateLegacyResult } from "../actions";

type LegacyQuote = {
  id: string;
  code: string;
  title: string;
  status: QuoteStatusValue;
  customerId: string | null;
  totalAmount: string;
  createdAt: string;
};

/**
 * Cotizaciones creadas antes de que la cotización naciera de la obra. Se
 * pueden consultar y pasar a una obra (sin perder partidas ni APU).
 */
export default function LegacyQuotes({
  tenantSlug,
  quotes,
  customers,
  canMigrate,
}: {
  tenantSlug: string;
  quotes: LegacyQuote[];
  customers: { id: string; name: string }[];
  canMigrate: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [result, setResult] = useState<MigrateLegacyResult | null>(null);

  return (
    <div className="space-y-4">
      {result ? (
        <p
          role={result.ok ? "status" : "alert"}
          className={
            result.ok
              ? "rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success"
              : "rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {result.message}
          {result.ok ? (
            <Link
              href={`/${tenantSlug}/projects/${result.projectId}?tab=cotizaciones`}
              className="ml-2 font-medium underline"
            >
              Abrir la obra
            </Link>
          ) : null}
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Al pasarla a una obra se crea el presupuesto con sus mismas partidas, APU y AIU, y la
        cotización queda como versión 1. Si estaba aprobada, la obra queda contratada.
      </p>
      {quotes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No quedan cotizaciones anteriores.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {quotes.map((quote) => (
            <li key={quote.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{quote.title}</span>
                  <QuoteStatusBadge status={quote.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <span className="font-mono">{quote.code}</span> · {formatDateShort(quote.createdAt)} ·{" "}
                  {formatCurrency(quote.totalAmount)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/${tenantSlug}/quotes/${quote.id}`}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:bg-muted"
                >
                  Ver
                </Link>
                {canMigrate ? (
                  <form
                    className="flex flex-wrap items-center gap-2"
                    action={(formData) => {
                      setBusyId(quote.id);
                      startTransition(async () => {
                        const response = await migrateLegacyQuoteAction(tenantSlug, quote.id, formData);
                        setResult(response);
                        setBusyId(null);
                        if (response.ok) router.refresh();
                      });
                    }}
                  >
                    {!quote.customerId ? (
                      <select
                        name="customerId"
                        required
                        aria-label={`Cliente de la obra para ${quote.title}`}
                        defaultValue=""
                        className="h-8 max-w-48 rounded-lg border border-border bg-card px-2 text-xs text-foreground"
                      >
                        <option value="">Elige el cliente…</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <button
                      type="submit"
                      disabled={pending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                    >
                      {busyId === quote.id ? (
                        <NLoader size={12} className="text-current" />
                      ) : (
                        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                      )}
                      Pasar a una obra
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
