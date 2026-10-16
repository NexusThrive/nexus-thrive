"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Printer,
  Send,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { NLoader } from "@/components/atoms/n-loader";
import { QuoteStatusBadge } from "@/components/molecules/quote-badges";
import { formatDateShort, formatMoneyMicro } from "@/lib/format";
import { cn } from "@/lib/cn";
import type {
  FollowUpTypeValue,
  ProjectFollowUpRow,
  ProjectQuoteRow,
} from "@/lib/construction/project-quotes";
import {
  completeFollowUpAction,
  createFollowUpAction,
  decideQuoteAction,
  deleteFollowUpAction,
  emitQuoteAction,
  type QuoteActionResult,
} from "../quotes/actions";
import { fieldClasses, inputClasses, labelClasses } from "@/components/atoms/input";
import { buttonVariants } from "@/components/atoms/button-variants";

const FOLLOW_UP_TYPES: { value: FollowUpTypeValue; label: string; icon: typeof Phone }[] = [
  { value: "CALL", label: "Llamada", icon: Phone },
  { value: "EMAIL", label: "Correo", icon: Mail },
  { value: "MEETING", label: "Reunión", icon: Users },
  { value: "VISIT", label: "Visita a obra", icon: MapPin },
  { value: "NOTE", label: "Nota", icon: MessageSquare },
];

const inputClass =
  inputClasses;

function Feedback({ result }: { result: QuoteActionResult | null }) {
  if (!result) return null;
  return (
    <p
      role={result.ok ? "status" : "alert"}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        result.ok
          ? "border-success/30 bg-success/10 text-success"
          : "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      {result.message}
    </p>
  );
}

/**
 * Pestaña Cotizaciones de la obra: versiones emitidas desde el presupuesto,
 * respuesta del cliente y seguimientos comerciales.
 */
