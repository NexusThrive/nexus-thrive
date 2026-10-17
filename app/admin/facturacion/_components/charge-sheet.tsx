"use client";

import { useState } from "react";
import { AlertTriangle, BellRing, Check, FileText, Paperclip, Undo2, XCircle } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, selectClasses, textareaClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { CHARGE_STATUSES, dunningLabel, EVIDENCE_TYPES, PAYMENT_METHODS } from "@/lib/ops/billing-rules";
import type { ChargeRow } from "@/lib/ops/billing";
import { formatUsdCents } from "@/lib/plans/quote";
import { cn } from "@/lib/utils";
import { confirmChargeAction, markNoticeAction, recordPaymentAction, refundChargeAction, suspendForNonPaymentAction, voidChargeAction } from "../actions";
import { useBilling } from "./use-billing";

export type BillingPerms = { record: boolean; refund: boolean; suspend: boolean; pricing: boolean };

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export const DUNNING_TONE: Record<ChargeRow["dunning"]["stage"], "success" | "warning" | "danger" | "neutral" | "muted"> = {
  paid: "success",
  void: "muted",
  upcoming: "neutral",
  due_today: "warning",
  grace: "warning",
  notice_needed: "danger",
  notice_running: "danger",
  suspend_eligible: "danger",
};

/**
 * Cobro: registrar el pago con su comprobante (archivo guardado en el
 * sistema), confirmarlo —nunca sin comprobante—, anular, reembolsar y la
 * cobranza (aviso y suspensión según la política).
 */
