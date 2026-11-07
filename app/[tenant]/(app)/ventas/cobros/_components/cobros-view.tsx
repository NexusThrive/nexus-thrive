"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus } from "lucide-react";
import { Alert } from "@/components/molecules/alert";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { QrCode } from "@/components/atoms/qr-code";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { AdaptiveTable } from "@/components/organisms/adaptive-table";
import { cancelIntentAction, confirmManualAction, confirmMatchAction, importStatementAction, reviewLineAction, createIntentAction, reconcileAction, refundAction, registerSettlementAction, rejectProofAction } from "@/app/[tenant]/(app)/ventas/cobros/actions";
import { STATUS_LABELS, payButtonHtml, type Reconciliation } from "@/lib/domains/finance/payments/intents";
import type { IntentRow } from "@/lib/domains/finance/payments/intents-db";
import type { StatementRow } from "@/lib/domains/finance/payments/statements-db";
import type { SettlementRow } from "@/lib/domains/finance/payments/settlements-db";
import { formatCurrency } from "@/lib/foundation/format";
import { DateInput } from "@/components/molecules/date-input";

type Run = { id: string; provider: string; day: string; expected: number; reported: number; matched: number; differences: Reconciliation["differences"] };
type Tab = "links" | "settlements" | "statement" | "recon";
type Small = { kind: "confirm" | "reject" | "refund" | "share"; row: IntentRow } | null;
const TONE = { PENDING: "warning", VERIFYING: "warning", PAID: "success", EXPIRED: "secondary", FAILED: "destructive", CANCELED: "secondary" } as const;
const KIND_TEXT = { missing_in_nexus: "El proveedor lo reporta y NEXUS no lo tiene", missing_in_provider: "NEXUS lo confirmó y el proveedor no lo reporta", amount_mismatch: "El monto no coincide" } as const;