export default function ProjectQuotesWorkspace({
  tenantSlug,
  projectId,
  projectStatus,
  quotes,
  followUps,
  budgetRevision,
  budgetGrandTotal,
  budgetHasItems,
  canGovern,
}: {
  tenantSlug: string;
  projectId: string;
  projectStatus: string;
  quotes: ProjectQuoteRow[];
  followUps: ProjectFollowUpRow[];
  budgetRevision: number | null;
  budgetGrandTotal: string | null;
  budgetHasItems: boolean;
  canGovern: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<QuoteActionResult | null>(null);
  const [deciding, setDeciding] = useState<{ id: string; decision: "APPROVE" | "REJECT" } | null>(null);

  const quotable = projectStatus === "DRAFT" || projectStatus === "BIDDING";
  const latest = quotes[0] ?? null;
  const latestIsCurrent = latest !== null && latest.budgetRevision === budgetRevision;

  const run = (action: () => Promise<QuoteActionResult>, after?: () => void) => {
    startTransition(async () => {
      const response = await action();
      setResult(response);
      if (response.ok) {
        after?.();
        router.refresh();
      }
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="space-y-4">
        <Feedback result={result} />

        {canGovern && quotable ? (
          <form
            className="rounded-lg border border-border bg-card p-4"
            action={(formData) =>
              run(() => emitQuoteAction(tenantSlug, projectId, budgetRevision ?? 0, formData))
            }
          >
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold text-foreground">Emitir cotización</h2>
              <p className="text-xs text-muted-foreground">
                Congela el presupuesto actual
                {budgetGrandTotal ? ` (${formatMoneyMicro(budgetGrandTotal)})` : ""} en una nueva
                versión. Si hay una versión pendiente, queda reemplazada.
                {latest && latestIsCurrent
                  ? " La última versión ya corresponde al presupuesto actual."
                  : ""}
              </p>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label htmlFor="quote-valid-until" className="block sm:w-48">
                <span className={labelClasses}>Válida hasta</span>
                <input id="quote-valid-until" name="validUntil" type="date" className={inputClass} />
              </label>
              <label htmlFor="quote-show-apu" className="flex items-center gap-2 text-sm text-muted-foreground sm:pb-2.5">
                <input id="quote-show-apu" name="showApuDetail" type="checkbox" className="h-4 w-4 rounded border-border" />
                Mostrar el detalle APU al cliente
              </label>
              <button
                type="submit"
                disabled={pending || !budgetHasItems}
                className={`${buttonVariants()} sm:ml-auto`}
              >
                {pending ? <NLoader size={14} className="text-current" /> : <Send aria-hidden="true" className="h-4 w-4" />}
                Emitir versión {quotes.length + 1}
              </button>
            </div>
            {!budgetHasItems ? (
              <p className="mt-2 text-xs text-gold-700">
                Agrega partidas al presupuesto antes de cotizar.
              </p>
            ) : null}
          </form>
        ) : !quotable ? (
          <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            La obra ya no está en cotización: las versiones quedan como historial.
          </p>
        ) : null}

        {quotes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <FileText aria-hidden="true" className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium text-foreground">Todavía no hay cotizaciones</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              Arma el presupuesto en la pestaña Presupuestador y emite la primera versión para el
              cliente.
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {quotes.map((quote) => {
              const isDeciding = deciding?.id === quote.id;
              return (
                <li key={quote.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">Versión {quote.version}</span>
                        <QuoteStatusBadge status={quote.status} />
                        <span className="font-mono text-xs text-muted-foreground">{quote.code}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {quote.sentAt ? `Emitida ${formatDateShort(quote.sentAt)}` : "Sin emitir"}
                        {quote.validUntil ? ` · válida hasta ${formatDateShort(quote.validUntil)}` : ""}
                        {quote.showApuDetail ? " · con detalle APU" : ""}
                      </p>
                      {quote.decidedAt ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {quote.status === "APPROVED" ? "Aprobada" : "Respondida"} el {formatDateShort(quote.decidedAt)}
                          {quote.decidedByName ? ` por ${quote.decidedByName}` : ""}
                          {quote.decisionNote ? ` · “${quote.decisionNote}”` : ""}
                        </p>
                      ) : null}
                    </div>
                    <p className="text-right text-base font-semibold tabular-nums text-foreground">
                      {formatMoneyMicro(quote.grandTotal)}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/${tenantSlug}/quotes/${quote.id}/print`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <Printer aria-hidden="true" className="h-3.5 w-3.5" />
                      Ver e imprimir
                    </Link>
                    {canGovern && quote.status === "SENT" && !isDeciding ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setDeciding({ id: quote.id, decision: "APPROVE" })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-success/40 px-3 py-1.5 text-xs font-medium text-success transition hover:bg-success/10"
                        >
                          <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                          El cliente aprobó
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeciding({ id: quote.id, decision: "REJECT" })}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          <XCircle aria-hidden="true" className="h-3.5 w-3.5" />
                          El cliente rechazó
                        </button>
                      </>
                    ) : null}
                  </div>

                  {isDeciding && deciding ? (
                    <form
                      className="mt-3 space-y-2 rounded-lg border border-border bg-muted/50 p-3"
                      action={(formData) =>
                        run(
                          () => decideQuoteAction(tenantSlug, projectId, quote.id, deciding.decision, formData),
                          () => setDeciding(null),
                        )
                      }
                    >
                      <p className="text-sm text-foreground">
                        {deciding.decision === "APPROVE"
                          ? "Al aprobar, la obra queda contratada: se crea la línea base (Informe Cero) con esta versión y el presupuesto se bloquea."
                          : "La obra sigue en cotización; puedes emitir una nueva versión."}
                      </p>
                      <label htmlFor={`decision-note-${quote.id}`} className="block">
                        <span className={labelClasses}>Nota (opcional)</span>
                        <input
                          id={`decision-note-${quote.id}`}
                          name="note"
                          maxLength={500}
                          placeholder={deciding.decision === "APPROVE" ? "Ej. Firmada en reunión del 10/11" : "Ej. Pide bajar el valor de acabados"}
                          className={inputClass}
                        />
                      </label>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setDeciding(null)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-card"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={pending}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-60",
                            deciding.decision === "APPROVE" ? "bg-success hover:bg-success/90" : "bg-destructive hover:bg-destructive/90",
                          )}
                        >
                          {pending ? <NLoader size={12} className="text-current" /> : null}
                          {deciding.decision === "APPROVE" ? "Confirmar aprobación" : "Confirmar rechazo"}
                        </button>
                      </div>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <FollowUpsPanel
        tenantSlug={tenantSlug}
        projectId={projectId}
        followUps={followUps}
        quotes={quotes}
        pending={pending}
        run={run}
      />
    </div>
  );
}

function FollowUpsPanel({
  tenantSlug,
  projectId,
  followUps,
  quotes,
  pending,
  run,
}: {
  tenantSlug: string;
  projectId: string;
  followUps: ProjectFollowUpRow[];
  quotes: ProjectQuoteRow[];
  pending: boolean;
  run: (action: () => Promise<QuoteActionResult>, after?: () => void) => void;
}) {
  const [formKey, setFormKey] = useState(0);
  const open = followUps.filter((followUp) => !followUp.completedAt);
  const done = followUps.filter((followUp) => followUp.completedAt);

  return (
    <aside className="space-y-4">
      <form
        key={formKey}
        className="space-y-3 rounded-lg border border-border bg-card p-4"
        action={(formData) =>
          run(() => createFollowUpAction(tenantSlug, projectId, formData), () => setFormKey((k) => k + 1))
        }
      >
        <h2 className="text-sm font-semibold text-foreground">Seguimientos</h2>
        <div className="grid grid-cols-2 gap-2">
          <label htmlFor="follow-up-type" className="block">
            <span className={labelClasses}>Tipo</span>
            <select id="follow-up-type" name="type" defaultValue="CALL" className={inputClass}>
              {FOLLOW_UP_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="follow-up-date" className="block">
            <span className={labelClasses}>Programar para</span>
            <input id="follow-up-date" name="scheduledFor" type="date" className={inputClass} />
          </label>
        </div>
        {quotes.length > 0 ? (
          <label htmlFor="follow-up-quote" className="block">
            <span className={labelClasses}>Sobre la versión</span>
            <select id="follow-up-quote" name="quoteId" defaultValue={quotes[0].id} className={inputClass}>
              <option value="">General de la obra</option>
              {quotes.map((quote) => (
                <option key={quote.id} value={quote.id}>
                  Versión {quote.version}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label htmlFor="follow-up-note" className="block">
          <span className={labelClasses}>Qué pasó o qué hay que hacer</span>
          <textarea
            id="follow-up-note"
            name="note"
            required
            minLength={3}
            maxLength={1000}
            rows={3}
            className={`${fieldClasses} py-2 w-full`}
            placeholder="Ej. Llamar para resolver dudas sobre la cimentación"
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Con fecha queda pendiente; sin fecha se registra como hecho.
        </p>
        <button
          type="submit"
          disabled={pending}
          className={`${buttonVariants({ variant: "outline", size: "sm" })} w-full`}
        >
          Guardar seguimiento
        </button>
      </form>

      <FollowUpList title="Pendientes" items={open} tenantSlug={tenantSlug} projectId={projectId} run={run} pending={pending} />
      <FollowUpList title="Historial" items={done} tenantSlug={tenantSlug} projectId={projectId} run={run} pending={pending} />
    </aside>
  );
}

function FollowUpList({
  title,
  items,
  tenantSlug,
  projectId,
  run,
  pending,
}: {
  title: string;
  items: ProjectFollowUpRow[];
  tenantSlug: string;
  projectId: string;
  run: (action: () => Promise<QuoteActionResult>) => void;
  pending: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-card">
      <h3 className="border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title} ({items.length})
      </h3>
      <ul className="divide-y divide-border">
        {items.map((item) => {
          const type = FOLLOW_UP_TYPES.find((entry) => entry.value === item.type) ?? FOLLOW_UP_TYPES[4];
          const Icon = type.icon;
          return (
            <li key={item.id} className="flex gap-3 px-4 py-3">
              <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{item.note}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {type.label}
                  {item.quoteVersion ? ` · v${item.quoteVersion}` : ""}
                  {item.scheduledFor && !item.completedAt ? (
                    <span className="inline-flex items-center gap-1">
                      {" · "}
                      <CalendarClock aria-hidden="true" className="h-3 w-3" />
                      {formatDateShort(item.scheduledFor)}
                    </span>
                  ) : null}
                  {` · ${item.authorName}`}
                  {item.completedAt ? ` · ${formatDateShort(item.completedAt)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-start gap-1">
                {!item.completedAt ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => completeFollowUpAction(tenantSlug, projectId, item.id))}
                    aria-label="Marcar como hecho"
                    className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-success/10 hover:text-success disabled:opacity-50"
                  >
                    <Check aria-hidden="true" className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => deleteFollowUpAction(tenantSlug, projectId, item.id))}
                  aria-label="Eliminar seguimiento"
                  className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