export default function ChargeSheet({ charge, onClose, perms, today }: { charge: ChargeRow; onClose: () => void; perms: BillingPerms; today: string }) {
  const { run, pending } = useBilling();
  const [method, setMethod] = useState(charge.method ?? "");
  const [reference, setReference] = useState(charge.reference ?? "");
  const [paidDate, setPaidDate] = useState(charge.paidDate ?? today);
  const [notes, setNotes] = useState(charge.notes ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [reason, setReason] = useState("");
  const [asking, setAsking] = useState<null | "void" | "refund">(null);
  const pendingCharge = charge.status === "PENDING";
  const recorded = !!charge.method && charge.evidence.length > 0;

  const submitPayment = () => {
    const fd = new FormData();
    fd.set("chargeId", charge.id);
    fd.set("method", method);
    fd.set("reference", reference);
    fd.set("paidDate", paidDate);
    fd.set("notes", notes);
    for (const f of files) fd.append("files", f);
    run(() => recordPaymentAction(fd), () => setFiles([]));
  };

  return (
    <ResponsiveSheet
      open
      onOpenChange={(o) => !o && onClose()}
      wide
      title={`${charge.tenantName} · ${formatUsdCents(charge.amountUsdCents)}`}
      description={`Período ${charge.periodStart} → ${charge.periodEnd} · vence ${charge.dueDate}`}
    >
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={charge.status === "PAID" ? "success" : charge.status === "PENDING" ? "warning" : "muted"}>{CHARGE_STATUSES.find((s) => s.value === charge.status)?.label}</Badge>
          {pendingCharge ? <Badge tone={DUNNING_TONE[charge.dunning.stage]}>{dunningLabel(charge.dunning)}</Badge> : null}
          {!charge.tenantActive ? <Badge tone="danger">Servicio suspendido</Badge> : null}
          {pendingCharge && recorded ? <Badge tone="neutral">Comprobante cargado · falta confirmar</Badge> : null}
        </div>

        {/* Cobranza: aviso y suspensión. */}
        {pendingCharge && (charge.dunning.stage === "notice_needed" || charge.dunning.stage === "suspend_eligible" || charge.dunning.stage === "notice_running") ? (
          <div className="grid gap-2 rounded-md border border-danger/40 bg-danger-subtle p-3 text-[13px]">
            <p className="flex items-start gap-2">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
              {charge.dunning.stage === "notice_needed"
                ? "Pasó la gracia. Envía el aviso de suspensión al negocio (por WhatsApp o correo) y regístralo aquí: desde ese día corre el plazo del aviso."
                : charge.dunning.stage === "notice_running"
                  ? `Aviso enviado el ${charge.noticeDate}. Aún no se puede suspender.`
                  : `Aviso enviado el ${charge.noticeDate} y su plazo ya pasó. Se puede suspender el servicio.`}
            </p>
            <div className="flex flex-wrap gap-2">
              {charge.dunning.stage === "notice_needed" && perms.record ? (
                <button type="button" disabled={pending} onClick={() => run(() => markNoticeAction(charge.id))} className={buttonVariants({ size: "sm", variant: "outline" })}>
                  <BellRing aria-hidden="true" className="size-3.5" /> Registrar aviso enviado
                </button>
              ) : null}
              {charge.dunning.stage === "suspend_eligible" && perms.suspend && charge.tenantActive ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => window.confirm(`¿Suspender el servicio de ${charge.tenantName} por falta de pago? Se reactiva solo al confirmar el pago.`) && run(() => suspendForNonPaymentAction(charge.id))}
                  className={buttonVariants({ size: "sm", variant: "danger" })}
                >
                  Suspender por falta de pago
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Comprobantes */}
        <section className="grid gap-2">
          <h3 className="text-[13px] font-semibold">Comprobantes</h3>
          {charge.evidence.length ? (
            <ul className="grid gap-1.5">
              {charge.evidence.map((e) => (
                <li key={e.id}>
                  <a href={`/admin/facturacion/comprobantes/${e.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[13px] hover:bg-surface-muted">
                    <FileText aria-hidden="true" className="size-4 text-accent-text" />
                    <span className="min-w-0 flex-1 truncate">{e.fileName}</span>
                    <small className="text-xs text-muted-foreground">{kb(e.byteSize)}</small>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted-foreground">Sin comprobante. Sin comprobante no se puede confirmar el pago.</p>
          )}
        </section>

        {/* Registrar pago */}
        {pendingCharge && perms.record ? (
          <section className="grid gap-3 rounded-md bg-surface-muted p-3.5">
            <h3 className="text-[13px] font-semibold">{recorded ? "Datos del pago" : "Registrar pago"}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Método" required>
                {(c) => (
                  <select {...c} value={method} onChange={(e) => setMethod(e.target.value)} className={selectClasses}>
                    <option value="">Elige…</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Fecha del pago" required>
                {(c) => <input {...c} type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} className={inputClasses} />}
              </Field>
              <Field label="Referencia">{(c) => <input {...c} value={reference} onChange={(e) => setReference(e.target.value)} className={inputClasses} placeholder="N.º de transacción" />}</Field>
            </div>
            <Field label="Comprobante" required={!charge.evidence.length} hint="PDF, JPG, PNG o WEBP · máx. 8 MB. Queda guardado en NEXUS.">
              {(c) => (
                <label htmlFor={c.id} className={cn("flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border-input bg-surface px-3 py-3 text-[13px] hover:border-border-input-hover", files.length && "border-solid")}>
                  <Paperclip aria-hidden="true" className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{files.length ? files.map((f) => f.name).join(", ") : "Elegir archivo…"}</span>
                  <input id={c.id} aria-describedby={c["aria-describedby"]} type="file" multiple accept={EVIDENCE_TYPES.join(",")} className="sr-only" onChange={(e) => setFiles([...(e.target.files ?? [])])} />
                </label>
              )}
            </Field>
            <Field label="Notas">{(c) => <textarea {...c} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaClasses} />}</Field>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={pending || !method || (!files.length && !charge.evidence.length)} onClick={submitPayment} className={buttonVariants({ size: "sm", variant: recorded ? "outline" : "primary" })}>
                <Paperclip aria-hidden="true" className="size-3.5" /> {recorded ? "Actualizar pago" : "Registrar pago"}
              </button>
              {recorded ? (
                <button type="button" disabled={pending} onClick={() => run(() => confirmChargeAction(charge.id), onClose)} className={buttonVariants({ size: "sm" })}>
                  <Check aria-hidden="true" className="size-3.5" /> Confirmar pago
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {charge.status === "PAID" ? (
          <dl className="grid gap-1.5 text-[13px]">
            {[
              ["Método", [charge.method, charge.reference].filter(Boolean).join(" · ")],
              ["Pagado el", charge.paidDate],
              ["Confirmado", `${charge.confirmedDate ?? ""}${charge.confirmedByName ? ` por ${charge.confirmedByName}` : ""}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {charge.voidReason ? <p className="text-[13px] text-muted-foreground">Anulado: {charge.voidReason}</p> : null}
        {charge.refundReason ? <p className="text-[13px] text-muted-foreground">Reembolsado: {charge.refundReason}</p> : null}

        {/* Anular / reembolsar con motivo */}
        {(pendingCharge && perms.record) || (charge.status === "PAID" && perms.refund) ? (
          asking ? (
            <div className="grid gap-2">
              <Field label={asking === "void" ? "Motivo de la anulación" : "Motivo del reembolso"} required>
                {(c) => <input {...c} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClasses} />}
              </Field>
              <div className="flex gap-2">
                <button type="button" onClick={() => setAsking(null)} className={buttonVariants({ size: "sm", variant: "ghost" })}>
                  Cancelar
                </button>
                <button type="button" disabled={pending || reason.trim().length < 3} onClick={() => run(() => (asking === "void" ? voidChargeAction(charge.id, reason) : refundChargeAction(charge.id, reason)), onClose)} className={buttonVariants({ size: "sm", variant: "danger" })}>
                  {asking === "void" ? "Anular cobro" : "Registrar reembolso"}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setAsking(pendingCharge ? "void" : "refund")} className={buttonVariants({ size: "sm", variant: "ghost", className: "justify-self-start text-danger" })}>
              {pendingCharge ? <XCircle aria-hidden="true" className="size-3.5" /> : <Undo2 aria-hidden="true" className="size-3.5" />}
              {pendingCharge ? "Anular cobro" : "Reembolsar"}
            </button>
          )
        ) : null}
      </div>
    </ResponsiveSheet>
  );
}
