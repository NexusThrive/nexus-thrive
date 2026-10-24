"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus } from "lucide-react";
import { Alert } from "@/components/molecules/alert";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { QrCode } from "@/components/atoms/qr-code";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { cancelIntentAction, confirmManualAction, createIntentAction, reconcileAction, refundAction } from "@/app/[tenant]/(app)/cobros/actions";
import { STATUS_LABELS, payButtonHtml, type Reconciliation } from "@/lib/payments/intents";
import type { IntentRow } from "@/lib/payments/intents-db";
import { formatCurrency } from "@/lib/format";

type Run = { id: string; provider: string; day: string; expected: number; reported: number; matched: number; differences: Reconciliation["differences"] };
type Tab = "links" | "recon";
type Small = { kind: "confirm" | "refund" | "share"; row: IntentRow } | null;
const TONE = { PENDING: "warning", PAID: "success", EXPIRED: "secondary", FAILED: "destructive", CANCELED: "secondary" } as const;
const KIND_TEXT = { missing_in_nexus: "El proveedor lo reporta y NEXUS no lo tiene", missing_in_provider: "NEXUS lo confirmó y el proveedor no lo reporta", amount_mismatch: "El monto no coincide" } as const;

export default function CobrosView({ slug, baseUrl, intents, runs, canAdmin, today }: { slug: string; baseUrl: string; intents: IntentRow[]; runs: Run[]; canAdmin: boolean; today: string }) {
  const [tab, setTab] = useState<Tab>("links");
  const [creating, setCreating] = useState(false);
  const [small, setSmall] = useState<Small>(null);
  const router = useRouter();
  const { toast } = useToast();
  const link = (r: IntentRow) => `${baseUrl}/pay/${r.reference}`;
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${what} copiado`, "success");
    } catch {
      toast("No se pudo copiar: selecciónalo y cópialo a mano", "error");
    }
  };
  const done = (message?: string) => {
    if (message) toast(message, "success");
    router.refresh();
  };
  return (
    <div className="grid gap-4">
      {canAdmin ? (
        <div className="max-w-full overflow-x-auto pb-1">
          <SegmentedControl ariaLabel="Sección" value={tab} onChange={setTab} options={[{ value: "links", label: "Enlaces de cobro", count: intents.filter((i) => i.status === "PENDING").length || undefined }, { value: "recon", label: "Conciliación" }]} />
        </div>
      ) : null}

      {tab === "links" ? (
        <div className="grid gap-3">
          <div className="flex">
            <button type="button" onClick={() => setCreating(true)} className={buttonVariants({ className: "ml-auto" })}>
              <Plus aria-hidden="true" className="size-4" /> Nuevo cobro
            </button>
          </div>
          {intents.length === 0 ? (
            <EmptyState title="Aún no hay cobros en línea" description="Crea un enlace, compártelo por WhatsApp o ponlo como botón en tu página. Se marca pagado cuando llega la confirmación oficial." />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {intents.map((r) => (
                <li key={r.id} className="grid gap-2 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-[13.5px] font-medium">{r.description}</b>
                    <Badge variant={TONE[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                    {r.refundedTotal > 0 ? <Badge variant="outline">Reembolsado {formatCurrency(r.refundedTotal)}</Badge> : null}
                    <span className="ml-auto font-mono text-[13.5px] font-semibold tabular-nums">{formatCurrency(r.amount)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                    <span>Vence {r.expiresAt.slice(0, 10)}</span>
                    {r.confirmedBy ? <span>· confirmado por {r.confirmedBy === "PROVIDER" ? "la pasarela" : "una persona"}</span> : null}
                    <span className="ml-auto flex flex-wrap gap-2">
                      {r.status === "PENDING" ? (
                        <>
                          <button type="button" onClick={() => setSmall({ kind: "share", row: r })} className={buttonVariants({ variant: "outline", size: "sm" })}>Compartir</button>
                          {canAdmin ? <button type="button" onClick={() => setSmall({ kind: "confirm", row: r })} className={buttonVariants({ variant: "outline", size: "sm" })}>Confirmar pago</button> : null}
                          <button type="button" aria-label={`Cancelar ${r.description}`} onClick={async () => { const x = await cancelIntentAction(slug, r.id); toast(x.message, x.ok ? "success" : "error"); if (x.ok) router.refresh(); }} className={buttonVariants({ variant: "ghost", size: "sm" })}>Cancelar</button>
                        </>
                      ) : null}
                      {r.status === "PAID" && canAdmin && r.refundedTotal < r.amount ? <button type="button" onClick={() => setSmall({ kind: "refund", row: r })} className={buttonVariants({ variant: "outline", size: "sm" })}>Reembolsar</button> : null}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <Reconciliation slug={slug} runs={runs} today={today} />
      )}

      <FormDialog
        open={creating}
        onOpenChange={setCreating}
        title="Nuevo cobro"
        description="Se crea un enlace público para que tu cliente pague."
        submitLabel="Crear enlace"
        pendingLabel="Creando…"
        onSubmit={async (d) => {
          const amount = Number(String(d.get("amount") ?? "").replace(/[^\d,]/g, "").replace(",", "."));
          const r = await createIntentAction(slug, { amount, description: String(d.get("description") ?? ""), expiresInHours: Number(d.get("hours") ?? 48) });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { amount: r.message } };
        }}
        onSuccess={({ message }) => done(message)}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Valor (COP)" required error={fieldErrors.amount}>{(c) => <input {...c} name="amount" inputMode="numeric" autoComplete="off" className={inputClasses} placeholder="150000" />}</Field>
            <Field label="Qué se cobra" required>{(c) => <input {...c} name="description" autoComplete="off" maxLength={160} className={inputClasses} placeholder="Matrícula anual" />}</Field>
            <Field label="Vigencia (horas)" required>{(c) => <input {...c} name="hours" inputMode="numeric" defaultValue="48" className={inputClasses} />}</Field>
          </div>
        )}
      </FormDialog>

      <FormDialog
        open={small?.kind === "share"}
        onOpenChange={(o) => !o && setSmall(null)}
        title="Compartir cobro"
        description={small ? `${small.row.description} · ${formatCurrency(small.row.amount)}` : undefined}
        submitLabel="Listo"
        onSubmit={() => ({ ok: true })}
      >
        {() =>
          small ? (
            <div className="grid justify-items-center gap-3">
              <QrCode value={link(small.row)} size={160} label="QR del enlace de cobro" />
              <input readOnly aria-label="Enlace de cobro" value={link(small.row)} className={inputClasses} onFocus={(e) => e.currentTarget.select()} />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => copy(link(small.row), "Enlace")} className={buttonVariants({ variant: "outline", size: "sm" })}><Copy aria-hidden="true" className="size-3.5" /> Copiar enlace</button>
                <button type="button" onClick={() => copy(payButtonHtml(link(small.row)), "Botón de pago")} className={buttonVariants({ variant: "outline", size: "sm" })}><Copy aria-hidden="true" className="size-3.5" /> Copiar botón de pago</button>
              </div>
            </div>
          ) : null
        }
      </FormDialog>

      <FormDialog
        open={small?.kind === "confirm"}
        onOpenChange={(o) => !o && setSmall(null)}
        title="Confirmar pago a mano"
        description="Solo para transferencias que ya verificaste en tu banco. Queda registrada con tu evidencia."
        submitLabel="Confirmar pago"
        pendingLabel="Confirmando…"
        onSubmit={async (d) => {
          const r = await confirmManualAction(slug, small!.row.reference, String(d.get("evidence") ?? ""));
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { evidence: r.message } };
        }}
        onSuccess={({ message }) => done(message)}
      >
        {({ fieldErrors }) => <Field label="Referencia o evidencia" required error={fieldErrors.evidence}>{(c) => <input {...c} name="evidence" autoComplete="off" maxLength={200} className={inputClasses} placeholder="Transferencia Bancolombia 998877" />}</Field>}
      </FormDialog>

      <FormDialog
        open={small?.kind === "refund"}
        onOpenChange={(o) => !o && setSmall(null)}
        title="Reembolsar"
        description={small ? `Se cobraron ${formatCurrency(small.row.amount)}; ya reembolsado ${formatCurrency(small.row.refundedTotal)}.` : undefined}
        submitLabel="Registrar reembolso"
        pendingLabel="Registrando…"
        destructive
        onSubmit={async (d) => {
          const amount = Number(String(d.get("amount") ?? "").replace(/[^\d,]/g, "").replace(",", "."));
          if (!(amount > 0)) return { ok: false, message: "Revisa los campos marcados.", fieldErrors: { amount: "Escribe un valor mayor que cero." } };
          const r = await refundAction(slug, small!.row.id, amount, String(d.get("reason") ?? ""));
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message };
        }}
        onSuccess={({ message }) => done(message)}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Valor a reembolsar" required error={fieldErrors.amount} hint="Total o parcial.">{(c) => <input {...c} name="amount" inputMode="numeric" autoComplete="off" defaultValue={small ? String(small.row.amount - small.row.refundedTotal) : ""} className={inputClasses} />}</Field>
            <Field label="Motivo" required>{(c) => <input {...c} name="reason" autoComplete="off" maxLength={200} className={inputClasses} />}</Field>
          </div>
        )}
      </FormDialog>
    </div>
  );
}

function Reconciliation({ slug, runs, today }: { slug: string; runs: Run[]; today: string }) {
  const [day, setDay] = useState(today);
  const [report, setReport] = useState("");
  const [result, setResult] = useState<{ result: Reconciliation; bad: number[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const run = async () => {
    setPending(true);
    setError(null);
    const r = await reconcileAction(slug, day, report);
    setPending(false);
    if (r.ok) setResult({ result: r.result, bad: r.bad });
    else setError(r.message);
  };
  const shown = result?.result;
  return (
    <div className="grid gap-4">
      <section aria-labelledby="recon-title" className="grid gap-3 rounded-lg border border-border bg-surface p-4">
        <h2 id="recon-title" className="font-display text-[15px] font-semibold">Conciliar un día</h2>
        <p className="text-[13px] text-muted-foreground">Pega el reporte de la pasarela (un cobro por línea: «id, valor») y NEXUS lo compara con lo que confirmó ese día.</p>
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <Field label="Día" required>{(c) => <input {...c} type="date" value={day} onChange={(e) => setDay(e.target.value)} className={inputClasses} />}</Field>
          <Field label="Reporte del proveedor" required>{(c) => <textarea {...c} rows={5} value={report} onChange={(e) => setReport(e.target.value)} className={`${inputClasses} h-auto font-mono text-[12.5px]`} placeholder={"evt_123, 150000\nevt_124, 80000"} />}</Field>
        </div>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <button type="button" disabled={pending || !report.trim()} onClick={run} className={buttonVariants({ className: "justify-self-start" })}>{pending ? "Conciliando…" : "Conciliar"}</button>
      </section>
      {shown ? (
        <section aria-label="Resultado de la conciliación" className="grid gap-3 rounded-lg border border-border bg-surface p-4">
          <Alert tone={shown.differences.length ? "warning" : "success"}>
            {shown.differences.length ? `${shown.differences.length} diferencias · ${shown.matched} cuadran` : `Todo cuadra: ${shown.matched} cobros`} · NEXUS {formatCurrency(shown.expectedTotal)} · proveedor {formatCurrency(shown.reportedTotal)}
          </Alert>
          {result?.bad.length ? <p className="text-xs text-muted-foreground">No se entendieron las líneas {result.bad.join(", ")}.</p> : null}
          <Differences list={shown.differences} />
        </section>
      ) : null}
      {runs.length ? (
        <section aria-label="Conciliaciones anteriores" className="grid gap-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Anteriores</h3>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface text-[13px]">
            {runs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <b className="font-mono">{r.day}</b>
                <span className="text-muted-foreground">{r.matched} cuadran</span>
                <Badge variant={r.differences.length ? "warning" : "success"}>{r.differences.length ? `${r.differences.length} diferencias` : "Cuadra"}</Badge>
                <span className="ml-auto font-mono tabular-nums">{formatCurrency(r.expected)} / {formatCurrency(r.reported)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Differences({ list }: { list: Reconciliation["differences"] }) {
  if (!list.length) return null;
  return (
    <div role="region" aria-label="Diferencias" tabIndex={0} className="overflow-x-auto rounded-md border border-border focus-visible:outline-2 focus-visible:outline-accent">
      <table className="w-full min-w-[520px] text-[13px]">
        <caption className="sr-only">Diferencias de la conciliación</caption>
        <thead className="bg-surface-muted text-left text-xs text-muted-foreground">
          <tr><th scope="col" className="px-3 py-1.5 font-medium">Cobro</th><th scope="col" className="px-3 py-1.5 font-medium">Qué pasa</th><th scope="col" className="px-3 py-1.5 text-right font-medium">NEXUS</th><th scope="col" className="px-3 py-1.5 text-right font-medium">Proveedor</th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          {list.map((d) => (
            <tr key={`${d.kind}-${d.externalId}`}>
              <th scope="row" className="px-3 py-1.5 text-left font-mono font-normal">{d.externalId}</th>
              <td className="px-3 py-1.5">{KIND_TEXT[d.kind]}</td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums">{d.expected === null ? "—" : formatCurrency(d.expected)}</td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums">{d.reported === null ? "—" : formatCurrency(d.reported)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