export default function CobrosView({ slug, baseUrl, intents, runs, canAdmin, today, gateways = [], settlements = [], statement = [] }: { slug: string; baseUrl: string; intents: IntentRow[]; runs: Run[]; canAdmin: boolean; today: string; gateways?: { value: string; label: string }[]; settlements?: SettlementRow[]; statement?: StatementRow[] }) {
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
          <SegmentedControl ariaLabel="Sección" value={tab} onChange={setTab} options={[{ value: "links", label: "Enlaces de cobro", count: intents.filter((i) => i.status === "PENDING" || i.status === "VERIFYING").length || undefined }, { value: "settlements", label: "Liquidaciones", count: undefined }, { value: "statement", label: "Extracto del banco", count: statement.filter((l) => l.status === "PROPOSED" || l.status === "UNMATCHED").length || undefined }, { value: "recon", label: "Conciliación" }]} />
        </div>
      ) : null}

      {tab === "links" ? (
        <div className="grid gap-3">
          <div className="flex">
            <button type="button" onClick={() => setCreating(true)} className={buttonVariants({ className: "ml-auto" })}>
              <Plus aria-hidden="true" className="size-4" /> Nuevo cobro
            </button>
          </div>
          {canAdmin && intents.some((i) => i.status === "VERIFYING") ? (
            <Alert tone="warning">
              {intents.filter((i) => i.status === "VERIFYING").length === 1 ? "Hay 1 transferencia por verificar." : `Hay ${intents.filter((i) => i.status === "VERIFYING").length} transferencias por verificar.`} El comprobante no marca el pago como recibido: confírmalo cuando lo veas en tu banco.
            </Alert>
          ) : null}
          {intents.length === 0 ? (
            <EmptyState mark="page" title="Aún no hay cobros en línea" description="Crea un enlace, compártelo por WhatsApp o ponlo como botón en tu página. Se marca pagado cuando llega la confirmación oficial." action={<button type="button" onClick={() => setCreating(true)} className={buttonVariants()}><Plus aria-hidden="true" className="size-4" /> Nuevo cobro</button>} />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {intents.map((r) => (
                <li key={r.id} className="grid gap-2 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-ui font-medium">{r.description}</b>
                    <Badge variant={TONE[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                    {r.refundedTotal > 0 ? <Badge variant="outline">Reembolsado {formatCurrency(r.refundedTotal)}</Badge> : null}
                    <span className="ml-auto font-mono text-ui font-semibold tabular-nums">{formatCurrency(r.amount)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Vence {r.expiresAt.slice(0, 10)}</span>
                    {r.confirmedBy ? <span>· confirmado por {r.confirmedBy === "PROVIDER" ? "la pasarela" : "una persona"}</span> : null}
                    {r.feeEstimated != null && r.netExpected != null ? <span>· comisión estimada {formatCurrency(r.feeEstimated)} · neto esperado {formatCurrency(r.netExpected)}</span> : null}
                    {r.failedAttempts > 0 && r.status !== "PAID" ? <span>· {r.failedAttempts === 1 ? "1 intento fallido" : `${r.failedAttempts} intentos fallidos`} en la pasarela; el cobro sigue abierto</span> : null}
                    {r.status === "VERIFYING" && r.proofNote ? <span>· el cliente avisó: «{r.proofNote}»</span> : null}
                    {r.status === "PENDING" && r.rejectionReason ? <span>· comprobante rechazado: {r.rejectionReason}</span> : null}
                    <span className="ml-auto flex flex-wrap gap-2">
                      {r.status === "PENDING" ? (
                        <>
                          <button type="button" onClick={() => setSmall({ kind: "share", row: r })} className={buttonVariants({ variant: "outline", size: "sm" })}>Compartir</button>
                          {canAdmin ? <button type="button" onClick={() => setSmall({ kind: "confirm", row: r })} className={buttonVariants({ variant: "outline", size: "sm" })}>Confirmar pago</button> : null}
                          <button type="button" aria-label={`Cancelar ${r.description}`} onClick={async () => { const x = await cancelIntentAction(slug, r.id); toast(x.message, x.ok ? "success" : "error"); if (x.ok) router.refresh(); }} className={buttonVariants({ variant: "ghost", size: "sm" })}>Cancelar</button>
                        </>
                      ) : null}
                      {r.status === "VERIFYING" && canAdmin ? (
                        <>
                          <button type="button" onClick={() => setSmall({ kind: "confirm", row: r })} className={buttonVariants({ variant: "outline", size: "sm" })}>Confirmar pago</button>
                          <button type="button" onClick={() => setSmall({ kind: "reject", row: r })} className={buttonVariants({ variant: "ghost", size: "sm" })}>Rechazar comprobante</button>
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
      ) : tab === "settlements" ? (
        <Settlements slug={slug} rows={settlements} today={today} onDone={done} />
      ) : tab === "statement" ? (
        <Statement slug={slug} lines={statement} onDone={done} />
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
          const r = await createIntentAction(slug, { amount, description: String(d.get("description") ?? ""), expiresInHours: Number(d.get("hours") ?? 48), provider: String(d.get("provider") ?? "") });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { amount: r.message } };
        }}
        onSuccess={({ message }) => done(message)}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Valor (COP)" required error={fieldErrors.amount}>{(c) => <input {...c} name="amount" inputMode="numeric" autoComplete="off" className={inputClasses} placeholder="150000" />}</Field>
            <Field label="Qué se cobra" required>{(c) => <input {...c} name="description" autoComplete="off" maxLength={160} className={inputClasses} placeholder="Concepto" />}</Field>
            {gateways.length > 1 ? (
              <Field label="Pasarela" required>
                {(c) => (
                  <Select {...c} name="provider" defaultValue={gateways[0]?.value}>
                    {gateways.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </Select>
                )}
              </Field>
            ) : null}
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
        {({ fieldErrors }) => <Field label="Referencia o evidencia" required error={fieldErrors.evidence}>{(c) => <input {...c} name="evidence" autoComplete="off" maxLength={200} className={inputClasses} placeholder="Referencia del pago" />}</Field>}
      </FormDialog>

      <FormDialog
        open={small?.kind === "reject"}
        onOpenChange={(o) => !o && setSmall(null)}
        title="Rechazar comprobante"
        description={small ? `${small.row.description} · ${formatCurrency(small.row.amount)}. El cobro vuelve a pendiente y se lo puedes decir al cliente.` : undefined}
        submitLabel="Rechazar comprobante"
        pendingLabel="Rechazando…"
        destructive
        onSubmit={async (d) => {
          const r = await rejectProofAction(slug, small!.row.id, String(d.get("reason") ?? ""));
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { reason: r.message } };
        }}
        onSuccess={({ message }) => done(message)}
      >
        {({ fieldErrors }) => <Field label="Motivo" required error={fieldErrors.reason}>{(c) => <input {...c} name="reason" autoComplete="off" maxLength={200} className={inputClasses} placeholder="Por ejemplo: el monto no coincide" />}</Field>}
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

function Settlements({ slug, rows, today, onDone }: { slug: string; rows: SettlementRow[]; today: string; onDone: (message?: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-3">
      <p className="text-ui text-muted-foreground">Lo que la pasarela depositó en tu banco por un grupo de cobros. Se registra con su comisión real; la diferencia contra la estimada queda como ajuste contable.</p>
      <div className="flex">
        <button type="button" onClick={() => setOpen(true)} className={buttonVariants({ className: "ml-auto" })}><Plus aria-hidden="true" className="size-4" /> Registrar liquidación</button>
      </div>
      {rows.length === 0 ? (
        <EmptyState mark="page" remember={false} title="Aún no registras liquidaciones" description="Cuando Wompi te deposite, registra aquí la liquidación para saber cuánto pagaste de comisión y que tu contabilidad cuadre." />
      ) : (
        <AdaptiveTable
          caption="Liquidaciones de la pasarela"
          rows={rows}
          getRowId={(r) => r.id}
          columns={[
            { key: "ref", header: "Liquidación", role: "primary", cell: (r) => <span className="font-mono font-semibold">{r.externalRef}</span> },
            { key: "day", header: "Depósito", role: "secondary", cell: (r) => r.day },
            { key: "items", header: "Cobros", role: "detail", align: "right", cell: (r) => r.itemCount },
            { key: "gross", header: "Bruto", role: "detail", align: "right", cell: (r) => <span className="font-mono tabular-nums">{formatCurrency(r.gross)}</span> },
            { key: "fee", header: "Comisión real", role: "detail", align: "right", cell: (r) => <span className="font-mono tabular-nums">{formatCurrency(r.feeReal)}</span> },
            { key: "diff", header: "Diferencia vs. estimada", role: "detail", align: "right", cell: (r) => <span className={r.difference > 0 ? "font-mono tabular-nums text-danger" : "font-mono tabular-nums"}>{r.difference === 0 ? "Sin diferencia" : `${r.difference > 0 ? "+" : "−"}${formatCurrency(Math.abs(r.difference))}`}</span> },
            { key: "net", header: "Depositado", role: "figure", cell: (r) => <span className="font-mono font-semibold">{formatCurrency(r.netReceived)}</span> },
          ]}
        />
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Registrar liquidación"
        description="Copia del reporte de Wompi las transacciones de este depósito. Todas deben estar cobradas en NEXUS por esa pasarela."
        submitLabel="Registrar"
        pendingLabel="Registrando…"
        onSubmit={async (d) => {
          const n = (key: string) => Number(String(d.get(key) ?? "").replace(/[^\d,]/g, "").replace(",", "."));
          const r = await registerSettlementAction(slug, { externalRef: String(d.get("ref") ?? ""), day: String(d.get("day") ?? today), report: String(d.get("report") ?? ""), feeReal: n("fee"), netReceived: n("net") });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message };
        }}
        onSuccess={({ message }) => onDone(message)}
      >
        {() => (
          <div className="grid gap-3">
            <Field label="Referencia de la liquidación" required>{(c) => <input {...c} name="ref" autoComplete="off" maxLength={120} className={inputClasses} placeholder="Número de la liquidación en Wompi" />}</Field>
            <Field label="Fecha del depósito" required>{(c) => <DateInput {...c} name="day" defaultValue={today} />}</Field>
            <Field label="Transacciones («id, valor»)" required hint="Una por línea.">{(c) => <textarea {...c} name="report" rows={5} className={inputClasses} placeholder={"11883-1700-3541, 100000\n11883-1700-3542, 45000"} />}</Field>
            <Field label="Comisión real (COP)" required>{(c) => <input {...c} name="fee" inputMode="decimal" autoComplete="off" className={inputClasses} />}</Field>
            <Field label="Valor depositado (COP)" required hint="Bruto menos comisión real.">{(c) => <input {...c} name="net" inputMode="decimal" autoComplete="off" className={inputClasses} />}</Field>
          </div>
        )}
      </FormDialog>
    </div>
  );
}

const LINE_TEXT = { UNMATCHED: "Pendiente", PROPOSED: "Propuesto", MATCHED: "Conciliado", REVIEWED: "Revisado, sin cruce" } as const;
const LINE_TONE = { UNMATCHED: "secondary", PROPOSED: "warning", MATCHED: "success", REVIEWED: "outline" } as const;

function Statement({ slug, lines, onDone }: { slug: string; lines: StatementRow[]; onDone: (message?: string) => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const act = async (fn: () => Promise<{ ok: boolean; message: string }>) => {
    const r = await fn();
    toast(r.message, r.ok ? "success" : "error");
    if (r.ok) onDone();
  };
  const count = (s: StatementRow["status"]) => lines.filter((l) => l.status === s).length;
  return (
    <div className="grid gap-3">
      <p className="text-ui text-muted-foreground">Importa el extracto de tu banco y NEXUS propone con qué pago o liquidación cruza cada depósito. Nada se concilia solo: tú confirmas.</p>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="success">{count("MATCHED")} conciliados</Badge>
        <Badge variant="warning">{count("PROPOSED")} propuestos</Badge>
        <Badge variant="secondary">{count("UNMATCHED") + count("REVIEWED")} pendientes</Badge>
        <button type="button" onClick={() => setOpen(true)} className={buttonVariants({ className: "ml-auto" })}><Plus aria-hidden="true" className="size-4" /> Importar extracto</button>
      </div>
      {lines.length === 0 ? (
        <EmptyState mark="page" remember={false} title="Aún no importas un extracto" description="Pega los movimientos de tu banco para ver cuáles ya cuadran con tus cobros y liquidaciones." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {lines.map((l) => (
            <li key={l.id} className="grid gap-2 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-ui font-medium">{l.description}</b>
                <Badge variant={LINE_TONE[l.status]}>{LINE_TEXT[l.status]}</Badge>
                <span className={`ml-auto font-mono text-ui font-semibold tabular-nums ${l.amount < 0 ? "text-danger" : ""}`}>{formatCurrency(l.amount)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{l.day}</span>
                {l.reference ? <span>· ref. {l.reference}</span> : null}
                {l.matchLabel ? <span>· {l.status === "MATCHED" ? "conciliado con" : l.matchConfidence === "EXACT" ? "coincide exacto con" : "se parece a"} {l.matchLabel}</span> : null}
                {l.status === "PROPOSED" || l.status === "UNMATCHED" ? (
                  <span className="ml-auto flex gap-2">
                    {l.status === "PROPOSED" ? <button type="button" onClick={() => act(() => confirmMatchAction(slug, l.id))} className={buttonVariants({ variant: "outline", size: "sm" })}>Confirmar cruce</button> : null}
                    <button type="button" onClick={() => act(() => reviewLineAction(slug, l.id))} aria-label={`No cruza: ${l.description}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>No cruza</button>
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Importar extracto"
        description="Una línea por movimiento: fecha; descripción; referencia; valor. El valor es positivo si entró dinero y negativo si salió. El encabezado es opcional."
        submitLabel="Importar"
        pendingLabel="Importando…"
        onSubmit={async (d) => {
          const r = await importStatementAction(slug, String(d.get("text") ?? ""));
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message };
        }}
        onSuccess={({ message }) => onDone(message)}
      >
        {() => <Field label="Movimientos" required hint="Separados por punto y coma, coma o tabulador.">{(c) => <textarea {...c} name="text" rows={8} className={inputClasses} placeholder={"2026-11-07; Abono Wompi; LQ-114; 139.050\n2026-11-06; Transferencia Camila Torres; 88231; 140.000"} />}</Field>}
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
        <p className="text-ui text-muted-foreground">Pega el reporte de la pasarela (un cobro por línea: «id, valor») y NEXUS lo compara con lo que confirmó ese día.</p>
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <Field label="Día" required>{(c) => <DateInput {...c} value={day} onChange={(e) => setDay(e.target.value)} className={inputClasses} />}</Field>
          <Field label="Reporte del proveedor" required>{(c) => <textarea {...c} rows={5} value={report} onChange={(e) => setReport(e.target.value)} className={`${inputClasses} h-auto font-mono text-xs`} placeholder={"evt_123, 150000\nevt_124, 80000"} />}</Field>
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
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Anteriores</h3>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface text-ui">
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
    <AdaptiveTable
      caption="Diferencias de la conciliación"
      rows={list}
      getRowId={(d) => `${d.kind}-${d.externalId}`}
      columns={[
        { key: "ref", header: "Cobro", role: "primary", cell: (d) => <span className="font-mono font-normal">{d.externalId}</span> },
        { key: "kind", header: "Qué pasa", role: "secondary", cell: (d) => KIND_TEXT[d.kind] },
        { key: "expected", header: "NEXUS", role: "detail", align: "right", cell: (d) => <span className="font-mono tabular-nums">{d.expected === null ? "—" : formatCurrency(d.expected)}</span> },
        { key: "reported", header: "Proveedor", role: "detail", align: "right", cell: (d) => <span className="font-mono tabular-nums">{d.reported === null ? "—" : formatCurrency(d.reported)}</span> },
      ]}
    />
  );
}
