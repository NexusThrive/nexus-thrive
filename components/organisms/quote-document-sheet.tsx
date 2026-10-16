import { formatDateShort, formatMoneyMicro, formatPercentMicro, formatQuantityMicro } from "@/lib/format";
import type { QuoteDocument, QuoteParty } from "@/lib/construction/quote-document";

function Party({ title, party }: { title: string; party: QuoteParty }) {
  const lines = [
    party.taxId ? `NIT ${party.taxId}` : null,
    [party.address, party.city].filter(Boolean).join(", ") || null,
    party.email ?? null,
  ].filter((line): line is string => Boolean(line));
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <p className="mt-1 text-sm font-medium text-foreground">{party.name || "—"}</p>
      {lines.map((line) => (
        <p key={line} className="text-xs text-muted-foreground">
          {line}
        </p>
      ))}
    </div>
  );
}

/**
 * Documento A4 de una versión de cotización. Muestra exactamente la foto
 * congelada al emitirla (`Quote.snapshot`); nunca se recalcula.
 */
export default function QuoteDocumentSheet({
  document,
  quoteLabel,
}: {
  document: QuoteDocument;
  quoteLabel: string;
}) {
  const aiu = document.aiu;
  return (
    <article className="mx-auto w-full max-w-[210mm] rounded-lg bg-card px-8 py-10 text-foreground sm:px-10 print:max-w-none print:rounded-none print:px-0 print:py-0 print:shadow-none">
      <header className="flex flex-col gap-6 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <Party title="Constructora" party={document.issuer} />
        <div className="shrink-0 sm:text-right">
          <p className="text-lg font-semibold uppercase tracking-wide">{quoteLabel}</p>
          <p className="mt-1 font-mono text-sm font-medium text-muted-foreground">{document.code}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Versión {document.version}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Fecha: {formatDateShort(document.issuedAt)}</p>
          {document.validUntil ? (
            <p className="mt-0.5 text-sm text-muted-foreground">Válida hasta: {formatDateShort(document.validUntil)}</p>
          ) : null}
        </div>
      </header>

      <section className="grid gap-6 border-b border-border py-6 sm:grid-cols-2">
        <Party title="Cliente" party={document.client} />
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Obra</h2>
          <p className="mt-1 text-sm font-medium">{document.project.name}</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{document.project.code}</span>
            {document.project.siteAddress || document.project.siteCity
              ? ` · ${[document.project.siteAddress, document.project.siteCity, document.project.siteDepartment].filter(Boolean).join(", ")}`
              : ""}
          </p>
        </div>
      </section>

      <section className="space-y-5 border-b border-border py-6">
        {document.chapters.map((chapter) => (
          <div key={chapter.order} className="break-inside-avoid-page">
            <div className="flex items-baseline justify-between gap-3 border-b border-border-strong pb-1">
              <h2 className="text-sm font-semibold uppercase tracking-wide">
                {chapter.order}. {chapter.name}
              </h2>
              <span className="text-sm font-semibold tabular-nums">{formatMoneyMicro(chapter.subtotal)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="mt-1 w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-muted-foreground">
                    <th className="py-1.5 pr-2 font-medium">Ítem</th>
                    <th className="py-1.5 pr-2 font-medium">Descripción</th>
                    <th className="py-1.5 pr-2 text-right font-medium">Und</th>
                    <th className="py-1.5 pr-2 text-right font-medium">Cant.</th>
                    <th className="py-1.5 pr-2 text-right font-medium">Vr. unitario</th>
                    <th className="py-1.5 text-right font-medium">Vr. total</th>
                  </tr>
                </thead>
                <tbody>
                  {chapter.items.map((item) => (
                    <tr key={`${chapter.order}-${item.code}-${item.description}`} className="border-t border-border align-top">
                      <td className="py-1.5 pr-2 font-mono text-xs text-muted-foreground">{item.code}</td>
                      <td className="py-1.5 pr-2">
                        <span className="font-medium">{item.description}</span>
                        {item.resources && item.resources.length > 0 ? (
                          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            {item.resources.map((resource, index) => (
                              <li key={index} className="flex justify-between gap-3">
                                <span>
                                  {resource.name} · {formatQuantityMicro(resource.performance)} {resource.unit}
                                </span>
                                <span className="tabular-nums">{formatMoneyMicro(resource.totalPrice)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </td>
                      <td className="py-1.5 pr-2 text-right text-muted-foreground">{item.unit}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums text-muted-foreground">{formatQuantityMicro(item.quantity)}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums text-muted-foreground">{formatMoneyMicro(item.unitCost)}</td>
                      <td className="py-1.5 text-right font-semibold tabular-nums">{formatMoneyMicro(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      <section className="flex justify-end py-6">
        <dl className="w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <dt>Costo directo</dt>
            <dd className="font-medium tabular-nums text-foreground">{formatMoneyMicro(document.totals.direct)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Administración ({formatPercentMicro(aiu.adminPct)})</dt>
            <dd className="tabular-nums">{formatMoneyMicro(document.totals.admin)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Imprevistos ({formatPercentMicro(aiu.imprevPct)})</dt>
            <dd className="tabular-nums">{formatMoneyMicro(document.totals.imprev)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Utilidad ({formatPercentMicro(aiu.utilidadPct)})</dt>
            <dd className="tabular-nums">{formatMoneyMicro(document.totals.utilidad)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>IVA sobre utilidad ({formatPercentMicro(aiu.ivaUtilidadPct)})</dt>
            <dd className="tabular-nums">{formatMoneyMicro(document.totals.ivaUtilidad)}</dd>
          </div>
          <div className="flex justify-between border-t border-border-strong pt-2 text-base font-bold">
            <dt>TOTAL</dt>
            <dd className="tabular-nums">{formatMoneyMicro(document.totals.grand)}</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-10 border-t border-border pt-8 sm:grid-cols-2">
        <div>
          <p className="text-sm font-semibold">Aceptación del cliente</p>
          <p className="mt-8 border-b border-border-strong pb-1 text-xs text-muted-foreground">Nombre</p>
          <p className="mt-8 border-b border-border-strong pb-1 text-xs text-muted-foreground">Firma</p>
          <div className="mt-8 grid grid-cols-2 gap-6">
            <p className="border-b border-border-strong pb-1 text-xs text-muted-foreground">Documento</p>
            <p className="border-b border-border-strong pb-1 text-xs text-muted-foreground">Fecha</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Autorización de la constructora</p>
          <p className="mt-8 border-b border-border-strong pb-1 text-xs text-muted-foreground">Firma autorizada</p>
          <p className="mt-8 text-xs text-muted-foreground">{document.issuer.name}</p>
        </div>
      </section>
    </article>
  );
}
